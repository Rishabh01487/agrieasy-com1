import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import jwt from 'jsonwebtoken'
import { rateLimitByIp } from '@/lib/rate-limit'
import { verifyOtp } from '@/lib/otp'
import { logAudit } from '@/lib/audit'
import { validateBody, verifyOtpSchema } from '@/lib/validation'
import { apiSuccess, validationError, badRequest, notFound, apiError, ErrorCodes } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  const rl = await rateLimitByIp(request, { windowMs: 60_000, max: 5, message: 'Too many attempts. Try again in a minute.' })
  if (rl) return rl

  try {
    await dbConnect()
    const body = await request.json()

    const v = validateBody(verifyOtpSchema, body)
    if (!v.success) return validationError('Invalid phone or OTP', v.errors)
    const data = v.data

    if (!(await verifyOtp(data.phone, data.otp))) {
      return badRequest('Invalid or expired OTP')
    }

    const user = await User.findOne({ phone: data.phone })
    if (!user) return notFound('User')

    const secret = process.env.JWT_SECRET
    if (!secret || secret === 'your-secret-key') {
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Server misconfigured')
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

    await logAudit({ userId: user._id.toString(), action: 'LOGIN', resource: 'User', resourceId: user._id.toString(), details: { method: 'otp', role: user.role }, request })

    return successBody
  } catch (error: unknown) {
    console.error('Verify OTP error:', error)
    const message = error instanceof Error ? error.message : 'Verification failed'
    return apiError(ErrorCodes.INTERNAL_ERROR, message)
  }
}