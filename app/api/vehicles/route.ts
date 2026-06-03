import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Vehicle from '@/lib/models/Vehicle'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

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
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 5, message: 'Too many vehicle adds.' })
  if (rl) return rl

  await dbConnect()
  try {
    const {
      vehicleType,
      registrationNumber,
      capacity,
      pricePerKm,
      driverName,
      driverPhone,
      driverLicense,
    } = await request.json()

    if (!vehicleType || !registrationNumber || !capacity || !pricePerKm || !driverName || !driverPhone || !driverLicense) {
      return NextResponse.json({ error: 'Missing required fields: vehicleType, registrationNumber, capacity, pricePerKm, driverName, driverPhone, driverLicense' }, { status: 400 })
    }

    const vehicle = await Vehicle.create({
      transporterId: auth.userId,
      vehicleType,
      registrationNumber: registrationNumber.toUpperCase(),
      capacity,
      pricePerKm,
      driverName,
      driverPhone,
      driverLicense,
      availability: true,
    })

    await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Vehicle', resourceId: vehicle._id.toString(), details: { vehicleType, registrationNumber }, request })

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
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 10, message: 'Too many updates.' })
  if (rl) return rl

  await dbConnect()
  try {
    const { vehicleId, availability } = await request.json()
    if (!vehicleId) return NextResponse.json({ error: 'vehicleId required' }, { status: 400 })
    const vehicle = await Vehicle.findByIdAndUpdate(vehicleId, { availability }, { new: true })
    await logAudit({ userId: auth.userId, action: 'UPDATE', resource: 'Vehicle', resourceId: vehicleId, details: { availability }, request })
    return NextResponse.json({ success: true, vehicle })
  } catch (error) {
    console.error('Update vehicle error:', error)
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
  }
}
