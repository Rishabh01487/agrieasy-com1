import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validateBody, createOrderSchema } from '@/lib/validation'
import { validationError } from '@/lib/api-response'
import { rateLimitByUser } from '@/lib/rate-limit'

/**
 * Creates a Razorpay order for wallet top-up.
 *
 * The frontend (add-money/page.tsx) calls this to get an order_id,
 * then opens the Razorpay checkout modal.  After the user pays,
 * Razorpay calls the `handler` callback with payment details,
 * which the frontend sends to /api/agripay/topup for verification.
 */
export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 5, message: 'Too many order creation requests. Try again later.' })
  if (rl) return rl

  try {
    const body = await request.json()
    const v = validateBody(createOrderSchema, body)
    if (!v.success) return validationError('Invalid order data', v.errors)
    const { amount } = v.data

    const keyId = process.env.RAZORPAY_KEY_ID
    const keySecret = process.env.RAZORPAY_KEY_SECRET

    if (!keyId || !keySecret) {
      return NextResponse.json(
        { error: 'Payment gateway is not configured. Please contact support.' },
        { status: 503 }
      )
    }

    const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString('base64')

    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authHeader}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // paise
        currency: 'INR',
        receipt: `agripay_topup_${auth.user.userId}_${Date.now()}`,
        notes: {
          userId: auth.user.userId,
          purpose: 'agripay_wallet_topup',
        },
      }),
    })

    if (!res.ok) {
      const errBody = await res.text()
      console.error('Razorpay order creation failed:', errBody)
      return NextResponse.json({ error: 'Failed to create payment order. Try again.' }, { status: 502 })
    }

    const order = await res.json()

    return NextResponse.json({
      orderId: order.id,
      razorpayKey: keyId,
      currency: order.currency,
    })
  } catch (error) {
    console.error('Create order error:', error)
    return NextResponse.json({ error: 'Failed to create order. Try again.' }, { status: 500 })
  }
}