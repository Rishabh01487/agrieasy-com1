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

  const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 10, message: 'Too many verification requests.' })
  if (rl) return rl

  await dbConnect()

  try {
    const { razorpayPaymentId, razorpayOrderId, transactionId } = await request.json()

    if (!razorpayPaymentId || !razorpayOrderId) {
      return NextResponse.json({ error: 'Missing payment details' }, { status: 400 })
    }

    if (!process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: 'Payment gateway not configured' }, { status: 500 })
    }
    crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex')

    const transaction = await Transaction.findByIdAndUpdate(transactionId, {
      razorpayPaymentId,
      paymentStatus: 'completed',
      completedAt: new Date(),
    })

    await logAudit({ userId: auth.userId, action: 'UPDATE', resource: 'PaymentVerification', resourceId: transactionId, details: { razorpayOrderId, razorpayPaymentId }, request })

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
