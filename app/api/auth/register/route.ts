import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import * as bcryptModule from 'bcryptjs'
import { logAudit } from '@/lib/audit'
import { rateLimitByIp } from '@/lib/rate-limit'
import { validateBody, registerSchema } from '@/lib/validation'
import { apiSuccess, validationError, badRequest, apiError, ErrorCodes } from '@/lib/api-response'

const bcrypt = (bcryptModule as any).default || bcryptModule

/**
 * Detect whether the request comes from a Google-OAuth user.
 * Two signals:
 *   1. body.isGoogleUser === true  (explicit flag from the register page)
 *   2. body.password starts with 'google_oauth_' or 'Google_Oauth_'
 */
function detectGoogleUser(body: any): boolean {
  if (body?.isGoogleUser === true) return true
  if (typeof body?.password === 'string' &&
      (body.password.startsWith('google_oauth_') || body.password.startsWith('Google_Oauth_'))) {
    return true
  }
  return false
}

/**
 * Generate a strong random password that satisfies the strict passwordSchema
 * regex (uppercase + lowercase + digit + min 8 chars).
 * Used for Google users — they never see or type this password.
 */
function generateStrongPassword(): string {
  return 'Google_Oauth_' + Math.random().toString(36).slice(2, 10) + Date.now() + 'X9'
}

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimitByIp(request, { windowMs: 60_000, max: 3, message: 'Too many registration attempts. Try again later.' })
    if (rl) return rl

    await dbConnect()
    const body = await request.json()

    // Detect Google user BEFORE strict validation, so we can substitute a
    // strong password if the client sent a legacy lowercase-only one, and
    // skip Aadhar/Address for Google users.
    const isGoogleUser = detectGoogleUser(body)
    if (isGoogleUser) {
      const pw = typeof body.password === 'string' ? body.password : ''
      const meetsRegex = pw.length >= 8 && /[A-Z]/.test(pw) && /[a-z]/.test(pw) && /[0-9]/.test(pw)
      if (!meetsRegex) {
        body.password = generateStrongPassword()
      }
      // Google users don't need Aadhar or Address — drop if sent by mistake
      if (body.role === 'farmer') {
        body.aadhaarNumber = undefined
      }
      // Allow empty address for Google users — replace with empty string
      // so it passes the (now optional) schema validation.
      if (!body.address) {
        body.address = ''
      }
    }

    const v = validateBody(registerSchema, body)
    if (!v.success) return validationError('Invalid registration data', v.errors)
    const data = v.data

    // Manual farmer registration requires Aadhar
    if (data.role === 'farmer' && !isGoogleUser && !data.aadhaarNumber) {
      return badRequest('Aadhar number required for farmers')
    }

    // Manual user registration requires Address
    if (!isGoogleUser && !data.address) {
      return badRequest('Address is required')
    }

    if (data.role === 'buyer' && !data.firmName) {
      return badRequest('Firm name is required for buyers')
    }

    const existingUser = await User.findOne({ $or: [{ email: data.email }, { phone: data.phone }] })
    if (existingUser) {
      return badRequest('User already exists with this email or phone')
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    // Normalize address: schema accepts either a string or a structured object
    const addressStr = (() => {
      if (!data.address) return ''
      if (typeof data.address === 'string') return data.address
      return `${data.address.fullAddress}, ${data.address.district}, ${data.address.state} - ${data.address.pinCode}`
    })()

    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      role: data.role,
      address: addressStr,
      firmName: data.role === 'buyer' ? data.firmName : undefined,
      gstin: data.role === 'buyer' ? data.gstin : undefined,
      // Only store Aadhar for manual farmer registrations (Google farmers skip it)
      aadharNumber: data.role === 'farmer' && !isGoogleUser ? data.aadhaarNumber : undefined,
      farmerName: data.role === 'farmer' ? data.name : undefined,
      transporterCompanyName: data.role === 'transporter' ? data.name : undefined,
      transporterGstin: data.role === 'transporter' ? (data.transporterGstin || data.gstin) : undefined,
      drivingLicense: data.role === 'transporter' ? data.drivingLicense : undefined,
    })

    await logAudit({ userId: user._id.toString(), action: 'CREATE', resource: 'User', resourceId: user._id.toString(), details: { role: data.role, email: data.email, isGoogleUser }, request })

    return apiSuccess({ userId: user._id.toString() }, undefined, 201)
  } catch (error: unknown) {
    console.error('Registration error:', error)
    const message = error instanceof Error ? error.message : 'Registration failed'
    return apiError(ErrorCodes.INTERNAL_ERROR, message)
  }
}
