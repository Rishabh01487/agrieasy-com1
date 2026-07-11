import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { apiSuccess, apiError, validationError, ErrorCodes } from '@/lib/api-response'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { z } from 'zod/v4'
import { sanitize } from '@/lib/validation'

// Force Node.js runtime so DNS + MongoDB work properly.
export const runtime = 'nodejs'
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

// Whitelisted fields a buyer is allowed to update on their profile.
const profileUpdateSchema = z.object({
  firmName: z.string().min(2).max(200).optional(),
  gstin: z.string().regex(/^[0-9A-Z]{0,15}$/).optional(),
  bio: z.string().max(500).optional(),
  // Cloudinary URLs (or empty string to clear). We accept empty string so the
  // user can remove an existing photo. We accept only URLs to prevent
  // arbitrary string blobs from being saved.
  visitingCardPhoto: z.string().url().or(z.literal('')).optional(),
  shopPhoto: z.string().url().or(z.literal('')).optional(),
  // Optional list of commodities the buyer is interested in (free-text chips).
  commoditiesInterested: z.array(z.string().max(60)).max(50).optional(),
})

/**
 * GET /api/buyer/profile
 * Returns the authenticated buyer's profile (firm name, photos, contact).
 */
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  try {
    await dbConnect()
    const user = await User.findById(auth.user.userId).lean()
    if (!user) return apiError(ErrorCodes.NOT_FOUND, 'User not found')
    if (user.role !== 'buyer') return forbidden('Only buyer accounts can access this endpoint')

    // Strip sensitive fields — never expose password, aadhar, license, etc.
    const profile = {
      _id: user._id.toString(),
      name: user.farmerName || user.driverName || user.email,
      email: user.email,
      phone: user.phone,
      role: user.role,
      address: user.address,
      firmName: user.firmName || '',
      gstin: user.gstin || '',
      bio: user.bio || '',
      commoditiesInterested: user.commoditiesInterested || [],
      visitingCardPhoto: user.visitingCardPhoto || '',
      shopPhoto: user.shopPhoto || '',
      profilePic: user.profilePic || '',
      createdAt: user.createdAt,
    }
    return apiSuccess({ profile })
  } catch (err) {
    console.error('Buyer profile GET error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to load profile')
  }
}

/**
 * PATCH /api/buyer/profile
 * Updates the buyer's editable profile fields (firm name, GSTIN, photos, etc.).
 */
export async function PATCH(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 15, message: 'Too many profile updates. Slow down.' })
  if (rl) return rl

  try {
    await dbConnect()
    const user = await User.findById(auth.user.userId)
    if (!user) return apiError(ErrorCodes.NOT_FOUND, 'User not found')
    if (user.role !== 'buyer') return forbidden('Only buyer accounts can update this profile')

    const body = await request.json()
    const parsed = profileUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return validationError(
        'Invalid profile data',
        parsed.error.issues.map(i => ({ field: String(i.path.join('.')), message: i.message })),
      )
    }
    const data = parsed.data

    // Apply only provided fields. Sanitize free-text strings.
    if (data.firmName !== undefined) user.firmName = sanitize(data.firmName)
    if (data.gstin !== undefined) user.gstin = data.gstin.toUpperCase()
    if (data.bio !== undefined) user.bio = sanitize(data.bio)
    if (data.visitingCardPhoto !== undefined) user.visitingCardPhoto = data.visitingCardPhoto
    if (data.shopPhoto !== undefined) user.shopPhoto = data.shopPhoto
    if (data.commoditiesInterested !== undefined) {
      user.commoditiesInterested = data.commoditiesInterested.map(s => sanitize(s))
    }
    user.updatedAt = new Date()
    await user.save()

    await logAudit({
      userId: auth.user.userId,
      action: 'UPDATE',
      resource: 'User',
      resourceId: user._id.toString(),
      details: { updatedFields: Object.keys(data) },
      request,
    })

    const profile = {
      _id: user._id.toString(),
      name: user.farmerName || user.driverName || user.email,
      email: user.email,
      phone: user.phone,
      role: user.role,
      address: user.address,
      firmName: user.firmName || '',
      gstin: user.gstin || '',
      bio: user.bio || '',
      commoditiesInterested: user.commoditiesInterested || [],
      visitingCardPhoto: user.visitingCardPhoto || '',
      shopPhoto: user.shopPhoto || '',
      profilePic: user.profilePic || '',
    }
    return apiSuccess({ profile })
  } catch (err) {
    console.error('Buyer profile PATCH error:', err)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to update profile')
  }
}
