import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Booking from '@/lib/models/Booking'
import Listing from '@/lib/models/Listing'
import Vehicle from '@/lib/models/Vehicle'
import BuyerVehicle from '@/lib/models/BuyerVehicle'
import User from '@/lib/models/User'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parsePagination, paginationMeta, validationError, apiSuccess } from '@/lib/api-response'
import { validateBody, createBookingSchema } from '@/lib/validation'

/**
 * Send a notification to a user about a booking event.
 * Silently fails — notifications are best-effort, never block the booking.
 */
async function notify(userId: string, actorId: string, type: 'booking_request' | 'booking_status', bookingId: string, text: string) {
  try {
    await Notification.create({ userId, actorId, type, bookingId, text, isRead: false })
  } catch (err) {
    console.warn('Notification creation failed (non-blocking):', err)
  }
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many booking requests.' })
  if (rl) return rl

  await dbConnect()

  try {
    const body = await request.json()

    // Two flavors of booking:
    //  (a) legacy single-commodity  — must pass listingId + vehicleId + pickupLocation + quantity
    //  (b) new multi-commodity      — must pass commodities[] + (vehicleId OR buyerVehicleId) +
    //                                  pickupLocation + deliveryLocation + pickupDateTime
    const hasMultiCommodity = Array.isArray(body.commodities) && body.commodities.length > 0
    const buyerVehicleId = body.buyerVehicleId
    const vehicleId = body.vehicleId

    if (!hasMultiCommodity) {
      // Legacy path — validate using the original createBookingSchema (which
      // expects listingId + quantity + deliveryAddress)
      const v = validateBody(createBookingSchema, body)
      if (!v.success) return validationError('Validation failed', v.errors)
      const data = v.data

      const { vehicleId: legacyVehicleId, estimatedDistance, pickupLocation, pickupDateTime } = body
      if (!legacyVehicleId || !pickupLocation) {
        return NextResponse.json({ error: 'Missing required fields (vehicleId, pickupLocation)' }, { status: 400 })
      }

      const listing = await Listing.findById(data.listingId)
      if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

      const parsedDistance = estimatedDistance ? Number(estimatedDistance) : undefined

      const booking = await Booking.create({
        farmerId: auth.user.userId,
        buyerId: listing.buyerId,
        listingId: data.listingId,
        vehicleId: legacyVehicleId,
        commodity: listing.commodity,
        quantity: data.quantity,
        totalQuantity: data.quantity,
        pickupLocation,
        deliveryLocation: data.deliveryAddress,
        estimatedDistance: parsedDistance,
        estimatedArrivalTime: pickupDateTime ? new Date(pickupDateTime) : undefined,
        status: 'pending',
      })

      await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Booking', resourceId: booking._id.toString(), details: { vehicleId: legacyVehicleId, quantity: data.quantity }, request })
      return apiSuccess({ booking }, undefined, 201)
    }

    // Multi-commodity path
    if (!body.pickupLocation || !body.deliveryLocation) {
      return validationError('pickupLocation and deliveryLocation are required', [{ field: 'pickupLocation', message: 'Required' }])
    }
    if (!vehicleId && !buyerVehicleId) {
      return validationError('Please select a vehicle (transporter or buyer-owned)', [{ field: 'vehicleId', message: 'Either vehicleId or buyerVehicleId is required' }])
    }

    // Resolve the buyerId from the first commodity's listing (all commodities
    // in a single booking must belong to the same buyer — the farmer is going
    // to ONE buyer's shop, not many).
    const firstListingId = body.commodities[0].listingId
    let buyerId: string | undefined
    let primaryListingId: string | undefined
    if (firstListingId) {
      const firstListing = await Listing.findById(firstListingId).lean()
      if (!firstListing) return NextResponse.json({ error: `Listing ${firstListingId} not found` }, { status: 404 })
      buyerId = firstListing.buyerId.toString()
      primaryListingId = firstListingId
    } else if (body.buyerId) {
      buyerId = body.buyerId
    }

    // Make sure all commodities belong to the same buyer (when they have listings)
    for (const c of body.commodities) {
      if (c.listingId) {
        const l = await Listing.findById(c.listingId).lean()
        if (!l) return NextResponse.json({ error: `Listing ${c.listingId} not found` }, { status: 404 })
        if (buyerId && l.buyerId.toString() !== buyerId) {
          return validationError('All commodities must belong to the same buyer', [{ field: 'commodities', message: 'Cannot mix buyers in one booking' }])
        }
        buyerId = l.buyerId.toString()
      }
    }

    // Compute total quantity + freight
    const commodities = body.commodities.map((c: any) => ({
      listingId: c.listingId || undefined,
      name: String(c.name || '').slice(0, 100),
      quantity: Number(c.quantity) || 0,
      numberOfBags: Number(c.numberOfBags) || 0,
      pricePerUnit: Number(c.pricePerUnit) || 0,
    }))
    // Guard: if any commodity is missing a name or has zero quantity, return
    // a clear validation error instead of letting Mongoose throw a cryptic one.
    const missingName = commodities.find((c: any) => !c.name || c.name.trim() === '')
    if (missingName) {
      return validationError('Each commodity needs a name', [{ field: 'commodities', message: 'Commodity name is missing' }])
    }
    const zeroQty = commodities.find((c: any) => !c.quantity || c.quantity <= 0)
    if (zeroQty) {
      return validationError(`Quantity is required for ${zeroQty.name}`, [{ field: 'commodities', message: `${zeroQty.name}: quantity must be greater than 0` }])
    }
    const totalQuantity = commodities.reduce((s: number, c: any) => s + (c.quantity || 0), 0)
    const estimatedDistance = body.estimatedDistance ? Number(body.estimatedDistance) : undefined

    // Freight calculation
    let freightAmount = 0
    let freightType: 'free' | 'flat' | 'per_km' | 'transporter' = 'transporter'
    if (buyerVehicleId) {
      const bv = await BuyerVehicle.findById(buyerVehicleId).lean()
      if (!bv) return NextResponse.json({ error: 'Buyer vehicle not found' }, { status: 404 })
      freightType = bv.freightType as 'free' | 'flat' | 'per_km'
      if (freightType === 'free') freightAmount = 0
      else if (freightType === 'flat') freightAmount = bv.freightAmount || 0
      else if (freightType === 'per_km') freightAmount = (bv.freightAmount || 0) * (estimatedDistance || 0)
    } else if (vehicleId) {
      const v = await Vehicle.findById(vehicleId).lean()
      if (!v) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
      freightType = 'transporter'
      freightAmount = (v.pricePerKm || 0) * (estimatedDistance || 0)
    }

    const booking = await Booking.create({
      farmerId: auth.user.userId,
      buyerId,
      listingId: primaryListingId,
      vehicleId: vehicleId || undefined,
      buyerVehicleId: buyerVehicleId || undefined,
      commodities,
      totalQuantity,
      pickupLocation: body.pickupLocation,
      deliveryLocation: body.deliveryLocation,
      estimatedDistance,
      freightAmount,
      freightType,
      estimatedArrivalTime: body.pickupDateTime ? new Date(body.pickupDateTime) : undefined,
      status: 'pending',
    })

    await logAudit({
      userId: auth.user.userId,
      action: 'CREATE',
      resource: 'Booking',
      resourceId: booking._id.toString(),
      details: { commodityCount: commodities.length, totalQuantity, freightAmount, freightType, vehicleId, buyerVehicleId },
      request,
    })

    // ── Notify the buyer (so they know a farmer is selling to their shop) ──
    if (buyerId) {
      const farmer = await User.findById(auth.user.userId).lean()
      const farmerName = farmer?.farmerName || farmer?.email || 'A farmer'
      const commoditySummary = commodities.length === 1
        ? `${commodities[0].name} (${commodities[0].quantity} kg)`
        : `${commodities.length} commodities (${totalQuantity} kg total)`
      await notify(
        buyerId,
        auth.user.userId,
        'booking_request',
        booking._id.toString(),
        `${farmerName} wants to sell ${commoditySummary} to your shop. Pickup ${new Date(body.pickupDateTime || Date.now()).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}.`,
      )

      // If the farmer selected the BUYER'S OWN vehicle, also flag that —
      // the buyer needs to dispatch the driver themselves.
      if (buyerVehicleId) {
        await notify(
          buyerId,
          auth.user.userId,
          'booking_request',
          booking._id.toString(),
          `🚚 ${farmerName} booked YOUR vehicle for this trip. Dispatch your driver to the pickup location at the scheduled time.`,
        )
      }
    }

    // ── Notify the transporter (so they can dispatch a driver) ──
    if (vehicleId) {
      const v = await Vehicle.findById(vehicleId).lean()
      if (v?.transporterId) {
        const farmer = await User.findById(auth.user.userId).lean()
        const farmerName = farmer?.farmerName || farmer?.email || 'A farmer'
        await notify(
          v.transporterId.toString(),
          auth.user.userId,
          'booking_request',
          booking._id.toString(),
          `🚚 ${farmerName} booked your ${v.vehicleType} (${v.registrationNumber}) for ${totalQuantity} kg. Pickup at ${body.pickupLocation}. Dispatch your driver ${v.driverName || ''} ${v.driverPhone ? `(${v.driverPhone})` : ''}.`,
        )
      }
    }

    return apiSuccess({ booking }, undefined, 201)
  } catch (error: unknown) {
    console.error('Create booking error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to create booking'
    const status = msg.includes('required') || msg.includes('Cast to') ? 400 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  await dbConnect()

  try {
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')
    const status = searchParams.get('status')

    // Build the query based on role:
    //  - farmer       → bookings I created
    //  - buyer        → bookings made to my shop (buyerId = me)
    //  - transporter  → bookings using vehicles I own (need to look up my vehicle IDs first)
    let query: Record<string, unknown> = {}

    if (role === 'buyer') {
      query.buyerId = auth.user.userId
    } else if (role === 'transporter') {
      // Find all vehicles owned by this transporter, then match bookings on those vehicles.
      const myVehicles = await Vehicle.find({ transporterId: auth.user.userId }).lean().select('_id')
      const myVehicleIds = myVehicles.map(v => v._id)
      query = { vehicleId: { $in: myVehicleIds } }
    } else {
      // Default: farmer — bookings I created
      query.farmerId = auth.user.userId
    }

    if (status) {
      query.status = status
    }

    const { page, limit, skip } = parsePagination(searchParams, 100, 20)
    const total = await Booking.countDocuments(query)
    const bookings = await Booking.find(query)
      .populate('farmerId', 'phone address farmerName email')
      .populate('buyerId', 'firmName phone address')
      .populate('listingId')
      .populate('vehicleId')
      .populate('buyerVehicleId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()

    return NextResponse.json({ success: true, data: { bookings }, meta: paginationMeta(page, limit, total) })
  } catch (error) {
    console.error('Fetch bookings error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}