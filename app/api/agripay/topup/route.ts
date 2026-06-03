import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { verifyPaymentSignature } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 10, message: 'Too many topup requests. Try again later.' })
    if (rl) return rl

    await dbConnect()
    try {
        const { amount, razorpayOrderId, razorpayPaymentId, razorpaySignature } = await request.json()
        if (!amount || amount < 1) {
            return NextResponse.json({ error: 'amount (min ₹1) required' }, { status: 400 })
        }

        if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
            return NextResponse.json({ error: 'Payment verification details required' }, { status: 400 })
        }

        if (!verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
            return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
        }

        let wallet = await Wallet.findOne({ userId: auth.userId })
        if (!wallet) {
            wallet = await Wallet.create({ userId: auth.userId, balance: 0 })
        }

        const updated = await Wallet.findByIdAndUpdate(
            wallet._id,
            { $inc: { balance: amount } },
            { new: true }
        )

        await Transaction.create({
            toUserId: auth.userId,
            amount,
            type: 'topup',
            status: 'success',
            description: `Added ₹${amount} to AgriPay wallet`,
            category: 'recharge',
            referenceId: razorpayPaymentId,
            razorpayOrderId,
        })

        await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Topup', details: { amount }, request })

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
