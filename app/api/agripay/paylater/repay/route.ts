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

/**
 * Calculate accrued interest using an optimistic lock on the loan
 * document to prevent concurrent recalculation from double-counting.
 */
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

  // Use findOneAndUpdate with lastInterestCalc as an optimistic lock:
  // only update if no other request has already advanced it.
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
    // Another concurrent request already recalculated — re-fetch and retry
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

  // ── MongoDB Transaction ──────────────────────────────────────────
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // ── 1. Read wallet and loan ───────────────────────────────────
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

    // ── 2. Calculate interest (with optimistic locking) ──────────
    const currentDue = await calculateInterest(loan, session)

    if (wallet.balance < amount) {
      await session.abortTransaction()
      return NextResponse.json(
        { error: `Insufficient balance. Available: ₹${wallet.balance.toLocaleString('en-IN')}` },
        { status: 400 }
      )
    }

    const actualRepay = Math.min(amount, currentDue)

    // ── 3. Debit wallet atomically ───────────────────────────────
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

    // ── 4. Create transaction record ─────────────────────────────
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

    // ── 5. Update loan ──────────────────────────────────────────
    const newAmountDue = Math.round((currentDue - actualRepay) * 100) / 100
    const newStatus = newAmountDue <= 0
      ? 'closed'
      : newAmountDue < loan.loanAmount
        ? 'partially_repaid'
        : 'active'

    // Re-read loan to get latest amountDue (interest may have been
    // recalculated by calculateInterest with optimistic lock)
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

    // ── 6. Restore paylater credit on full repayment ────────────
    if (finalStatus === 'closed') {
      await Wallet.findByIdAndUpdate(wallet._id, {
        $inc: { paylaterUsed: -loan.loanAmount },
      }, { session })
    }

    // ── 7. Read final wallet balance ────────────────────────────
    const updatedWallet = await Wallet.findById(wallet._id).session(session)

    // ── Commit ──────────────────────────────────────────────────
    await session.commitTransaction()

    // ── Audit log (outside transaction — best-effort) ───────────
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