import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const { amount, billType, description, note } = await request.json()
        if (!amount || !billType) {
            return NextResponse.json({ error: 'amount and billType are required' }, { status: 400 })
        }

        const wallet = await Wallet.findOne({ userId: auth.userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found. Open AgriPay first.' }, { status: 404 })
        if (wallet.balance < amount) return NextResponse.json({ error: `Insufficient balance. Available: ₹${wallet.balance}` }, { status: 400 })

        await Wallet.findByIdAndUpdate(wallet._id, { $inc: { balance: -amount } })

        const categoryMap: Record<string, string> = {
            fuel: 'fuel', salary: 'salary', food: 'food', recharge: 'recharge', other: 'other',
        }

        await Transaction.create({
            fromUserId: auth.userId,
            amount,
            type: 'bill_pay',
            status: 'success',
            description: description || `Bill payment: ${billType}`,
            category: categoryMap[billType] || 'other',
            note,
        })

        const updated = await Wallet.findOne({ userId: auth.userId })
        await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'BillPayment', details: { amount, billType }, request })

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
