import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 10, message: 'Too many transfer requests. Try again later.' })
    if (rl) return rl

    await dbConnect()
    try {
        const { toIdentifier, amount, description, category, note, paymentMethod } = await request.json()
        if (!toIdentifier || !amount || amount < 1) {
            return NextResponse.json({ error: 'toIdentifier and amount (min ₹1) required' }, { status: 400 })
        }

        if (paymentMethod && !['wallet', 'paylater'].includes(paymentMethod)) {
            return NextResponse.json({ error: 'Only wallet and paylater transfers are supported. Use payment gateway for other methods.' }, { status: 400 })
        }
        const method = 'wallet'

        const toUser = await User.findOne({
            $or: [{ phone: toIdentifier }, { email: toIdentifier }],
        })
        if (!toUser) return NextResponse.json({ error: 'Recipient not found. Check their phone number or AgriPay ID.' }, { status: 404 })
        if (toUser._id.toString() === auth.userId) return NextResponse.json({ error: 'Cannot send money to yourself' }, { status: 400 })

        const fromWallet = await Wallet.findOne({ userId: auth.userId })
        if (!fromWallet) return NextResponse.json({ error: 'Your wallet not found. Open AgriPay first.' }, { status: 404 })

        if (fromWallet.balance < amount) return NextResponse.json({ error: `Insufficient balance. Available: ₹${fromWallet.balance}` }, { status: 400 })

        let toWallet = await Wallet.findOne({ userId: toUser._id })
        if (!toWallet) {
            toWallet = await Wallet.create({ userId: toUser._id, balance: 0, agripayId: `${toUser.phone}@agripay` })
        }

        const debited = await Wallet.findOneAndUpdate(
          { _id: fromWallet._id, balance: { $gte: amount } },
          { $inc: { balance: -amount } },
          { new: true }
        )
        if (!debited) {
          return NextResponse.json({ error: 'Insufficient balance. Try again.' }, { status: 400 })
        }
        await Wallet.findByIdAndUpdate(toWallet._id, { $inc: { balance: amount } })

        const txType = 'send'

        await Transaction.create({
            fromUserId: auth.userId,
            toUserId: toUser._id,
            amount,
            type: txType,
            status: 'success',
            description: description || `Sent to ${toUser.phone} via ${method.toUpperCase()}`,
            category: category || 'transfer',
            paymentMethod: method,
            note,
        })
        await Transaction.create({
            fromUserId: auth.userId,
            toUserId: toUser._id,
            amount,
            type: 'receive',
            status: 'success',
            description: description || `Received from AgriPay via ${method.toUpperCase()}`,
            category: category || 'transfer',
            paymentMethod: method,
            note,
        })

        const updatedFromWallet = await Wallet.findById(fromWallet._id)
        await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Transfer', details: { toUserId: toUser._id.toString(), amount, method }, request })

        return NextResponse.json({
            success: true,
            newBalance: updatedFromWallet?.balance,
            message: `₹${amount} sent successfully to ${toUser.phone} via ${method.toUpperCase()}!`,
            paymentMethod: method,
        })
    } catch (error) {
        console.error('Transfer error:', error)
        return NextResponse.json({ error: 'Transfer failed. Please try again.' }, { status: 500 })
    }
}
