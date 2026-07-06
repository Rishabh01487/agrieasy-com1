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
import { verifyPaymentSignature } from '@/lib/razorpay'

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

        if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
            return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
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
