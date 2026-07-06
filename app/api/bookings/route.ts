import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Booking from '@/lib/models/Booking'
import Listing from '@/lib/models/Listing'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parsePagination, paginationMeta, validationError } from '@/lib/api-response'
import { validateBody, createBookingSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many booking requests.' })
  if (rl) return rl

  await dbConnect()

  try {
    const body = await request.json()
    const v = validateBody(createBookingSchema, body)
    if (!v.success) return validationError('Validation failed', v.errors)
    const data = v.data

    // Extra fields not in schema (backward compat)
    const { vehicleId, estimatedDistance, pickupLocation, pickupDateTime } = body

    if (!vehicleId || !pickupLocation) {
      return NextResponse.json({ error: 'Missing required fields (vehicleId, pickupLocation)' }, { status: 400 })
    }

    // Fetch listing to get buyerId
    const listing = await Listing.findById(data.listingId)
    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const parsedDistance = estimatedDistance ? Number(estimatedDistance) : undefined

    const booking = await Booking.create({
      farmerId: auth.user.userId,
      buyerId: listing.buyerId,
      listingId: data.listingId,
      vehicleId,
      quantity: data.quantity,
      pickupLocation,
      deliveryLocation: data.deliveryAddress,
      estimatedDistance: parsedDistance,
      estimatedArrivalTime: pickupDateTime ? new Date(pickupDateTime) : undefined,
      status: 'pending',
    })

    await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Booking', resourceId: booking._id.toString(), details: { vehicleId, quantity: data.quantity }, request })

    return NextResponse.json({ success: true, booking }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create booking error:', error)
    const msg = error instanceof Error ? error.message : 'Failed to create booking'
    // Return 400 for validation errors, 500 for others
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

    const query: { farmerId?: string; buyerId?: string } = {}
    if (role === 'farmer') query.farmerId = auth.user.userId
    else if (role === 'buyer') query.buyerId = auth.user.userId
    else query.farmerId = auth.user.userId // default to farmer

    const { page, limit, skip } = parsePagination(searchParams, 100, 20)
    const total = await Booking.countDocuments(query)
    const bookings = await Booking.find(query)
      .populate('farmerId', 'phone address farmerName')
      .populate('buyerId', 'firmName phone')
      .populate('listingId')
      .populate('vehicleId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    return NextResponse.json({ success: true, data: { bookings }, meta: paginationMeta(page, limit, total) })
  } catch (error) {
    console.error('Fetch bookings error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}