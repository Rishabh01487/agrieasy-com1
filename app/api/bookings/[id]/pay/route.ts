import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Booking from '@/lib/models/Booking'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import User from '@/lib/models/User'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { apiSuccess, apiError, validationError, ErrorCodes, notFound } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { z } from 'zod/v4'

const paySchema = z.object({
  method: z.enum(['wallet', 'agripay-upi', 'direct-upi', 'cash']),
  amount: z.number().positive('Amount must be positive').max(10_000_000).optional(),
  // For 'cash', we just record the payment without any wallet/UPI movement.
  // For 'direct-upi', we return a UPI deep link and the client confirms after
  //   the user completes the payment in their UPI app.
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many payment attempts. Try again later.' })
  if (rl) return rl

  await dbConnect()
  try {
    const { id } = await params
    const body = await request.json()
    const parsed = paySchema.safeParse(body)
    if (!parsed.success) {
      return validationError('Invalid payment data', parsed.error.issues.map(i => ({ field: String(i.path.join('.')), message: i.message })))
    }
    const { method } = parsed.data

    const booking = await Booking.findById(id)
    if (!booking) return notFound('Booking')
    if (booking.buyerId?.toString() !== auth.user.userId) {
      return forbidden('Only the buyer of this booking can pay')
    }
    if (booking.status !== 'delivered') {
      return validationError('Booking must be delivered before payment', [{ field: 'status', message: `Current status: ${booking.status}` }])
    }
    if (booking.paymentStatus === 'paid') {
      return validationError('This booking is already paid', [{ field: 'paymentStatus', message: 'Already paid' }])
    }

    const amount = parsed.data.amount
      ?? booking.billAmount
      ?? (booking.commodities || []).reduce((s: number, c: any) => s + (c.quantity || 0) * (c.pricePerUnit || 0), 0)
    if (!amount || amount <= 0) {
      return validationError('Cannot determine payment amount', [{ field: 'amount', message: 'Set the bill amount first' }])
    }

    // Load farmer record
    const farmer = await User.findById(booking.farmerId).lean()
    if (!farmer) return notFound('Farmer')

    const buyer = await User.findById(auth.user.userId).lean()
    const buyerName = buyer?.firmName || buyer?.email || 'Buyer'

    if (method === 'direct-upi') {
      const farmerUpi = farmer.upiId || farmer.phone ? `${farmer.phone}@agripay` : null
      if (!farmer.upiId && !farmer.phone) {
        return validationError('Farmer has no UPI ID or phone', [{ field: 'upi', message: 'Ask the farmer to add a UPI ID to their profile' }])
      }
      const pa = farmer.upiId || `${farmer.phone}@agripay`
      const pn = encodeURIComponent(farmer.farmerName || farmer.phone || 'Farmer')
      const am = amount.toFixed(2)
      const tn = encodeURIComponent(`AgriEasy booking ${booking._id.toString().slice(-6)}`)
      const upiLink = `upi://pay?pa=${pa}&pn=${pn}&am=${am}&tn=${tn}&cu=INR`

      booking.paymentMethod = 'direct-upi'
      booking.paymentStatus = 'pending'
      booking.paymentAmount = amount
      booking.updatedAt = new Date()
      await booking.save()

      await logAudit({
        userId: auth.user.userId,
        action: 'UPDATE',
        resource: 'Booking',
        resourceId: id,
        details: { paymentMethod: method, amount, upiLinkGenerated: true },
        request,
      })

      return apiSuccess({
        upiLink,
        amount,
        farmerUpi: pa,
        farmerName: farmer.farmerName || farmer.phone,
        bookingId: booking._id,
        message: 'Open the UPI link in your UPI app to complete the payment, then come back and confirm.',
      })
    }

    if (method === 'cash') {
      booking.paymentMethod = 'cash'
      booking.paymentStatus = 'paid'
      booking.paymentAmount = amount
      booking.paidAt = new Date()
      booking.paymentRef = 'cash'
      booking.updatedAt = new Date()
      await booking.save()

      await logAudit({
        userId: auth.user.userId,
        action: 'UPDATE',
        resource: 'Booking',
        resourceId: id,
        details: { paymentMethod: 'cash', amount },
        request,
      })

      // Notify farmer
      try {
        await Notification.create({
          userId: booking.farmerId,
          actorId: auth.user.userId,
          type: 'booking_status',
          bookingId: booking._id,
          text: `💵 ${buyerName} marked your booking as paid in CASH (₹${amount.toLocaleString('en-IN')}). Please confirm receipt.`,
          isRead: false,
        })
      } catch { /* non-blocking */ }

      return apiSuccess({
        booking: await populatedBooking(id),
        message: `Recorded cash payment of ₹${amount.toLocaleString('en-IN')}`,
      })
    }

    const fromWallet = await Wallet.findOne({ userId: auth.user.userId })
    if (!fromWallet) {
      return NextResponse.json({ error: 'Your AgriPay wallet is not set up. Open AgriPay first.' }, { status: 404 })
    }
    if (fromWallet.balance < amount) {
      return NextResponse.json({ error: `Insufficient AgriPay balance. Available: ₹${fromWallet.balance}. Top up your wallet first.` }, { status: 400 })
    }

    let toWallet = await Wallet.findOne({ userId: farmer._id })
    if (!toWallet) {
      toWallet = await Wallet.create({ userId: farmer._id, balance: 0, agripayId: `${farmer.phone}@agripay` })
    }

    // Atomic debit-then-credit
    const debited = await Wallet.findOneAndUpdate(
      { _id: fromWallet._id, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true },
    )
    if (!debited) {
      return NextResponse.json({ error: 'Insufficient balance. Try again.' }, { status: 400 })
    }
    await Wallet.findByIdAndUpdate(toWallet._id, { $inc: { balance: amount } })

    const ref = `WALLET-${Date.now()}-${booking._id.toString().slice(-6)}`
    await Transaction.create({
      fromUserId: auth.user.userId,
      toUserId: farmer._id,
      amount,
      type: 'send',
      status: 'success',
      description: `Payment to ${farmer.farmerName || farmer.phone} for booking ${booking._id.toString().slice(-6)}`,
      category: 'booking_payment',
      paymentMethod: method,
      note: booking.billNote || '',
    })
    await Transaction.create({
      fromUserId: auth.user.userId,
      toUserId: farmer._id,
      amount,
      type: 'receive',
      status: 'success',
      description: `Received from ${buyerName} for booking ${booking._id.toString().slice(-6)}`,
      category: 'booking_payment',
      paymentMethod: method,
      note: booking.billNote || '',
    })

    booking.paymentMethod = method
    booking.paymentStatus = 'paid'
    booking.paymentAmount = amount
    booking.paidAt = new Date()
    booking.paymentRef = ref
    booking.updatedAt = new Date()
    await booking.save()

    await logAudit({
      userId: auth.user.userId,
      action: 'UPDATE',
      resource: 'Booking',
      resourceId: id,
      details: { paymentMethod: method, amount, ref },
      request,
    })

    // Notify farmer
    try {
      await Notification.create({
        userId: booking.farmerId,
        actorId: auth.user.userId,
        type: 'booking_status',
        bookingId: booking._id,
        text: `💰 ${buyerName} paid you ₹${amount.toLocaleString('en-IN')} via AgriPay ${method === 'wallet' ? 'wallet' : 'UPI'}. New wallet balance: ₹${(toWallet.balance + amount).toLocaleString('en-IN')}.`,
        isRead: false,
      })
    } catch { /* non-blocking */ }

    return apiSuccess({
      booking: await populatedBooking(id),
      newBalance: debited.balance,
      message: `Paid ₹${amount.toLocaleString('en-IN')} to ${farmer.farmerName || farmer.phone} via AgriPay`,
    })
  } catch (err) {
    console.error('Payment error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to process payment')
  }
}

async function populatedBooking(id: string) {
  return Booking.findById(id)
    .populate('farmerId', 'phone address farmerName email upiId')
    .populate('buyerId', 'firmName phone address upiId')
    .populate('vehicleId')
    .populate('buyerVehicleId')
    .lean()
}
