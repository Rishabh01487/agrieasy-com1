import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import BuyerVehicle from '@/lib/models/BuyerVehicle'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { apiSuccess, apiError, validationError, ErrorCodes } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validateBody, createBuyerVehicleSchema } from '@/lib/validation'
import { parsePagination, paginationMeta } from '@/lib/api-response'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  await dbConnect()
  try {
    const searchParams = request.nextUrl.searchParams
    const requestedBuyerId = searchParams.get('buyerId')

    if (requestedBuyerId) {
      const { page, limit, skip } = parsePagination(searchParams, 100, 50)
      const query = { buyerId: requestedBuyerId, availability: 'available' }
      const total = await BuyerVehicle.countDocuments(query)
      const vehicles = await BuyerVehicle.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
      return apiSuccess({ vehicles }, paginationMeta(page, limit, total))
    }

    const { page, limit, skip } = parsePagination(searchParams, 100, 50)
    const query = { buyerId: auth.user.userId }
    const total = await BuyerVehicle.countDocuments(query)
    const vehicles = await BuyerVehicle.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean()
    return apiSuccess({ vehicles }, paginationMeta(page, limit, total))
  } catch (err) {
    console.error('BuyerVehicles GET error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch vehicles')
  }
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()
  if (auth.user.role !== 'buyer') return forbidden('Only buyer accounts can add vehicles')

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many vehicle requests.' })
  if (rl) return rl

  await dbConnect()
  try {
    const body = await request.json()
    const v = validateBody(createBuyerVehicleSchema, body)
    if (!v.success) return validationError('Validation failed', v.errors)
    const data = v.data

    const vehicle = await BuyerVehicle.create({
      buyerId: auth.user.userId,
      vehicleType: data.vehicleType,
      vehicleDisplayName: data.vehicleDisplayName || '',
      registrationNumber: data.registrationNumber.toUpperCase(),
      capacityKg: data.capacityKg,
      driverName: data.driverName || '',
      driverPhone: data.driverPhone || '',
      freightType: data.freightType,
      freightAmount: data.freightType === 'free' ? 0 : (data.freightAmount || 0),
      availability: data.availability,
      notes: data.notes || '',
      baseLocation: data.baseLocation || '',
    })

    await logAudit({
      userId: auth.user.userId,
      action: 'CREATE',
      resource: 'BuyerVehicle',
      resourceId: vehicle._id.toString(),
      details: { vehicleType: data.vehicleType, registrationNumber: data.registrationNumber, freightType: data.freightType },
      request,
    })

    return apiSuccess({ vehicle }, undefined, 201)
  } catch (err: unknown) {
    console.error('BuyerVehicle create error:', err)
    const e = err as Error & { code?: number }
    if (e.code === 11000) {
      return apiError(ErrorCodes.CONFLICT, 'A vehicle with this registration number already exists')
    }
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to create vehicle')
  }
}
