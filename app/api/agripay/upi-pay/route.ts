import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validationError } from '@/lib/api-response'
import { rateLimitByUser } from '@/lib/rate-limit'
import { sanitize } from '@/lib/validation'
import { z } from 'zod/v4'

// GET /api/agripay/upi-pay?toIdentifier=PHONE
// Tries to find a registered user's UPI ID. Returns it if found.
// If not found, returns success=false (client shows manual UPI ID input).
export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()
        const { searchParams } = new URL(req.url)
        const toIdentifier = searchParams.get('toIdentifier')
        if (!toIdentifier) return validationError('toIdentifier required')

        let query: Record<string, unknown>
        if (toIdentifier.includes('@agripay')) {
            const phonePart = toIdentifier.replace('@agripay', '').replace('+91', '').trim()
            query = phonePart.length === 10 ? { phone: phonePart } : { $or: [{ phone: toIdentifier }, { email: toIdentifier }] }
        } else if (toIdentifier.includes('@')) {
            // Looks like a UPI ID already — return it directly
            return NextResponse.json({ success: true, upiId: toIdentifier, recipientName: toIdentifier.split('@')[0] })
        } else {
            query = { $or: [{ phone: toIdentifier }, { email: toIdentifier }] }
        }

        const toUser = await User.findOne(query).select('farmerName firmName role upiId phone').lean()
        if (!toUser) {
            // Recipient not found — that's OK for UPI. Client will show manual UPI ID input.
            return NextResponse.json({
                success: false,
                notFound: true,
                message: 'Recipient not in AgriEasy. Enter their UPI ID manually to pay via UPI.',
            })
        }

        if (!toUser.upiId) {
            // Recipient found but no UPI ID set — client will show manual input
            return NextResponse.json({
                success: false,
                notFound: false,
                recipientName: toUser.farmerName || toUser.firmName || toUser.phone,
                message: 'Recipient has not set up their UPI ID. Enter it manually to pay.',
            })
        }

        return NextResponse.json({
            success: true,
            upiId: toUser.upiId,
            recipientName: toUser.farmerName || toUser.firmName || toUser.phone,
            recipientId: toUser._id,
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

// POST /api/agripay/upi-pay — record the UPI transaction
// Works with OR without a registered recipient
// Body: { toIdentifier?, upiId, amount, note?, upiRefId? }
const recordUpiPaymentSchema = z.object({
    toIdentifier: z.string().max(200).optional(),  // phone/email/name (optional)
    upiId: z.string().min(3, 'UPI ID required').max(100),  // the actual UPI ID paid to
    amount: z.number().positive('Amount must be positive').max(100_000, 'Max ₹1,00,000'),
    note: z.string().max(200).optional(),
    upiRefId: z.string().max(100).optional(),
})

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many requests.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()
        const result = recordUpiPaymentSchema.safeParse(body)
        if (!result.success) return validationError('Invalid data', result.error.issues.map(i => ({ field: String(i.path.join('.')), message: i.message })))
        const { toIdentifier, upiId, amount, note, upiRefId } = result.data

        // Try to find the recipient (optional — works even if not found)
        let toUserId: string | null = null
        let recipientLabel = upiId

        if (toIdentifier) {
            let query: Record<string, unknown>
            if (toIdentifier.includes('@agripay')) {
                const phonePart = toIdentifier.replace('@agripay', '').replace('+91', '').trim()
                query = phonePart.length === 10 ? { phone: phonePart } : { $or: [{ phone: toIdentifier }, { email: toIdentifier }] }
            } else {
                query = { $or: [{ phone: toIdentifier }, { email: toIdentifier }] }
            }
            const toUser = await User.findOne(query)
            if (toUser) {
                toUserId = toUser._id.toString()
                recipientLabel = toUser.phone || toUser.email || upiId
            } else {
                recipientLabel = toIdentifier
            }
        }

        // Create the sender's transaction record
        await Transaction.create({
            fromUserId: auth.user.userId,
            toUserId: toUserId || undefined,  // may be null if recipient not registered
            amount,
            type: 'send',
            status: 'success',
            description: `Sent ₹${amount} via UPI to ${upiId}${upiRefId ? ` (Ref: ${upiRefId})` : ''}`,
            category: 'transfer',
            paymentMethod: 'upi',
            note: note || '',
            referenceId: upiRefId || upiId,
        })

        // Create the recipient's transaction record (only if registered)
        if (toUserId) {
            await Transaction.create({
                fromUserId: auth.user.userId,
                toUserId,
                amount,
                type: 'receive',
                status: 'success',
                description: `Received ₹${amount} via UPI${upiRefId ? ` (Ref: ${upiRefId})` : ''}`,
                category: 'transfer',
                paymentMethod: 'upi',
                note: note || '',
                referenceId: upiRefId || upiId,
            })
        }

        return NextResponse.json({
            success: true,
            message: `₹${amount} sent via UPI to ${upiId}!`,
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to record UPI payment' }, { status: 500 })
    }
}
