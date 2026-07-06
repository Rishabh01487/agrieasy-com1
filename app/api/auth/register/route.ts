import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import * as bcryptModule from 'bcryptjs'
import { logAudit } from '@/lib/audit'
import { rateLimitByIp } from '@/lib/rate-limit'
import { validateBody, registerSchema } from '@/lib/validation'
import { apiSuccess, validationError, badRequest, apiError, ErrorCodes } from '@/lib/api-response'

const bcrypt = (bcryptModule as any).default || bcryptModule

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimitByIp(request, { windowMs: 60_000, max: 3, message: 'Too many registration attempts. Try again later.' })
    if (rl) return rl

    await dbConnect()
    const body = await request.json()

    const v = validateBody(registerSchema, body)
    if (!v.success) return validationError('Invalid registration data', v.errors)
    const data = v.data

    // Role-specific business logic checks
    if (data.role === 'farmer' && !data.aadhaarNumber) {
      return badRequest('Aadhar number required for farmers')
    }

    if (data.role === 'buyer' && !data.firmName) {
      return badRequest('Firm name is required for buyers')
    }

    const existingUser = await User.findOne({ $or: [{ email: data.email }, { phone: data.phone }] })
    if (existingUser) {
      return badRequest('User already exists with this email or phone')
    }

    const hashedPassword = await bcrypt.hash(data.password, 10)

    const user = await User.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      role: data.role,
      address: data.address,
      firmName: data.role === 'buyer' ? data.firmName : undefined,
      gstin: data.role === 'buyer' ? data.gstin : undefined,
      aadharNumber: data.role === 'farmer' ? data.aadhaarNumber : undefined,
      farmerName: data.role === 'farmer' ? data.name : undefined,
      transporterCompanyName: data.role === 'transporter' ? data.name : undefined,
      transporterGstin: data.role === 'transporter' ? data.gstin : undefined,
      drivingLicense: data.role === 'transporter' ? data.drivingLicense : undefined,
    })

    await logAudit({ userId: user._id.toString(), action: 'CREATE', resource: 'User', resourceId: user._id.toString(), details: { role: data.role, email: data.email }, request })

    return apiSuccess({ userId: user._id.toString() }, undefined, 201)
  } catch (error: unknown) {
    console.error('Registration error:', error)
    const message = error instanceof Error ? error.message : 'Registration failed'
    return apiError(ErrorCodes.INTERNAL_ERROR, message)
  }
}