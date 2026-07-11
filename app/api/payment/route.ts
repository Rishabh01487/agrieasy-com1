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

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many payment requests.' })
  if (rl) return rl

  await dbConnect()

  try {
    const { billingId, farmerId, buyerId, amount } = await request.json()

    if (!billingId || !farmerId || !buyerId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const parsedAmount = Number(amount)
    if (!parsedAmount || parsedAmount < 1) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const razorpay = getRazorpay()
    const order = await razorpay.orders.create({
      amount: parsedAmount * 100,
      currency: 'INR',
      receipt: billingId.toString(),
    })

    const transaction = await Transaction.create({
      fromUserId: auth.user.userId,
      toUserId: farmerId,
      amount: parsedAmount,
      type: 'booking_pay',
      status: 'pending',
      description: `Payment for billing ${billingId}`,
      category: 'booking',
      paymentMethod: 'upi',
      razorpayOrderId: order.id,
      referenceId: billingId,
    })

    await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'PaymentOrder', resourceId: transaction._id.toString(), details: { billingId, amount: parsedAmount, orderId: order.id }, request })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      transactionId: transaction._id,
      amount: parsedAmount,
    })
  } catch (error) {
    console.error('Payment error:', error)
    return NextResponse.json({ error: 'Payment initialization failed' }, { status: 500 })
  }
}