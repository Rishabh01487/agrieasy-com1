import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/lib/models/Transaction'
import crypto from 'crypto'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many verification requests.' })
  if (rl) return rl

  await dbConnect()

  try {
    const { razorpayPaymentId, razorpayOrderId, transactionId, razorpaySignature } = await request.json()

    if (!razorpayPaymentId || !razorpayOrderId) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    if (!razorpaySignature) {
      return NextResponse.json({ error: 'Missing payment signature' }, { status: 400 })
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 })
    }

    if (!transactionId) {
      return NextResponse.json({ error: 'Missing transaction ID' }, { status: 400 })
    }

    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex')
    if (expected !== razorpaySignature) {
      return NextResponse.json({ error: 'Payment signature mismatch' }, { status: 400 })
    }

    // FIX: Use correct field names matching Transaction model
    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      {
        status: 'success',               // FIX: was 'paymentStatus: completed'
        razorpayPaymentId,
        referenceId: razorpayPaymentId,
      },
      { new: true }
    )

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    await logAudit({ userId: auth.user.userId, action: 'UPDATE', resource: 'PaymentVerification', resourceId: transactionId, details: { razorpayOrderId, razorpayPaymentId }, request })

    return NextResponse.json({
      success: true,
      message: 'Payment verified successfully',
      transaction,
    })
  } catch (error) {
    console.error('Verification error:', error)
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 500 })
  }
}