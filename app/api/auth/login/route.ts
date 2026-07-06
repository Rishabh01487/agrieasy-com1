import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import * as bcryptModule from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { logAudit } from '@/lib/audit'
import { rateLimitByIp } from '@/lib/rate-limit'
import { validateBody, loginSchema } from '@/lib/validation'
import { apiSuccess, validationError, apiError, ErrorCodes } from '@/lib/api-response'

const bcrypt = (bcryptModule as any).default || bcryptModule

export async function POST(request: NextRequest) {
  try {
    const rl = await rateLimitByIp(request, { windowMs: 60_000, max: 5, message: 'Too many login attempts. Try again in a minute.' })
    if (rl) return rl

    await dbConnect()
    const body = await request.json()

    const v = validateBody(loginSchema, body)
    if (!v.success) return validationError('Invalid login data', v.errors)
    const data = v.data

    const user = await User.findOne({ $or: [{ email: data.phone }, { phone: data.phone }] })
    if (!user) return apiError(ErrorCodes.AUTH_REQUIRED, 'Invalid credentials')

    const isPasswordValid = await bcrypt.compare(data.password, user.password)
    if (!isPasswordValid) return apiError(ErrorCodes.AUTH_REQUIRED, 'Invalid credentials')

    const secret = process.env.JWT_SECRET
    if (!secret || secret === 'your-secret-key') {
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Server misconfigured: JWT_SECRET not set')
    }

    const payload = { userId: user._id.toString(), email: user.email, role: user.role }
    const token = jwt.sign(payload, secret, { expiresIn: '7d' })

    const successBody = apiSuccess({
      token,
      user: { id: user._id.toString(), email: user.email, phone: user.phone, role: user.role },
    })

    successBody.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    await logAudit({ userId: user._id.toString(), action: 'LOGIN', resource: 'User', resourceId: user._id.toString(), details: { role: user.role }, request })

    return successBody
  } catch (error: unknown) {
    console.error('Login error:', error)
    const message = error instanceof Error ? error.message : 'Login failed'
    return apiError(ErrorCodes.INTERNAL_ERROR, message)
  }
}