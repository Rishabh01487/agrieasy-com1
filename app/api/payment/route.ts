import { NextRequest, NextResponse } from 'next/server'
import Razorpay from 'razorpay'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/lib/models/Transaction'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
})

export async function POST(request: NextRequest) {
  await dbConnect()

  try {
    const { billingId, farmerId, buyerId, amount } = await request.json()

    if (!billingId || !farmerId || !buyerId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: amount * 100, // Amount in paise
      currency: 'INR',
      receipt: billingId.toString(),
    })

    // Save transaction record
    const transaction = await Transaction.create({
      billingId,
      farmerId,
      buyerId,
      amount,
      razorpayOrderId: order.id,
      paymentStatus: 'pending',
    })

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
