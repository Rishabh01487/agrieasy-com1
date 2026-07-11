import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Booking from '@/lib/models/Booking'
import Vehicle from '@/lib/models/Vehicle'
import BuyerVehicle from '@/lib/models/BuyerVehicle'
import User from '@/lib/models/User'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { apiSuccess, apiError, validationError, ErrorCodes, notFound } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'

/**
 * PATCH /api/bookings/[id]
 *
 * Body: { status: 'confirmed' | 'in-transit' | 'delivered' | 'cancelled',
 *         driverNote?: string }
 *
 * Authorization:
 *   - buyer       → can confirm / cancel bookings made to his shop
 *   - transporter → can confirm / dispatch (in-transit) / deliver bookings on his vehicles
 *   - buyer who owns the buyer-vehicle → can dispatch / deliver bookings on his own vehicles
 *   - farmer      → can only cancel his own booking (if still pending)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  await dbConnect()
  try {
    const { id } = await params
    const body = await request.json()
    const newStatus = body.status as string | undefined
    const driverNote = body.driverNote as string | undefined

    if (!newStatus || !['confirmed', 'in-transit', 'delivered', 'cancelled'].includes(newStatus)) {
      return validationError('Invalid status', [{ field: 'status', message: 'Must be one of: confirmed, in-transit, delivered, cancelled' }])
    }

    const booking = await Booking.findById(id)
    if (!booking) return notFound('Booking')

    // ── Authorization: figure out who can act on this booking ──
    const actorId = auth.user.userId
    const role = auth.user.role

    let canAct = false
    let actorLabel = 'User'

    if (role === 'farmer' && booking.farmerId?.toString() === actorId) {
      // Farmer can only cancel his own pending booking
      canAct = newStatus === 'cancelled' && booking.status === 'pending'
      actorLabel = 'farmer'
    } else if (role === 'buyer' && booking.buyerId?.toString() === actorId) {
      // Buyer can confirm / cancel / mark delivered for bookings to his shop
      canAct = ['confirmed', 'cancelled', 'delivered'].includes(newStatus)
      actorLabel = 'buyer'
    } else if (role === 'transporter' && booking.vehicleId) {
      // Transporter can act on bookings using his vehicles
      const v = await Vehicle.findById(booking.vehicleId).lean()
      if (v && v.transporterId.toString() === actorId) {
        canAct = ['confirmed', 'in-transit', 'delivered', 'cancelled'].includes(newStatus)
        actorLabel = 'transporter'
      }
    } else if (role === 'buyer' && booking.buyerVehicleId) {
      // Buyer can dispatch his own vehicles too
      const bv = await BuyerVehicle.findById(booking.buyerVehicleId).lean()
      if (bv && bv.buyerId.toString() === actorId) {
        canAct = ['confirmed', 'in-transit', 'delivered', 'cancelled'].includes(newStatus)
        actorLabel = 'buyer (vehicle owner)'
      }
    }

    if (!canAct) {
      return forbidden('You are not authorized to perform this action on this booking')
    }

    const oldStatus = booking.status
    booking.status = newStatus
    if (driverNote) booking.driverNote = String(driverNote).slice(0, 500)
    if (newStatus === 'delivered') booking.actualArrivalTime = new Date()
    booking.updatedAt = new Date()
    await booking.save()

    await logAudit({
      userId: actorId,
      action: 'UPDATE',
      resource: 'Booking',
      resourceId: id,
      details: { oldStatus, newStatus, actorLabel },
      request,
    })

    // ── Notify the farmer about the status change ──
    const actor = await User.findById(actorId).lean()
    const actorName = actor?.firmName || actor?.farmerName || actor?.transporterCompanyName || actor?.email || 'Someone'
    const statusText: Record<string, string> = {
      confirmed: '✅ confirmed your booking',
      'in-transit': '🚚 dispatched the vehicle — your commodity is on the way',
      delivered: '📦 marked your booking as delivered',
      cancelled: '❌ cancelled your booking',
    }
    try {
      await Notification.create({
        userId: booking.farmerId,
        actorId,
        type: 'booking_status',
        bookingId: booking._id,
        text: `${actorName} ${statusText[newStatus] || `updated your booking to ${newStatus}`}.`,
        isRead: false,
      })
    } catch (err) {
      console.warn('Notification creation failed (non-blocking):', err)
    }

    // Also notify the buyer when transporter dispatches (so buyer knows vehicle is coming)
    if (role === 'transporter' && newStatus === 'in-transit' && booking.buyerId && booking.buyerId.toString() !== actorId) {
      try {
        await Notification.create({
          userId: booking.buyerId,
          actorId,
          type: 'booking_status',
          bookingId: booking._id,
          text: `🚚 ${actorName} dispatched the vehicle. Commodity is on its way to your shop.`,
          isRead: false,
        })
      } catch { /* non-blocking */ }
    }

    const populated = await Booking.findById(id)
      .populate('farmerId', 'phone address farmerName email')
      .populate('buyerId', 'firmName phone address')
      .populate('listingId')
      .populate('vehicleId')
      .populate('buyerVehicleId')
      .lean()

    return apiSuccess({ booking: populated })
  } catch (err) {
    console.error('Update booking error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to update booking')
  }
}
