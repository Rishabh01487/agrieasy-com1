import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validateBody } from '@/lib/validation'
import { validationError } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { verifyPaymentSignature } from '@/lib/razorpay'
import { z } from 'zod/v4'

// Schema for creating a Razorpay transfer order
const createTransferOrderSchema = z.object({
    toIdentifier: z.string().min(1, 'Recipient identifier required'),
    amount: z.number().positive('Amount must be positive').max(100_000, 'Max transfer is ₹1,00,000'),
})

// Schema for verifying + completing the transfer
const verifyTransferSchema = z.object({
    toIdentifier: z.string().min(1, 'Recipient identifier required'),
    amount: z.number().positive('Amount must be positive').max(100_000, 'Max transfer is ₹1,00,000'),
    razorpayOrderId: z.string().min(1, 'Razorpay order ID required'),
    razorpayPaymentId: z.string().min(1, 'Razorpay payment ID required'),
    razorpaySignature: z.string().min(1, 'Razorpay signature required'),
    note: z.string().max(200).optional(),
    paymentMethod: z.enum(['upi', 'netbanking']).default('upi'),
})

// Helper: find recipient user by phone/email/agripayId
async function findRecipient(identifier: string) {
    let query: Record<string, unknown>
    if (identifier.includes('@agripay')) {
        const phonePart = identifier.replace('@agripay', '').replace('+91', '').trim()
        query = phonePart.length === 10 ? { phone: phonePart } : { $or: [{ phone: identifier }, { email: identifier }] }
    } else {
        query = { $or: [{ phone: identifier }, { email: identifier }] }
    }
    return User.findOne(query)
}

// POST /api/agripay/transfer-razorpay
// action=create → Creates a Razorpay order for the transfer
// action=verify → Verifies the payment + credits the recipient's wallet
export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many transfer requests.' })
    if (rl) return rl

    await dbConnect()
    try {
        const body = await request.json()
        const action = body.action || 'create'

        // ── STEP 1: Create Razorpay Order ───────────────────────────
        if (action === 'create') {
            const v = validateBody(createTransferOrderSchema, body)
            if (!v.success) return validationError('Invalid data', v.errors)
            const { toIdentifier, amount } = v.data

            const toUser = await findRecipient(toIdentifier)
            if (!toUser) return NextResponse.json({ error: 'Recipient not found. Check their phone number or email.' }, { status: 404 })
            if (toUser._id.toString() === auth.user.userId) return NextResponse.json({ error: 'Cannot send money to yourself' }, { status: 400 })

            const keyId = process.env.RAZORPAY_KEY_ID
            const keySecret = process.env.RAZORPAY_KEY_SECRET
            if (!keyId || !keySecret) {
                return NextResponse.json({ error: 'Payment gateway not configured. Use wallet transfer instead.' }, { status: 503 })
            }

            const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')
            const res = await fetch('https://api.razorpay.com/v1/orders', {
                method: 'POST',
                headers: { 'Authorization': `Basic ${authHeader}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: Math.round(amount * 100),
                    currency: 'INR',
                    receipt: `agripay_transfer_${auth.user.userId}_${Date.now()}`,
                    notes: { userId: auth.user.userId, toUserId: toUser._id.toString(), purpose: 'agripay_transfer' },
                }),
            })

            if (!res.ok) {
                console.error('Razorpay order creation failed:', await res.text())
                return NextResponse.json({ error: 'Failed to create payment order.' }, { status: 502 })
            }

            const order = await res.json()
            return NextResponse.json({
                success: true,
                orderId: order.id,
                razorpayKey: keyId,
                currency: order.currency,
                amount: Math.round(amount * 100),
                recipientName: toUser.farmerName || toUser.firmName || toUser.phone,
            })
        }

        // ── STEP 2: Verify Payment + Credit Recipient ──────────────
        if (action === 'verify') {
            const v = validateBody(verifyTransferSchema, body)
            if (!v.success) return validationError('Invalid verification data', v.errors)
            const { toIdentifier, amount, razorpayOrderId, razorpayPaymentId, razorpaySignature, note, paymentMethod } = v.data

            if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
                return NextResponse.json({ error: 'Payment verification failed. If money was debited, it will be refunded automatically.' }, { status: 400 })
            }

            const toUser = await findRecipient(toIdentifier)
            if (!toUser) return NextResponse.json({ error: 'Recipient not found.' }, { status: 404 })

            let toWallet = await Wallet.findOne({ userId: toUser._id })
            if (!toWallet) {
                toWallet = await Wallet.create({ userId: toUser._id, balance: 0, agripayId: `${toUser.phone}@agripay` })
            }
            await Wallet.findByIdAndUpdate(toWallet._id, { $inc: { balance: amount } })

            const recipientLabel = toUser.phone || toUser.email || 'user'
            const methodLabel = paymentMethod === 'upi' ? 'UPI' : 'Net Banking'

            await Transaction.create({
                fromUserId: auth.user.userId, toUserId: toUser._id, amount,
                type: 'send', status: 'success',
                description: `Sent to ${recipientLabel} via ${methodLabel}`,
                category: 'transfer', paymentMethod,
                note: note || '', referenceId: razorpayPaymentId, razorpayOrderId,
            })
            await Transaction.create({
                fromUserId: auth.user.userId, toUserId: toUser._id, amount,
                type: 'receive', status: 'success',
                description: `Received via ${methodLabel}`,
                category: 'transfer', paymentMethod,
                note: note || '', referenceId: razorpayPaymentId, razorpayOrderId,
            })

            await logAudit({
                userId: auth.user.userId, action: 'CREATE', resource: 'Transfer',
                details: { toUserId: toUser._id.toString(), amount, method: methodLabel, razorpayPaymentId },
                request,
            })

            return NextResponse.json({
                success: true,
                message: `₹${amount} sent successfully to ${recipientLabel} via ${methodLabel}!`,
                paymentMethod: methodLabel,
            })
        }

        return validationError('Invalid action. Use "create" or "verify".')
    } catch (error) {
        console.error('Transfer Razorpay error:', error)
        return NextResponse.json({ error: 'Transfer failed. Please try again.' }, { status: 500 })
    }
}
