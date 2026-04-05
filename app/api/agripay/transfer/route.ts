import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import User from '@/lib/models/User'

export async function POST(request: NextRequest) {
    await dbConnect()
    try {
        const { fromUserId, toIdentifier, amount, description, category, note } = await request.json()
        if (!fromUserId || !toIdentifier || !amount || amount < 1) {
            return NextResponse.json({ error: 'fromUserId, toIdentifier, and amount (min ₹1) are required' }, { status: 400 })
        }

        // Find recipient by phone, email, or agripayId
        const toUser = await User.findOne({
            $or: [{ phone: toIdentifier }, { email: toIdentifier }],
        })
        if (!toUser) return NextResponse.json({ error: 'Recipient not found. Check their phone number or AgriPay ID.' }, { status: 404 })
        if (toUser._id.toString() === fromUserId) return NextResponse.json({ error: 'Cannot send money to yourself' }, { status: 400 })

        // Check sender wallet
        const fromWallet = await Wallet.findOne({ userId: fromUserId })
        if (!fromWallet) return NextResponse.json({ error: 'Sender wallet not found. Open AgriPay first.' }, { status: 404 })
        if (fromWallet.balance < amount) return NextResponse.json({ error: `Insufficient balance. Available: ₹${fromWallet.balance}` }, { status: 400 })

        // Get or create recipient wallet
        let toWallet = await Wallet.findOne({ userId: toUser._id })
        if (!toWallet) {
            toWallet = await Wallet.create({ userId: toUser._id, balance: 0, agripayId: `${toUser.phone}@agripay` })
        }

        // Atomic balance update
        await Wallet.findByIdAndUpdate(fromWallet._id, { $inc: { balance: -amount } })
        await Wallet.findByIdAndUpdate(toWallet._id, { $inc: { balance: amount } })

        // Record transactions
        await Transaction.create({
            fromUserId,
            toUserId: toUser._id,
            amount,
            type: 'send',
            status: 'success',
            description: description || `Sent to ${toUser.phone}`,
            category: category || 'transfer',
            note,
        })
        await Transaction.create({
            fromUserId,
            toUserId: toUser._id,
            amount,
            type: 'receive',
            status: 'success',
            description: description || `Received from AgriPay`,
            category: category || 'transfer',
            note,
        })

        const updatedFromWallet = await Wallet.findById(fromWallet._id)
        return NextResponse.json({
            success: true,
            newBalance: updatedFromWallet?.balance,
            message: `₹${amount} sent successfully to ${toUser.phone}!`,
        })
    } catch (error) {
        console.error('Transfer error:', error)
        return NextResponse.json({ error: 'Transfer failed. Please try again.' }, { status: 500 })
    }
}
