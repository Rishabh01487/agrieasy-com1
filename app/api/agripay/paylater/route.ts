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
const RETURN_PERIOD_DAYS = 15
const MAX_LOAN_AMOUNT = 1000000

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

export async function GET(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const wallet = await Wallet.findOne({ userId: auth.userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

        const activeLoans = await PayLater.find({ userId: auth.userId, status: { $in: ['active', 'partially_repaid'] } }).sort({ borrowedAt: -1 })
        const closedLoans = await PayLater.find({ userId: auth.userId, status: 'closed' }).sort({ borrowedAt: -1 }).limit(10)

        const enrichedLoans = await Promise.all(activeLoans.map(async (loan) => {
            const currentDue = await calculateInterest(loan)
            return { ...loan.toObject(), amountDue: currentDue }
        }))

        return NextResponse.json({
            wallet: {
                paylaterLimit: wallet.paylaterLimit,
                paylaterUsed: wallet.paylaterUsed,
                paylaterEligible: wallet.paylaterEligible,
                paylaterMaxLimit: wallet.paylaterMaxLimit,
            },
            activeLoans: enrichedLoans,
            closedLoans,
            availableCredit: wallet.paylaterLimit - wallet.paylaterUsed,
        })
    } catch (error) {
        console.error('PayLater GET error:', error)
        return NextResponse.json({ error: 'Failed to fetch PayLater info' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 5, message: 'Too many loan requests. Try again later.' })
    if (rl) return rl

    await dbConnect()
    try {
        const { amount } = await request.json()
        if (!amount || amount < 1) {
            return NextResponse.json({ error: 'amount (min ₹1) required' }, { status: 400 })
        }

        if (amount > MAX_LOAN_AMOUNT) {
            return NextResponse.json({ error: `Maximum loan amount is ₹${MAX_LOAN_AMOUNT.toLocaleString('en-IN')}` }, { status: 400 })
        }

        const wallet = await Wallet.findOne({ userId: auth.userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
        if (!wallet.paylaterEligible) return NextResponse.json({ error: 'You are not eligible for PayLater yet. Complete KYC and build credit history.' }, { status: 400 })
        if (wallet.paylaterUsed + amount > wallet.paylaterLimit) {
            return NextResponse.json({ error: `Insufficient PayLater credit limit. Available: ₹${(wallet.paylaterLimit - wallet.paylaterUsed).toLocaleString('en-IN')}` }, { status: 400 })
        }

        const dueDate = new Date()
        dueDate.setDate(dueDate.getDate() + RETURN_PERIOD_DAYS)

        const transaction = await Transaction.create({
            toUserId: auth.userId,
            amount,
            type: 'paylater_borrow',
            status: 'success',
            description: `PayLater loan of ₹${amount.toLocaleString('en-IN')}`,
            category: 'paylater',
            paymentMethod: 'paylater',
        })

        const loan = await PayLater.create({
            userId: auth.userId,
            loanAmount: amount,
            amountDue: amount,
            borrowedAt: new Date(),
            dueDate,
            status: 'active',
            transactionRefs: [transaction._id],
        })

        await Transaction.findByIdAndUpdate(transaction._id, { paylaterId: loan._id })
        await Wallet.findByIdAndUpdate(wallet._id, {
            $inc: { balance: amount, paylaterUsed: amount },
        })

        const updatedWallet = await Wallet.findById(wallet._id)

        await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'PayLaterLoan', resourceId: loan._id.toString(), details: { amount, dueDate: dueDate.toISOString() }, request })

        return NextResponse.json({
            success: true,
            message: `PayLater loan of ₹${amount.toLocaleString('en-IN')} approved! Due by ${dueDate.toLocaleDateString('en-IN')}`,
            newBalance: updatedWallet?.balance,
            loan,
        })
    } catch (error) {
        console.error('PayLater POST error:', error)
        return NextResponse.json({ error: 'Failed to process PayLater request' }, { status: 500 })
    }
}
