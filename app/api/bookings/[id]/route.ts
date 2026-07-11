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
 * Body variants:
 *   { status: 'confirmed'|'in-transit'|'delivered'|'cancelled', driverNote? }
 *   { driverOfferedTime: <ISO date>, driverResponse: 'counter-offered' }
 *   { acceptDriverOffer: true }   // farmer accepts counter-offer
 *   { rejectDriverOffer: true }   // farmer rejects counter-offer
 *
 * Authorization:
 *   - farmer       → cancel own pending booking; accept/reject driver counter-offer
 *   - buyer        → confirm / cancel / deliver bookings to his shop
 *   - transporter  → confirm / dispatch / deliver / cancel bookings on his vehicles; counter-offer time
 *   - buyer-as-vehicle-owner → same as transporter for his own vehicles
 *
 * Side effects:
 *   - When status becomes 'in-transit', set vehicle.availableFrom = estimatedArrivalTime + 2h
 *     (default trip duration). Other farmers can still book the vehicle for a later pickup.
 *   - When status becomes 'delivered' or 'cancelled', clear vehicle.availableFrom so it's
 *     immediately available again.
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
    const actorId = auth.user.userId
    const role = auth.user.role

    const booking = await Booking.findById(id)
    if (!booking) return notFound('Booking')

    // ── Branch 1: Farmer accepting/rejecting a driver counter-offer ──
    if (body.acceptDriverOffer === true || body.rejectDriverOffer === true) {
      if (role !== 'farmer' || booking.farmerId?.toString() !== actorId) {
        return forbidden('Only the farmer who created this booking can respond to the counter-offer')
      }
      if (booking.driverResponse !== 'counter-offered') {
        return validationError('No counter-offer pending', [{ field: 'driverResponse', message: 'Driver has not counter-offered yet' }])
      }
      if (body.acceptDriverOffer) {
        booking.driverResponse = 'accepted'
        if (booking.driverOfferedTime) booking.estimatedArrivalTime = booking.driverOfferedTime
        // Notify driver + buyer
        const farmer = await User.findById(actorId).lean()
        const farmerName = farmer?.farmerName || farmer?.email || 'Farmer'
        await safeNotify(booking.transporterId || booking.buyerId, actorId, 'booking_status', booking._id.toString(), `${farmerName} accepted your counter-offer. New pickup time: ${booking.driverOfferedTime ? new Date(booking.driverOfferedTime).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'TBD'}.`)
      } else {
        booking.driverResponse = 'rejected'
        const farmer = await User.findById(actorId).lean()
        const farmerName = farmer?.farmerName || farmer?.email || 'Farmer'
        await safeNotify(booking.transporterId || booking.buyerId, actorId, 'booking_status', booking._id.toString(), `${farmerName} rejected your counter-offer. Pickup time stays as originally requested.`)
      }
      booking.updatedAt = new Date()
      await booking.save()
      return apiSuccess({ booking: await populatedBooking(id) })
    }

    // ── Branch 2: Driver counter-offering a pickup time ──
    if (body.driverOfferedTime && body.driverResponse === 'counter-offered') {
      // Only transporter (or buyer-as-vehicle-owner) can counter-offer
      let canCounterOffer = false
      if (role === 'transporter' && booking.vehicleId) {
        const v = await Vehicle.findById(booking.vehicleId).lean()
        canCounterOffer = !!v && v.transporterId.toString() === actorId
      } else if (role === 'buyer' && booking.buyerVehicleId) {
        const bv = await BuyerVehicle.findById(booking.buyerVehicleId).lean()
        canCounterOffer = !!bv && bv.buyerId.toString() === actorId
      }
      if (!canCounterOffer) {
        return forbidden('You are not authorized to counter-offer on this booking')
      }
      const offeredTime = new Date(body.driverOfferedTime)
      if (isNaN(offeredTime.getTime())) {
        return validationError('Invalid driverOfferedTime', [{ field: 'driverOfferedTime', message: 'Could not parse date' }])
      }
      booking.driverOfferedTime = offeredTime
      booking.driverResponse = 'counter-offered'
      if (body.driverNote) booking.driverNote = String(body.driverNote).slice(0, 500)
      booking.updatedAt = new Date()
      await booking.save()

      const actor = await User.findById(actorId).lean()
      const actorName = actor?.firmName || actor?.transporterCompanyName || actor?.email || 'Driver'
      await safeNotify(booking.farmerId, actorId, 'booking_status', booking._id.toString(), `${actorName} proposed a new pickup time: ${offeredTime.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.${body.driverNote ? ` Note: ${body.driverNote}` : ''}`)

      await logAudit({ userId: actorId, action: 'UPDATE', resource: 'Booking', resourceId: id, details: { driverOfferedTime: offeredTime }, request })
      return apiSuccess({ booking: await populatedBooking(id) })
    }

    // ── Branch 3: Standard status change ──
    const newStatus = body.status as string | undefined
    const driverNote = body.driverNote as string | undefined
    if (!newStatus || !['confirmed', 'in-transit', 'delivered', 'cancelled'].includes(newStatus)) {
      return validationError('Invalid request', [{ field: 'status', message: 'Must provide status, driverOfferedTime, acceptDriverOffer, or rejectDriverOffer' }])
    }

    // ── Authorization: figure out who can act on this booking ──
    let canAct = false
    let actorLabel = 'User'

    if (role === 'farmer' && booking.farmerId?.toString() === actorId) {
      canAct = newStatus === 'cancelled' && booking.status === 'pending'
      actorLabel = 'farmer'
    } else if (role === 'buyer' && booking.buyerId?.toString() === actorId) {
      canAct = ['confirmed', 'cancelled', 'delivered'].includes(newStatus)
      actorLabel = 'buyer'
    } else if (role === 'transporter' && booking.vehicleId) {
      const v = await Vehicle.findById(booking.vehicleId).lean()
      if (v && v.transporterId.toString() === actorId) {
        canAct = ['confirmed', 'in-transit', 'delivered', 'cancelled'].includes(newStatus)
        actorLabel = 'transporter'
      }
    } else if (role === 'buyer' && booking.buyerVehicleId) {
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

    // ── Update vehicle availability cycle ──
    // On dispatch (in-transit), mark the vehicle busy until the estimated
    // delivery time + 2 hour buffer. On delivery or cancellation, free it.
    if (newStatus === 'in-transit') {
      const tripBufferMs = 2 * 60 * 60 * 1000  // 2 hours
      const availableFrom = booking.estimatedArrivalTime
        ? new Date(new Date(booking.estimatedArrivalTime).getTime() + tripBufferMs)
        : new Date(Date.now() + tripBufferMs)
      if (booking.vehicleId) {
        await Vehicle.updateOne({ _id: booking.vehicleId }, { $set: { availableFrom } })
      }
      if (booking.buyerVehicleId) {
        await BuyerVehicle.updateOne({ _id: booking.buyerVehicleId }, { $set: { availableFrom } })
      }
    } else if (newStatus === 'delivered' || newStatus === 'cancelled') {
      if (booking.vehicleId) {
        await Vehicle.updateOne({ _id: booking.vehicleId }, { $set: { availableFrom: null } })
      }
      if (booking.buyerVehicleId) {
        await BuyerVehicle.updateOne({ _id: booking.buyerVehicleId }, { $set: { availableFrom: null } })
      }
    }

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
    await safeNotify(
      booking.farmerId,
      actorId,
      'booking_status',
      booking._id.toString(),
      `${actorName} ${statusText[newStatus] || `updated your booking to ${newStatus}`}.`,
    )

    // Also notify the buyer when transporter dispatches
    if (role === 'transporter' && newStatus === 'in-transit' && booking.buyerId && booking.buyerId.toString() !== actorId) {
      await safeNotify(booking.buyerId, actorId, 'booking_status', booking._id.toString(), `🚚 ${actorName} dispatched the vehicle. Commodity is on its way to your shop.`)
    }

    // When delivered, prompt buyer to enter the bill & pay
    if (newStatus === 'delivered' && booking.buyerId) {
      await safeNotify(
        booking.buyerId,
        booking.farmerId,
        'booking_status',
        booking._id.toString(),
        `💰 Commodity delivered. Please weigh, enter the bill amount, and pay the farmer.`,
      )
    }

    return apiSuccess({ booking: await populatedBooking(id) })
  } catch (err) {
    console.error('Update booking error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to update booking')
  }
}

async function safeNotify(userId: unknown, actorId: string, type: 'booking_request' | 'booking_status', bookingId: string, text: string) {
  if (!userId) return
  try {
    await Notification.create({ userId, actorId, type, bookingId, text, isRead: false })
  } catch (err) {
    console.warn('Notification creation failed (non-blocking):', err)
  }
}

async function populatedBooking(id: string) {
  return Booking.findById(id)
    .populate('farmerId', 'phone address farmerName email upiId')
    .populate('buyerId', 'firmName phone address upiId')
    .populate('listingId')
    .populate('vehicleId')
    .populate('buyerVehicleId')
    .lean()
}
