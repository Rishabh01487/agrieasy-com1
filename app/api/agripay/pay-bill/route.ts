import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'

export async function POST(request: NextRequest) {
    await dbConnect()
    try {
        const { userId, amount, billType, description, note } = await request.json()
        if (!userId || !amount || !billType) {
            return NextResponse.json({ error: 'userId, amount, and billType are required' }, { status: 400 })
        }

        const wallet = await Wallet.findOne({ userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found. Open AgriPay first.' }, { status: 404 })
        if (wallet.balance < amount) return NextResponse.json({ error: `Insufficient balance. Available: ₹${wallet.balance}` }, { status: 400 })

        await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: -amount } })

        const categoryMap: Record<string, string> = {
            fuel: 'fuel', salary: 'salary', food: 'food', recharge: 'recharge', other: 'other',
        }

        await Transaction.create({
            fromUserId: userId,
            amount,
            type: 'bill_pay',
            status: 'success',
            description: description || `Bill payment: ${billType}`,
            category: categoryMap[billType] || 'other',
            note,
        })

        const updated = await Wallet.findOne({ userId })
        return NextResponse.json({
            success: true,
            newBalance: updated?.balance,
            message: `₹${amount} paid for ${billType} successfully!`,
        })
    } catch (error) {
        console.error('Bill pay error:', error)
        return NextResponse.json({ error: 'Payment failed. Try again.' }, { status: 500 })
    }
}
