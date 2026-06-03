import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

function getRazorpay() {
  if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay not configured')
  }
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  })
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 10, message: 'Too many payment requests.' })
  if (rl) return rl

  await dbConnect()

  try {
    const { billingId, farmerId, buyerId, amount } = await request.json()

    if (!billingId || !farmerId || !buyerId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const razorpay = getRazorpay()
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: 'INR',
      receipt: billingId.toString(),
    })

    const transaction = await Transaction.create({
      billingId,
      farmerId,
      buyerId,
      amount,
      razorpayOrderId: order.id,
      paymentStatus: 'pending',
    })

    await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'PaymentOrder', resourceId: transaction._id.toString(), details: { billingId, amount, orderId: order.id }, request })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      transactionId: transaction._id,
      amount,
    })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 })
  }
}
