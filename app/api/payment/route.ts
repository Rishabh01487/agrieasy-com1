import { verifyCsrf } from '@/lib/csrf'
import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import dbConnect from '@/lib/mongodb'
import Billing from '@/lib/models/Billing'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { objectIdSchema } from '@/lib/validation'

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
    if (!verifyCsrf(request)) return NextResponse.json({ error: 'CSRF token invalid or missing' }, { status: 403 })
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many payment requests.' })
  if (rl) return rl

  await dbConnect()

  try {
    const { billingId } = await request.json()

    // SECURITY FIX (MEDIUM — IDOR / metadata poisoning):
    // Previously the caller could supply arbitrary farmerId, buyerId,
    // and billingId values — the route wrote them straight into the
    // Transaction record with no validation. An attacker could attribute
    // payments to arbitrary users (audit/analytics poisoning).
    //
    // Now: ONLY billingId is accepted from the client. We look up the
    // Billing record, verify the caller IS its buyer, and derive
    // farmerId + buyerId + amount from the trusted DB row — never from
    // the request body.
    const bid = objectIdSchema.safeParse(billingId)
    if (!bid.success) {
      return NextResponse.json({ error: 'Invalid billingId' }, { status: 400 })
    }

    const billing = await Billing.findById(bid.data).lean()
    if (!billing) {
      return NextResponse.json({ error: 'Billing record not found' }, { status: 404 })
    }
    if (billing.buyerId.toString() !== auth.user.userId) {
      return forbidden('You can only pay for your own bookings')
    }

    const parsedAmount = Number(billing.totalAmount)
    if (!parsedAmount || parsedAmount < 1) {
      return NextResponse.json({ error: 'Invalid billing amount — contact support' }, { status: 400 })
    }

    const razorpay = getRazorpay()
    const order = await razorpay.orders.create({
      amount: parsedAmount * 100,
      currency: 'INR',
      receipt: billing._id.toString(),
    })

    const transaction = await Transaction.create({
      fromUserId: auth.user.userId,            // = billing.buyerId (verified above)
      toUserId: billing.farmerId,              // from trusted DB row, not request body
      amount: parsedAmount,
      type: 'booking_pay',
      status: 'pending',
      description: `Payment for billing ${billing._id}`,
      category: 'booking',
      paymentMethod: 'upi',
      razorpayOrderId: order.id,
      referenceId: billing._id.toString(),
    })

    await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'PaymentOrder', resourceId: transaction._id.toString(), details: { billingId: billing._id.toString(), farmerId: billing.farmerId.toString(), amount: parsedAmount, orderId: order.id }, request })

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