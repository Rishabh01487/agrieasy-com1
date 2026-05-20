import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import User from '@/lib/models/User'

export async function POST(request: NextRequest) {
    await dbConnect()
    try {
        const { fromUserId, toIdentifier, amount, description, category, note, paymentMethod } = await request.json()
        if (!fromUserId || !toIdentifier || !amount || amount < 1) {
            return NextResponse.json({ error: 'fromUserId, toIdentifier, and amount (min ₹1) are required' }, { status: 400 })
        }

        const validMethods = ['wallet', 'upi', 'neft', 'rtgs', 'paylater', 'cash']
        const method = validMethods.includes(paymentMethod) ? paymentMethod : 'wallet'

        // Find recipient by phone, email, or agripayId
        const toUser = await User.findOne({
            $or: [{ phone: toIdentifier }, { email: toIdentifier }],
        })
        if (!toUser) return NextResponse.json({ error: 'Recipient not found. Check their phone number or AgriPay ID.' }, { status: 404 })
        if (toUser._id.toString() === fromUserId) return NextResponse.json({ error: 'Cannot send money to yourself' }, { status: 400 })

        const fromWallet = await Wallet.findOne({ userId: fromUserId })
        if (!fromWallet) return NextResponse.json({ error: 'Sender wallet not found. Open AgriPay first.' }, { status: 404 })

        if (method === 'wallet' || method === 'paylater') {
            if (fromWallet.balance < amount) return NextResponse.json({ error: `Insufficient balance. Available: ₹${fromWallet.balance}` }, { status: 400 })
        }

        let toWallet = await Wallet.findOne({ userId: toUser._id })
        if (!toWallet) {
            toWallet = await Wallet.create({ userId: toUser._id, balance: 0, agripayId: `${toUser.phone}@agripay` })
        }

        if (method === 'wallet' || method === 'paylater') {
            await Wallet.findByIdAndUpdate(fromWallet._id, { $inc: { balance: -amount } })
        }
        await Wallet.findByIdAndUpdate(toWallet._id, { $inc: { balance: amount } })

        const txType = method === 'upi' ? 'upi_pay' : method === 'neft' ? 'neft' : method === 'rtgs' ? 'rtgs' : 'send'

        await Transaction.create({
            fromUserId,
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
            fromUserId,
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
