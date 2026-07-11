import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Booking from '@/lib/models/Booking'
import User from '@/lib/models/User'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { apiSuccess, apiError, validationError, ErrorCodes, notFound } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { z } from 'zod/v4'

const billSchema = z.object({
  billAmount: z.number().positive('Bill amount must be positive').max(10_000_000),
  billNote: z.string().max(500).optional(),
  // Optional: actual weight per commodity (after weighing) — stored as a note
  // for now. Future enhancement: structured per-commodity actual weights.
})

/**
 * POST /api/bookings/[id]/bill
 * Buyer enters the final bill amount after weighing the commodity at his shop.
 * Sets booking.paymentStatus = 'billed' and notifies the farmer.
 *
 * Authorization: only the buyer of this booking can set the bill.
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
    const body = await request.json()
    const parsed = billSchema.safeParse(body)
    if (!parsed.success) {
      return validationError('Invalid bill data', parsed.error.issues.map(i => ({ field: String(i.path.join('.')), message: i.message })))
    }
    const { billAmount, billNote } = parsed.data

    const booking = await Booking.findById(id)
    if (!booking) return notFound('Booking')
    if (booking.buyerId?.toString() !== auth.user.userId) {
      return forbidden('Only the buyer of this booking can set the bill')
    }
    if (booking.status !== 'delivered') {
      return validationError('Booking must be delivered before billing', [{ field: 'status', message: `Current status: ${booking.status}` }])
    }

    booking.billAmount = billAmount
    if (billNote) booking.billNote = billNote
    booking.paymentStatus = 'billed'
    booking.updatedAt = new Date()
    await booking.save()

    await logAudit({
      userId: auth.user.userId,
      action: 'UPDATE',
      resource: 'Booking',
      resourceId: id,
      details: { billAmount, billNote },
      request,
    })

    // Notify the farmer
    const buyer = await User.findById(auth.user.userId).lean()
    const buyerName = buyer?.firmName || buyer?.email || 'Buyer'
    try {
      await Notification.create({
        userId: booking.farmerId,
        actorId: auth.user.userId,
        type: 'booking_status',
        bookingId: booking._id,
        text: `💰 ${buyerName} entered the final bill: ₹${billAmount.toLocaleString('en-IN')}.${billNote ? ` Note: ${billNote}` : ''}`,
        isRead: false,
      })
    } catch (err) {
      console.warn('Notification failed (non-blocking):', err)
    }

    const populated = await Booking.findById(id)
      .populate('farmerId', 'phone address farmerName email upiId')
      .populate('buyerId', 'firmName phone address upiId')
      .populate('vehicleId')
      .populate('buyerVehicleId')
      .lean()

    return apiSuccess({ booking: populated })
  } catch (err) {
    console.error('Bill creation error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to set bill')
  }
}
