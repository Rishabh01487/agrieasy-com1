import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validateBody, topupSchema } from '@/lib/validation'
import { validationError } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { verifyPaymentSignatureWithAmount } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many topup requests. Try again later.' })
    if (rl) return rl

    await dbConnect()
    try {
        const body = await request.json()
        const v = validateBody(topupSchema, body)
        if (!v.success) return validationError('Invalid topup data', v.errors)
        const data = v.data
        const { amount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = data

        // SECURITY: verify HMAC signature AND fetch the order server-side from
        // Razorpay to confirm `order.amount === claimedAmount * 100`. Prevents
        // the critical amount-tampering attack (pay ₹1, credit ₹1,00,000).
        const verify = await verifyPaymentSignatureWithAmount(
            razorpayOrderId,
            razorpayPaymentId,
            razorpaySignature,
            Math.round(amount * 100),
        )
        if (!verify.ok) {
            return NextResponse.json({ error: verify.reason }, { status: 400 })
        }

        // SECURITY: idempotency — refuse to credit the same Razorpay payment
        // twice. The unique sparse index on Transaction.razorpayPaymentId is
        // the backstop; this pre-check avoids a 500 + double-credit race.
        const already = await Transaction.exists({ razorpayPaymentId })
        if (already) {
            const walletNow = await Wallet.findOne({ userId: auth.user.userId }).lean()
            return NextResponse.json({
                success: true,
                newBalance: walletNow?.balance ?? 0,
                message: 'This payment has already been credited.',
            })
        }

        let wallet = await Wallet.findOne({ userId: auth.user.userId })
        if (!wallet) {
            const user = await User.findById(auth.user.userId)
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
            wallet = await Wallet.create({ userId: auth.user.userId, balance: 0, agripayId: `${user.phone}@agripay` })
        }

        const updated = await Wallet.findByIdAndUpdate(
            wallet._id,
            { $inc: { balance: amount } },
            { new: true }
        )

        await Transaction.create({
            toUserId: auth.user.userId,
            amount,
            type: 'topup',
            status: 'success',
            description: `Added ₹${amount} to AgriPay wallet`,
            category: 'recharge',
            referenceId: razorpayPaymentId,
            razorpayOrderId,
            // SECURITY: populated so the unique sparse index enforces replay
            // prevention (the same razorpayPaymentId cannot appear on two
            // Transaction documents).
            razorpayPaymentId,
        })

        await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Topup', details: { amount }, request })

        return NextResponse.json({
            success: true,
            newBalance: updated?.balance,
            message: `₹${amount} added to your AgriPay wallet!`,
        })
    } catch (error) {
        console.error('Topup error:', error)
        return NextResponse.json({ error: 'Failed to add money. Try again.' }, { status: 500 })
    }
}
