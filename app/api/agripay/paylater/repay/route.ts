import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import PayLater from '@/lib/models/PayLater'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

const INTEREST_RATE = 0.099
const DEFAULT_INTEREST_RATE = 0.11

async function calculateInterest(loan: any) {
    const now = new Date()
    const daysSinceLastCalc = Math.floor((now.getTime() - new Date(loan.lastInterestCalc).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSinceLastCalc <= 0) return loan.amountDue

    const daysPastDue = Math.floor((now.getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24))
    const rate = daysPastDue > 0 ? DEFAULT_INTEREST_RATE : INTEREST_RATE
    const dailyRate = rate / 100
    const interest = loan.amountDue * dailyRate * daysSinceLastCalc
    const newAmountDue = Math.round((loan.amountDue + interest) * 100) / 100

    await PayLater.findByIdAndUpdate(loan._id, {
        amountDue: newAmountDue,
        lastInterestCalc: now,
    })

    return newAmountDue
}

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 10, message: 'Too many repayment requests. Try again later.' })
    if (rl) return rl

    await dbConnect()
    try {
        const { loanId, amount } = await request.json()
        if (!loanId || !amount || amount < 1) {
            return NextResponse.json({ error: 'loanId and amount (min ₹1) required' }, { status: 400 })
        }

        const wallet = await Wallet.findOne({ userId: auth.userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

        const loan = await PayLater.findById(loanId)
        if (!loan) return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
        if (loan.userId.toString() !== auth.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
        if (loan.status === 'closed') return NextResponse.json({ error: 'Loan already closed' }, { status: 400 })

        const currentDue = await calculateInterest(loan)

        if (wallet.balance < amount) {
            return NextResponse.json({ error: `Insufficient balance. Available: ₹${wallet.balance.toLocaleString('en-IN')}` }, { status: 400 })
        }

        const actualRepay = Math.min(amount, currentDue)

        const debited = await Wallet.findOneAndUpdate(
          { _id: wallet._id, balance: { $gte: actualRepay } },
          { $inc: { balance: -actualRepay } },
          { new: true }
        )
        if (!debited) {
          return NextResponse.json({ error: 'Insufficient balance. Try again.' }, { status: 400 })
        }

        const transaction = await Transaction.create({
            fromUserId: auth.userId,
            amount: actualRepay,
            type: 'paylater_repay',
            status: 'success',
            description: `PayLater repayment of ₹${actualRepay.toLocaleString('en-IN')}`,
            category: 'paylater',
            paymentMethod: 'wallet',
            paylaterId: loan._id,
        })

        const newAmountDue = Math.round((currentDue - actualRepay) * 100) / 100
        const newStatus = newAmountDue <= 0 ? 'closed' : newAmountDue < loan.loanAmount ? 'partially_repaid' : 'active'

        await PayLater.findByIdAndUpdate(loanId, {
            $set: { amountDue: Math.max(0, newAmountDue), status: newStatus, lastInterestCalc: new Date() },
            $inc: { totalRepaid: actualRepay },
            $push: {
                repaymentHistory: { amount: actualRepay, transactionId: transaction._id },
                transactionRefs: transaction._id,
            },
        })

        if (newStatus === 'closed') {
            await Wallet.findByIdAndUpdate(wallet._id, {
                $inc: { paylaterUsed: -loan.loanAmount },
            })
        }

        const updatedWallet = await Wallet.findById(wallet._id)

        await logAudit({ userId: auth.userId, action: 'UPDATE', resource: 'PayLaterRepayment', resourceId: loanId, details: { amount: actualRepay, newStatus }, request })

        return NextResponse.json({
            success: true,
            message: newStatus === 'closed'
                ? 'Loan fully repaid! Your PayLater credit is restored.'
                : `₹${actualRepay.toLocaleString('en-IN')} repaid. Remaining: ₹${Math.max(0, newAmountDue).toLocaleString('en-IN')}`,
            newBalance: updatedWallet?.balance,
            loan: await PayLater.findById(loanId),
        })
    } catch (error) {
        console.error('PayLater repay error:', error)
        return NextResponse.json({ error: 'Repayment failed. Try again.' }, { status: 500 })
    }
}
