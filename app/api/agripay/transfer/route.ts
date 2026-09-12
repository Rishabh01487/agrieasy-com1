import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validateBody, transferSchema } from '@/lib/validation'
import { validationError } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many transfer requests. Try again later.' })
    if (rl) return rl

    await dbConnect()
    try {
        const body = await request.json()
        const v = validateBody(transferSchema, body)
        if (!v.success) return validationError('Invalid transfer data', v.errors)
        const data = v.data
        const { toIdentifier, amount, note, paymentMethod } = data
        const method = paymentMethod

        let query: Record<string, unknown>
        if (data.toIdentifier.includes('@agripay')) {
            const phonePart = data.toIdentifier.replace('@agripay', '').replace('+91', '').trim()
            query = phonePart.length === 10 ? { phone: phonePart } : { $or: [{ phone: data.toIdentifier }, { email: data.toIdentifier }] }
        } else {
            query = { $or: [{ phone: data.toIdentifier }, { email: data.toIdentifier }] }
        }

        const toUser = await User.findOne(query)
        if (!toUser) return NextResponse.json({ error: 'Recipient not found. Check their phone number or email.' }, { status: 404 })
        if (toUser._id.toString() === auth.user.userId) return NextResponse.json({ error: 'Cannot send money to yourself' }, { status: 400 })

        const fromWallet = await Wallet.findOne({ userId: auth.user.userId })
        if (!fromWallet) return NextResponse.json({ error: 'Your wallet not found. Open AgriPay first.' }, { status: 404 })

        if (fromWallet.balance < amount) return NextResponse.json({ error: `Insufficient balance. Available: ₹${fromWallet.balance}` }, { status: 400 })

        let toWallet = await Wallet.findOne({ userId: toUser._id })
        if (!toWallet) {
            toWallet = await Wallet.create({ userId: toUser._id, balance: 0, agripayId: `${toUser.phone}@agripay` })
        }

        // CRIT-3 FIX: Use MongoDB session transaction for atomic debit + credit.
        // If the server crashes between debit and credit, MongoDB rolls back
        // the entire transaction — no money disappears.
        const mongoose = (await import('mongoose')).default
        const session = await mongoose.startSession()

        let debited: any = null
        let credited: any = null

        try {
          await session.withTransaction(async () => {
            // Atomic debit with $gte guard — prevents double-spend
            debited = await Wallet.findOneAndUpdate(
              { _id: fromWallet._id, balance: { $gte: amount } },
              { $inc: { balance: -amount } },
              { new: true, session }
            )
            if (!debited) throw new Error('Insufficient balance')

            // Atomic credit — if this fails, the debit is rolled back too
            credited = await Wallet.findByIdAndUpdate(
              toWallet._id,
              { $inc: { balance: amount } },
              { new: true, session }
            )
            if (!credited) throw new Error('Failed to credit recipient')

            // Create both transaction records in the same session
            const recipientLabel = toUser.phone || toUser.email || 'user'
            await Transaction.create([{
                fromUserId: auth.user.userId,
                toUserId: toUser._id,
                amount,
                type: 'send',
                status: 'success',
                description: `Sent to ${recipientLabel} via ${method.toUpperCase()}`,
                category: 'transfer',
                paymentMethod: method,
                note,
            }], { session })
            await Transaction.create([{
                fromUserId: auth.user.userId,
                toUserId: toUser._id,
                amount,
                type: 'receive',
                status: 'success',
                description: `Received from AgriEasy user via ${method.toUpperCase()}`,
                category: 'transfer',
                paymentMethod: method,
                note,
            }], { session })
          })
        } catch (txError: any) {
          await session.endSession()
          if (txError.message === 'Insufficient balance') {
            return NextResponse.json({ error: 'Insufficient balance. Try again.' }, { status: 400 })
          }
          return NextResponse.json({ error: 'Transfer failed. Please try again.' }, { status: 500 })
        }
        await session.endSession()

        if (!debited) {
            return NextResponse.json({ error: 'Insufficient balance. Try again.' }, { status: 400 })
        }

        const recipientLabel = toUser.phone || toUser.email || 'user'

        const updatedFromWallet = await Wallet.findById(fromWallet._id)
        await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Transfer', details: { toUserId: toUser._id.toString(), amount, method }, request })

        return NextResponse.json({
            success: true,
            newBalance: updatedFromWallet?.balance,
            message: `₹${amount} sent successfully to ${recipientLabel} via ${method.toUpperCase()}!`,
            paymentMethod: method,
        })
    } catch (error) {
        console.error('Transfer error:', error)
        return NextResponse.json({ error: 'Transfer failed. Please try again.' }, { status: 500 })
    }
}