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
// Returns the recipient's UPI ID so the client can build the deep link
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
        } else {
            query = { $or: [{ phone: toIdentifier }, { email: toIdentifier }] }
        }

        const toUser = await User.findOne(query).select('farmerName firmName role upiId phone').lean()
        if (!toUser) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })
        if (toUser._id.toString() === auth.user.userId) return NextResponse.json({ error: 'Cannot send to yourself' }, { status: 400 })

        if (!toUser.upiId) {
            return NextResponse.json({
                success: false,
                error: 'Recipient has not set up their UPI ID yet. Ask them to add their UPI ID in their profile settings.',
                recipientName: toUser.farmerName || toUser.firmName || toUser.phone,
            }, { status: 400 })
        }

        return NextResponse.json({
            success: true,
            upiId: toUser.upiId,
            recipientName: toUser.farmerName || toUser.firmName || toUser.phone,
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch UPI info' }, { status: 500 })
    }
}

// POST /api/agripay/upi-pay — record the UPI transaction after payment
const recordUpiPaymentSchema = z.object({
    toIdentifier: z.string().min(1, 'Recipient identifier required'),
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
        const { toIdentifier, amount, note, upiRefId } = result.data

        let query: Record<string, unknown>
        if (toIdentifier.includes('@agripay')) {
            const phonePart = toIdentifier.replace('@agripay', '').replace('+91', '').trim()
            query = phonePart.length === 10 ? { phone: phonePart } : { $or: [{ phone: toIdentifier }, { email: toIdentifier }] }
        } else {
            query = { $or: [{ phone: toIdentifier }, { email: toIdentifier }] }
        }

        const toUser = await User.findOne(query)
        if (!toUser) return NextResponse.json({ error: 'Recipient not found' }, { status: 404 })

        const recipientLabel = toUser.phone || toUser.email || 'user'

        await Transaction.create({
            fromUserId: auth.user.userId, toUserId: toUser._id, amount,
            type: 'send', status: 'success',
            description: `Sent to ${recipientLabel} via UPI${upiRefId ? ` (Ref: ${upiRefId})` : ''}`,
            category: 'transfer', paymentMethod: 'upi',
            note: note || '', referenceId: upiRefId || '',
        })
        await Transaction.create({
            fromUserId: auth.user.userId, toUserId: toUser._id, amount,
            type: 'receive', status: 'success',
            description: `Received via UPI${upiRefId ? ` (Ref: ${upiRefId})` : ''}`,
            category: 'transfer', paymentMethod: 'upi',
            note: note || '', referenceId: upiRefId || '',
        })

        return NextResponse.json({
            success: true,
            message: `₹${amount} sent to ${recipientLabel} via UPI!`,
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to record UPI payment' }, { status: 500 })
    }
}
