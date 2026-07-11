import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { apiSuccess, apiError, validationError, ErrorCodes } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validateBody, farmerProfileSchema } from '@/lib/validation'

export const runtime = 'nodejs'
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

/**
 * GET /api/farmer/profile
 * Returns the authenticated farmer's profile including location.
 */
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  try {
    await dbConnect()
    const user = await User.findById(auth.user.userId).lean()
    if (!user) return apiError(ErrorCodes.NOT_FOUND, 'User not found')
    if (user.role !== 'farmer') return forbidden('Only farmer accounts can access this endpoint')

    const profile = {
      _id: user._id.toString(),
      name: user.farmerName || user.email,
      email: user.email,
      phone: user.phone,
      role: user.role,
      address: user.address,
      farmerName: user.farmerName || '',
      farmerAddress: user.farmerAddress || '',
      hasSetupLocation: user.hasSetupLocation || false,
      location: user.location || null,
      bio: user.bio || '',
      upiId: user.upiId || '',
      profilePic: user.profilePic || '',
      createdAt: user.createdAt,
    }
    return apiSuccess({ profile })
  } catch (err) {
    console.error('Farmer profile GET error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to load profile')
  }
}

/**
 * PATCH /api/farmer/profile
 * Updates farmer's location (and optionally name/bio/upiId).
 * Sets hasSetupLocation = true so the dashboard stops prompting.
 */
export async function PATCH(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()
  if (auth.user.role !== 'farmer') return forbidden('Only farmer accounts can update this profile')

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 20, message: 'Too many profile updates.' })
  if (rl) return rl

  await dbConnect()
  try {
    const user = await User.findById(auth.user.userId)
    if (!user) return apiError(ErrorCodes.NOT_FOUND, 'User not found')

    const body = await request.json()
    const v = validateBody(farmerProfileSchema, body)
    if (!v.success) return validationError('Invalid profile data', v.errors)
    const data = v.data

    user.farmerAddress = data.farmerAddress
    user.location = { latitude: data.latitude, longitude: data.longitude }
    user.hasSetupLocation = true
    if (data.farmerName !== undefined) user.farmerName = data.farmerName
    if (data.bio !== undefined) user.bio = data.bio
    if (data.upiId !== undefined) user.upiId = data.upiId
    user.updatedAt = new Date()
    await user.save()

    await logAudit({
      userId: auth.user.userId,
      action: 'UPDATE',
      resource: 'User',
      resourceId: user._id.toString(),
      details: { updatedFields: ['farmerAddress', 'location', 'hasSetupLocation'] },
      request,
    })

    const profile = {
      _id: user._id.toString(),
      name: user.farmerName || user.email,
      email: user.email,
      phone: user.phone,
      role: user.role,
      address: user.address,
      farmerName: user.farmerName || '',
      farmerAddress: user.farmerAddress || '',
      hasSetupLocation: user.hasSetupLocation,
      location: user.location,
      bio: user.bio || '',
      upiId: user.upiId || '',
      profilePic: user.profilePic || '',
    }
    return apiSuccess({ profile })
  } catch (err) {
    console.error('Farmer profile PATCH error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to update profile')
  }
}
