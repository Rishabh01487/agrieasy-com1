import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Vehicle from '@/lib/models/Vehicle'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parsePagination, paginationMeta, validationError } from '@/lib/api-response'
import { validateBody, createVehicleSchema } from '@/lib/validation'

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

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

    if (!transporterId) query.availability = true
    if (vehicleType) query.vehicleType = vehicleType
    const parsedCap = minCapacity ? parseInt(minCapacity) : NaN
    if (minCapacity && !isNaN(parsedCap)) query.capacity = { $gte: parsedCap }
    if (transporterId) query.transporterId = transporterId

    const { page, limit, skip } = parsePagination(searchParams, 100, 20)
    const total = await Vehicle.countDocuments(query)
    const vehicles = await Vehicle.find(query)
      .populate('transporterId', 'transporterCompanyName')  // FIX: removed phone/email (PII)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    return NextResponse.json({ success: true, data: { vehicles }, meta: paginationMeta(page, limit, total) })
  } catch (error) {
    console.error('Fetch vehicles error:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request, ['transporter'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 5, message: 'Too many vehicle adds.' })
  if (rl) return rl

  await dbConnect()
  try {
    const body = await request.json()
    const v = validateBody(createVehicleSchema, body)
    if (!v.success) return validationError('Validation failed', v.errors)
    const data = v.data

    const { driverName, driverPhone, driverLicense } = body

    const vehicle = await Vehicle.create({
      transporterId: auth.user.userId,
      vehicleType: data.vehicleType,
      registrationNumber: data.registrationNumber.toUpperCase(),
      capacity: data.capacity,
      capacityUnit: data.capacityUnit || 'kg',
      // Form sends `pricePerKm`; canonical schema field is `baseRatePerKm`.
      // Accept either.
      pricePerKm: data.baseRatePerKm ?? data.pricePerKm ?? 0,
      driverName,
      driverPhone,
      driverLicense,
      availability: data.availability === 'on_trip' ? false : (data.availability !== 'unavailable'),
    })

    await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Vehicle', resourceId: vehicle._id.toString(), details: { vehicleType: data.vehicleType, registrationNumber: data.registrationNumber }, request })

    return NextResponse.json({ success: true, vehicle }, { status: 201 })
  } catch (error: unknown) {
    console.error('Create vehicle error:', error)
    const e = error as Error & { code?: number; keyValue?: Record<string, unknown> }
    if (e.code === 11000 || (e.message && e.message.includes('duplicate key'))) {
      const dup = e.keyValue?.registrationNumber ? ` (${e.keyValue.registrationNumber})` : ''
      return NextResponse.json({ error: `Vehicle with this registration number already exists${dup}` }, { status: 409 })
    }
    if (e.name === 'ValidationError') {
      return NextResponse.json({ error: e.message || 'Validation failed' }, { status: 400 })
    }
    return NextResponse.json({ error: e.message || 'Failed to create vehicle' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  const auth = authenticateRequest(request, ['transporter'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many updates.' })
  if (rl) return rl

  await dbConnect()
  try {
    const { vehicleId, availability } = await request.json()
    if (!vehicleId) return NextResponse.json({ error: 'vehicleId required' }, { status: 400 })

    const existing = await Vehicle.findById(vehicleId)
    if (!existing) return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 })
    if (existing.transporterId.toString() !== auth.user.userId) return forbidden('You do not own this vehicle')

    const vehicle = await Vehicle.findByIdAndUpdate(vehicleId, { availability }, { new: true })
    await logAudit({ userId: auth.user.userId, action: 'UPDATE', resource: 'Vehicle', resourceId: vehicleId, details: { availability }, request })
    return NextResponse.json({ success: true, vehicle })
  } catch (error) {
    console.error('Update vehicle error:', error)
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
  }
}