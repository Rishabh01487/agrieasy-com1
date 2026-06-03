import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import * as bcryptModule from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { logAudit } from '@/lib/audit'
import { rateLimitByIp } from '@/lib/rate-limit'

const bcrypt = (bcryptModule as any).default || bcryptModule

export async function POST(request: NextRequest) {
  try {
    const rl = rateLimitByIp(request, { windowMs: 60_000, max: 5, message: 'Too many login attempts. Try again in a minute.' })
    if (rl) return rl

    await dbConnect()
    const { identifier, password } = await request.json()

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const user = await User.findOne({ $or: [{ email: identifier }, { phone: identifier }] })
    if (!user) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })

    const secret = process.env.JWT_SECRET
    if (!secret || secret === 'your-secret-key') {
      return NextResponse.json({ error: 'Server misconfigured: JWT_SECRET not set' }, { status: 500 })
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

    await logAudit({ userId: user._id.toString(), action: 'LOGIN', resource: 'User', resourceId: user._id.toString(), details: { role: user.role }, request })

    return response
  } catch (error: unknown) {
    console.error('Login error:', error)
    const message = error instanceof Error ? error.message : 'Login failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

