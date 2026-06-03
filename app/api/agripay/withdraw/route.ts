import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { createPayout, isPayoutsEnabled } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 3, message: 'Too many withdrawal requests.' })
    if (rl) return rl

    await dbConnect()
    try {
        const { amount } = await request.json()
        if (!amount || amount < 1) {
            return NextResponse.json({ error: 'amount (min ₹1) required' }, { status: 400 })
        }

        const wallet = await Wallet.findOne({ userId: auth.userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
        if (!wallet.bankVerified) return NextResponse.json({ error: 'Verify your bank account first before withdrawing' }, { status: 400 })
        if (wallet.balance < amount) return NextResponse.json({ error: `Insufficient balance. Available: ₹${wallet.balance}` }, { status: 400 })

        const debited = await Wallet.findOneAndUpdate(
          { _id: wallet._id, balance: { $gte: amount } },
          { $inc: { balance: -amount } },
          { new: true }
        )
        if (!debited) {
          return NextResponse.json({ error: 'Insufficient balance. Try again.' }, { status: 400 })
        }

        let status = 'pending'
        let payoutId: string | undefined

        if (isPayoutsEnabled() && wallet.razorpayFundAccountId) {
            const result = await createPayout(amount, wallet.razorpayFundAccountId, `wd_${Date.now()}`)
            if (result) {
                payoutId = result.payoutId
                status = result.status === 'processed' || result.status === 'queued' ? 'success' : 'pending'
            }
        }

        await Transaction.create({
            fromUserId: auth.userId,
            amount,
            type: 'send',
            status,
            description: status === 'success'
                ? `Withdrawal of ₹${amount} sent to your bank account`
                : `Withdrawal of ₹${amount} initiated — awaiting processing`,
            category: 'transfer',
            paymentMethod: 'neft',
            referenceId: payoutId,
        })

        await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Withdrawal', details: { amount, status, payoutId }, request })

        const msg = status === 'success'
            ? `₹${amount} sent to your bank account`
            : `Withdrawal of ₹${amount} initiated. You'll receive it within 1-2 business days.`

        return NextResponse.json({
            success: true,
            newBalance: wallet.balance - amount,
            message: msg,
            status,
        })
    } catch (error) {
        console.error('Withdrawal error:', error)
        return NextResponse.json({ error: 'Withdrawal failed. Try again.' }, { status: 500 })
    }
}
