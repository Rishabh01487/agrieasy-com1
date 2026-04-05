import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Vehicle from '@/lib/models/Vehicle'

export async function GET(request: NextRequest) {
  await dbConnect()
  try {
    const searchParams = request.nextUrl.searchParams
    const vehicleType = searchParams.get('vehicleType')
    const minCapacity = searchParams.get('minCapacity')
    const transporterId = searchParams.get('transporterId')

    const query: {
      availability?: boolean
      vehicleType?: string
      capacity?: { $gte: number }
      transporterId?: string
    } = {}

    if (!transporterId) query.availability = true // only show available when not filtering by transporter
    if (vehicleType) query.vehicleType = vehicleType
    if (minCapacity) query.capacity = { $gte: parseInt(minCapacity) }
    if (transporterId) query.transporterId = transporterId

    const vehicles = await Vehicle.find(query)
      .populate('transporterId', 'phone transporterCompanyName email')
      .sort({ createdAt: -1 })

    return NextResponse.json({ vehicles })
  } catch (error) {
    console.error('Fetch vehicles error:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  await dbConnect()
  try {
    const {
      transporterId,
      vehicleType,
      registrationNumber,
      capacity,
      pricePerKm,
      driverName,
      driverPhone,
      driverLicense,
    } = await request.json()

    if (!transporterId || !vehicleType || !registrationNumber || !capacity || !pricePerKm || !driverName || !driverPhone || !driverLicense) {
      return NextResponse.json({ error: 'Missing required fields: transporterId, vehicleType, registrationNumber, capacity, pricePerKm, driverName, driverPhone, driverLicense' }, { status: 400 })
    }

    const vehicle = await Vehicle.create({
      transporterId,
      vehicleType,
      registrationNumber: registrationNumber.toUpperCase(),
      capacity,
      pricePerKm,
      driverName,
      driverPhone,
      driverLicense,
      availability: true,
    })

    return NextResponse.json({ success: true, vehicle }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create vehicle error:', error)
    const msg = error instanceof Error && error.message.includes('duplicate key')
      ? 'Vehicle with this registration number already exists'
      : 'Failed to create vehicle'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  await dbConnect()
  try {
    const { vehicleId, availability } = await request.json()
    if (!vehicleId) return NextResponse.json({ error: 'vehicleId required' }, { status: 400 })
    const vehicle = await Vehicle.findByIdAndUpdate(vehicleId, { availability }, { new: true })
    return NextResponse.json({ success: true, vehicle })
  } catch (error) {
    console.error('Update vehicle error:', error)
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
  }
}
