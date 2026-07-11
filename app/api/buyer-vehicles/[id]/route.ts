import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import BuyerVehicle from '@/lib/models/BuyerVehicle'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { apiSuccess, apiError, validationError, ErrorCodes, notFound } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { validateBody, updateBuyerVehicleSchema } from '@/lib/validation'

/**
 * PATCH /api/buyer-vehicles/[id]
 * Update a buyer's own vehicle (freight, availability, driver info, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()
  if (auth.user.role !== 'buyer') return forbidden('Only buyer accounts can update vehicles')

  await dbConnect()
  try {
    const { id } = await params
    const existing = await BuyerVehicle.findById(id)
    if (!existing) return notFound('Vehicle')
    if (existing.buyerId.toString() !== auth.user.userId) {
      return forbidden('You do not own this vehicle')
    }

    const body = await request.json()
    const v = validateBody(updateBuyerVehicleSchema, body)
    if (!v.success) return validationError('Validation failed', v.errors)
    const data = v.data

    // Apply only provided fields
    const updates: Record<string, unknown> = {}
    for (const key of [
      'vehicleType', 'vehicleDisplayName', 'registrationNumber', 'capacityKg',
      'driverName', 'driverPhone', 'freightType', 'freightAmount',
      'availability', 'notes', 'baseLocation',
    ]) {
      if (data[key as keyof typeof data] !== undefined) {
        updates[key] = data[key as keyof typeof data]
      }
    }
    // Force freightAmount = 0 when freightType is 'free'
    if (updates.freightType === 'free') updates.freightAmount = 0
    if (updates.registrationNumber) updates.registrationNumber = (updates.registrationNumber as string).toUpperCase()
    updates.updatedAt = new Date()

    const vehicle = await BuyerVehicle.findByIdAndUpdate(id, { $set: updates }, { new: true })
    await logAudit({
      userId: auth.user.userId,
      action: 'UPDATE',
      resource: 'BuyerVehicle',
      resourceId: id,
      details: { updatedFields: Object.keys(updates) },
      request,
    })
    return apiSuccess({ vehicle })
  } catch (err) {
    console.error('BuyerVehicle update error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to update vehicle')
  }
}

/**
 * DELETE /api/buyer-vehicles/[id]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()
  if (auth.user.role !== 'buyer') return forbidden('Only buyer accounts can delete vehicles')

  await dbConnect()
  try {
    const { id } = await params
    const existing = await BuyerVehicle.findById(id)
    if (!existing) return notFound('Vehicle')
    if (existing.buyerId.toString() !== auth.user.userId) {
      return forbidden('You do not own this vehicle')
    }
    await BuyerVehicle.findByIdAndDelete(id)
    await logAudit({
      userId: auth.user.userId,
      action: 'DELETE',
      resource: 'BuyerVehicle',
      resourceId: id,
      details: {},
      request,
    })
    return apiSuccess({ deleted: true })
  } catch (err) {
    console.error('BuyerVehicle delete error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to delete vehicle')
  }
}
