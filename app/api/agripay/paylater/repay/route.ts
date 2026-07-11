import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import mongoose, { ClientSession } from 'mongoose'
import Wallet from '@/lib/models/Wallet'
import PayLater from '@/lib/models/PayLater'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validateBody, paylaterRepaySchema } from '@/lib/validation'
import { validationError } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

const INTEREST_RATE = 0.099
const DEFAULT_INTEREST_RATE = 0.11

async function calculateInterest(loan: any, session: ClientSession | null) {
  const now = new Date()
  const daysSinceLastCalc = Math.floor(
    (now.getTime() - new Date(loan.lastInterestCalc).getTime()) / (1000 * 60 * 60 * 24)
  )
  if (daysSinceLastCalc <= 0) return loan.amountDue

  const daysPastDue = Math.floor(
    (now.getTime() - new Date(loan.dueDate).getTime()) / (1000 * 60 * 60 * 24)
  )
  const rate = daysPastDue > 0 ? DEFAULT_INTEREST_RATE : INTEREST_RATE
  const dailyRate = rate / 100
  const interest = loan.amountDue * dailyRate * daysSinceLastCalc
  const newAmountDue = Math.round((loan.amountDue + interest) * 100) / 100

  const updateResult = await PayLater.findOneAndUpdate(
    {
      _id: loan._id,
      lastInterestCalc: loan.lastInterestCalc, // optimistic lock
    },
    {
      amountDue: newAmountDue,
      lastInterestCalc: now,
    },
    { session, new: true }
  )

  if (!updateResult) {
    const freshLoan = await PayLater.findById(loan._id).session(session!)
    if (!freshLoan) throw new Error('Loan disappeared during interest calculation')
    return calculateInterest(freshLoan, session!)
  }

  return newAmountDue
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, {
    windowMs: 60_000,
    max: 10,
    message: 'Too many repayment requests. Try again later.',
  })
  if (rl) return rl

  await dbConnect()

  const body = await request.json()
  const v = validateBody(paylaterRepaySchema, body)
  if (!v.success) return validationError('Invalid repayment data', v.errors)
  const { loanId, amount } = v.data

  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    const [wallet, loan] = await Promise.all([
      Wallet.findOne({ userId: auth.user.userId }).session(session),
      PayLater.findById(loanId).session(session),
    ])

    if (!wallet) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }
    if (!loan) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 })
    }
    if (loan.userId.toString() !== auth.user.userId) {
      await session.abortTransaction()
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    if (loan.status === 'closed') {
      await session.abortTransaction()
      return NextResponse.json({ error: 'Loan already closed' }, { status: 400 })
    }

    const currentDue = await calculateInterest(loan, session)

    if (wallet.balance < amount) {
      await session.abortTransaction()
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₹${wallet.balance.toLocaleString('en-IN')}` },
        { status: 400 }
      )
    }

    const actualRepay = Math.min(amount, currentDue)

    const debited = await Wallet.findOneAndUpdate(
      { _id: wallet._id, balance: { $gte: actualRepay } },
      { $inc: { balance: -actualRepay } },
      { session, new: true }
    )
    if (!debited) {
      await session.abortTransaction()
      return NextResponse.json(
        { error: 'Insufficient balance. Try again.' },
        { status: 400 }
      )
    }

    const transaction = await Transaction.create([{
      fromUserId: auth.user.userId,
      amount: actualRepay,
      type: 'paylater_repay',
      status: 'success',
      description: `PayLater repayment of ₹${actualRepay.toLocaleString('en-IN')}`,
      category: 'paylater',
      paymentMethod: 'wallet',
      paylaterId: loan._id,
    }], { session })
    const txnDoc = transaction[0]

    const newAmountDue = Math.round((currentDue - actualRepay) * 100) / 100
    const newStatus = newAmountDue <= 0
      ? 'closed'
      : newAmountDue < loan.loanAmount
        ? 'partially_repaid'
        : 'active'

    const latestLoan = await PayLater.findById(loanId).session(session)
    if (!latestLoan) throw new Error('Loan disappeared during update')

    const finalDue = Math.round((latestLoan.amountDue - actualRepay) * 100) / 100
    const finalStatus = finalDue <= 0
      ? 'closed'
      : finalDue < loan.loanAmount
        ? 'partially_repaid'
        : 'active'

    await PayLater.findByIdAndUpdate(loanId, {
      $set: {
        amountDue: Math.max(0, finalDue),
        status: finalStatus,
        lastInterestCalc: new Date(),
      },
      $inc: { totalRepaid: actualRepay },
      $push: {
        repaymentHistory: { amount: actualRepay, transactionId: txnDoc._id },
        transactionRefs: txnDoc._id,
      },
    }, { session })

    if (finalStatus === 'closed') {
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: { paylaterUsed: -loan.loanAmount },
      }, { session })
    }

    const updatedWallet = await Wallet.findById(wallet._id).session(session)

    // ── Commit ──────────────────────────────────────────────────
    await session.commitTransaction()

    await logAudit({
      userId: auth.user.userId,
      action: 'UPDATE',
      resource: 'PayLaterRepayment',
      resourceId: loanId,
      details: { amount: actualRepay, newStatus: finalStatus },
      request,
    }).catch(() => { /* non-critical */ })

    return NextResponse.json({
      success: true,
      message: finalStatus === 'closed'
        ? 'Loan fully repaid! Your PayLater credit is restored.'
        : `₹${actualRepay.toLocaleString('en-IN')} repaid. Remaining: ₹${Math.max(0, finalDue).toLocaleString('en-IN')}`,
      newBalance: updatedWallet?.balance,
      loan: await PayLater.findById(loanId),
    })
  } catch (error) {
    await session.abortTransaction()
    console.error('PayLater repay error:', error)
    return NextResponse.json({ error: 'Repayment failed. Try again.' }, { status: 500 })
  } finally {
    session.endSession()
  }
}