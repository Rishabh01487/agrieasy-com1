import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Booking from '@/lib/models/Booking'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 10, message: 'Too many booking requests.' })
  if (rl) return rl

  await dbConnect()

  try {
    const {
      listingId,
      vehicleId,
      quantity,
      estimatedDistance,
      pickupDateTime,
      farmerAddress,
    } = await request.json()

    if (!vehicleId || !quantity) {
      return NextResponse.json({ error: 'Missing required fields (vehicleId, quantity)' }, { status: 400 })
    }

    const booking = await Booking.create({
      farmerId: auth.userId,
      listingId: listingId || null,
      vehicleId,
      quantity,
      estimatedDistance,
      pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : undefined,
      farmerAddress,
      status: 'pending',
    })

    await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Booking', resourceId: booking._id.toString(), details: { vehicleId, quantity }, request })

    return NextResponse.json({ success: true, booking }, { status: 201 })
  } catch (error) {
    console.error('Create booking error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
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
    if (role === 'farmer') query.farmerId = auth.userId
    else query.buyerId = auth.userId

    const bookings = await Booking.find(query)
      .populate('farmerId', 'phone address farmerName')
      .populate('buyerId', 'firmName phone')
      .populate('listingId')
      .populate('vehicleId')
      .sort({ createdAt: -1 })

    return NextResponse.json({ bookings })
  } catch (error) {
    console.error('Fetch bookings error:', error)
    return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
  }
}
