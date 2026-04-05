import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'

export async function POST(request: NextRequest) {
    await dbConnect()
    try {
        const { userId, amount, razorpayOrderId, razorpayPaymentId } = await request.json()
        if (!userId || !amount || amount < 1) {
            return NextResponse.json({ error: 'userId and amount (min ₹1) required' }, { status: 400 })
        }

        // Get or create wallet
        let wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            wallet = await Wallet.create({ userId, balance: 0 })
        }

        // Add money to wallet
        const updated = await Wallet.findByIdAndUpdate(
            wallet._id,
            { $inc: { balance: amount } },
            { new: true }
        )

        // Record transaction
        await Transaction.create({
            toUserId: userId,
            amount,
            type: 'topup',
            status: 'success',
            description: `Added ₹${amount} to AgriPay wallet`,
            category: 'recharge',
            referenceId: razorpayPaymentId,
            razorpayOrderId,
        })

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
