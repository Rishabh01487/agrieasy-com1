import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import jwt from 'jsonwebtoken'
import { rateLimitByIp } from '@/lib/rate-limit'
import { verifyOtp } from '@/lib/otp'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
  const rl = rateLimitByIp(request, { windowMs: 60_000, max: 5, message: 'Too many attempts. Try again in a minute.' })
  if (rl) return rl

  try {
    await dbConnect()
    const { phone, otp } = await request.json()
    if (!phone || !otp) return NextResponse.json({ error: 'Phone and OTP required' }, { status: 400 })

    if (!verifyOtp(phone, otp)) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    const user = await User.findOne({ phone })
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const secret = process.env.JWT_SECRET
    if (!secret || secret === 'your-secret-key') {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
    }

    const payload = { userId: user._id.toString(), email: user.email, role: user.role }
    const token = jwt.sign(payload, secret, { expiresIn: '7d' })

    const response = NextResponse.json({
      success: true,
      token,
      user: { id: user._id, email: user.email, phone: user.phone, role: user.role },
    })

    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    })

    await logAudit({ userId: user._id.toString(), action: 'LOGIN', resource: 'User', resourceId: user._id.toString(), details: { method: 'otp', role: user.role }, request })

    return response
  } catch (error: unknown) {
    console.error('Verify OTP error:', error)
    const message = error instanceof Error ? error.message : 'Verification failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
