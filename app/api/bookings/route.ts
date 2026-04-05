import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Booking from '@/lib/models/Booking'

export async function POST(request: NextRequest) {
  await dbConnect()

  try {
    const {
      farmerId,
      listingId,
      vehicleId,
      quantity,
      estimatedDistance,
      pickupDateTime,
      farmerAddress,
    } = await request.json()

    if (!farmerId || !vehicleId || !quantity) {
      return NextResponse.json({ error: 'Missing required fields (farmerId, vehicleId, quantity)' }, { status: 400 })
    }

    const booking = await Booking.create({
      farmerId,
      listingId: listingId || null,
      vehicleId,
      quantity,
      estimatedDistance,
      pickupDateTime: pickupDateTime ? new Date(pickupDateTime) : undefined,
      farmerAddress,
      status: 'pending',
    })

    return NextResponse.json({ success: true, booking }, { status: 201 })
  } catch (error) {
    console.error('Create booking error:', error)
    return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  await dbConnect()

  try {
    const searchParams = request.nextUrl.searchParams
    const farmerId = searchParams.get('farmerId')
    const buyerId = searchParams.get('buyerId')

    const query: { farmerId?: string; buyerId?: string } = {}
    if (farmerId) query.farmerId = farmerId
    if (buyerId) query.buyerId = buyerId

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
