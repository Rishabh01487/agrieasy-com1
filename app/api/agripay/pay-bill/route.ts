import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validateBody, payBillSchema } from '@/lib/validation'
import { validationError } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const body = await request.json()
        const v = validateBody(payBillSchema, body)
        if (!v.success) return validationError('Invalid bill payment data', v.errors)
        const { billerId, amount, category } = v.data

        const wallet = await Wallet.findOne({ userId: auth.user.userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found. Open AgriPay first.' }, { status: 404 })
        if (wallet.balance < amount) return NextResponse.json({ error: `Insufficient balance. Available: ₹${wallet.balance}` }, { status: 400 })

        const debited = await Wallet.findOneAndUpdate(
          { _id: wallet._id, balance: { $gte: amount } },
          { $inc: { balance: -amount } },
          { new: true }
        )
        if (!debited) {
          return NextResponse.json({ error: 'Insufficient balance. Try again.' }, { status: 400 })
        }

        const categoryMap: Record<string, string> = {
            fuel: 'fuel', salary: 'salary', food: 'food', recharge: 'recharge', booking: 'booking', other: 'other',
        }
        const resolvedCategory = category || categoryMap[billerId] || 'other'

        await Transaction.create({
            fromUserId: auth.user.userId,
            amount,
            type: 'bill_pay',
            status: 'success',
            description: `Bill payment: ${billerId}`,
            category: resolvedCategory,
        })

        const updated = await Wallet.findOne({ userId: auth.user.userId })
        await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'BillPayment', details: { amount, billerId }, request })

        return NextResponse.json({
            success: true,
            newBalance: updated?.balance,
            message: `₹${amount} paid for ${billerId} successfully!`,
        })
    } catch (error) {
        console.error('Bill pay error:', error)
        return NextResponse.json({ error: 'Payment failed. Try again.' }, { status: 500 })
    }
}
