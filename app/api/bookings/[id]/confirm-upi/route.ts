import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Booking from '@/lib/models/Booking'
import User from '@/lib/models/User'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { apiSuccess, apiError, validationError, ErrorCodes, notFound } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'

/**
 * POST /api/bookings/[id]/confirm-upi
 *
 * After the buyer completes a direct-UPI payment in their UPI app (GPay /
 * PhonePe / Paytm), they return to the app and confirm. We mark the booking
 * as paid. (In a future iteration, a UPI webhook could automate this — for
 * now we trust the buyer's confirmation since the farmer can dispute.)
 *
 * Body: { paymentRef?: string }  // optional UPI ref no. from the receipt
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  await dbConnect()
  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const paymentRef = body.paymentRef ? String(body.paymentRef).slice(0, 100) : `upi-${Date.now()}`

    const booking = await Booking.findById(id)
    if (!booking) return notFound('Booking')
    if (booking.buyerId?.toString() !== auth.user.userId) {
      return forbidden('Only the buyer of this booking can confirm payment')
    }
    if (booking.paymentStatus === 'paid') {
      return validationError('Already paid', [{ field: 'paymentStatus', message: 'This booking is already marked paid' }])
    }
    if (booking.paymentMethod !== 'direct-upi') {
      return validationError('Not a UPI payment', [{ field: 'paymentMethod', message: `Current method: ${booking.paymentMethod}` }])
    }

    booking.paymentStatus = 'paid'
    booking.paidAt = new Date()
    booking.paymentRef = paymentRef
    booking.updatedAt = new Date()
    await booking.save()

    await logAudit({
      userId: auth.user.userId,
      action: 'UPDATE',
      resource: 'Booking',
      resourceId: id,
      details: { confirmedUpi: true, paymentRef },
      request,
    })

    // Notify farmer
    const buyer = await User.findById(auth.user.userId).lean()
    const buyerName = buyer?.firmName || buyer?.email || 'Buyer'
    try {
      await Notification.create({
        userId: booking.farmerId,
        actorId: auth.user.userId,
        type: 'booking_status',
        bookingId: booking._id,
        text: `✅ ${buyerName} confirmed UPI payment of ₹${(booking.paymentAmount || 0).toLocaleString('en-IN')} (Ref: ${paymentRef}). Please verify your bank account.`,
        isRead: false,
      })
    } catch { /* non-blocking */ }

    const populated = await Booking.findById(id)
      .populate('farmerId', 'phone address farmerName email upiId')
      .populate('buyerId', 'firmName phone address upiId')
      .populate('vehicleId')
      .populate('buyerVehicleId')
      .lean()

    return apiSuccess({ booking: populated, message: 'Payment confirmed' })
  } catch (err) {
    console.error('Confirm UPI error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to confirm payment')
  }
}
