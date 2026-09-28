import { verifyCsrf } from '@/lib/csrf'
import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import * as bcryptModule from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { logAudit } from '@/lib/audit'
import { rateLimitByIp, rateLimitByAccount } from '@/lib/rate-limit'
import { validateBody, loginSchema } from '@/lib/validation'
import { apiSuccess, validationError, apiError, ErrorCodes } from '@/lib/api-response'

const bcrypt = (bcryptModule as any).default || bcryptModule

export async function POST(request: NextRequest) {
    if (!verifyCsrf(request)) return NextResponse.json({ error: 'CSRF token invalid or missing' }, { status: 403 })
  try {
    console.log('[login] step 1: rate limit by IP')
    const rl = await rateLimitByIp(request, { windowMs: 60_000, max: 5, message: 'Too many login attempts. Try again in a minute.' })
    if (rl) return rl

    console.log('[login] step 2: db connect')
    await dbConnect()

    console.log('[login] step 3: parse body')
    let body: any = {}; try { body = await request.json() } catch { return validationError("Invalid login data", [{field: "phone", message: "Invalid input: expected string, received undefined"}, {field: "password", message: "Invalid input: expected string, received undefined"}]) }

    console.log('[login] step 4: validate')
    const v = validateBody(loginSchema, body)
    if (!v.success) return validationError('Invalid login data', v.errors)
    const data = v.data

    console.log('[login] step 5: rate limit by account')
    // Per-account rate limiting (prevents credential stuffing via rotating IPs)
    // 5 attempts per 15 minutes per account
    const accountRl = await rateLimitByAccount(data.phone, {
      windowMs: 15 * 60_000,
      max: 5,
      message: 'Too many login attempts for this account. Try again in 15 minutes.'
    })
    if (accountRl) return accountRl

    console.log('[login] step 6: find user')
    const user = await User.findOne({ $or: [{ email: data.phone }, { phone: data.phone }] })
    if (!user) return apiError(ErrorCodes.AUTH_REQUIRED, 'Invalid credentials')

    console.log('[login] step 7: compare password')
    const isPasswordValid = await bcrypt.compare(data.password, user.password)
    if (!isPasswordValid) return apiError(ErrorCodes.AUTH_REQUIRED, 'Invalid credentials')

    console.log('[login] step 8: jwt sign')
    const secret = process.env.JWT_SECRET
    if (!secret || secret === 'your-secret-key') {
      return apiError(ErrorCodes.INTERNAL_ERROR, 'Server misconfigured: JWT_SECRET not set')
    }

    const payload = { userId: user._id.toString(), email: user.email, role: user.role, tokenVersion: user.tokenVersion || 0 }
    const token = jwt.sign(payload, secret, { expiresIn: '7d' })

    console.log('[login] step 9: build response')
    const successBody = apiSuccess({
      token,
      user: { id: user._id.toString(), email: user.email, phone: user.phone, role: user.role },
    })

    console.log('[login] step 10: set cookie')
    try {
      successBody.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })
    } catch (cookieErr) {
      console.error('[login] Cookie set error:', cookieErr)
    }

    console.log('[login] step 11: audit log')
    try {
      await logAudit({ userId: user._id.toString(), action: 'LOGIN', resource: 'User', resourceId: user._id.toString(), details: { role: user.role }, request })
    } catch (auditErr) {
      console.error('[login] Audit log error:', auditErr)
    }

    console.log('[login] step 12: return success')
    return successBody
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    const errStack = error instanceof Error ? error.stack : 'no stack'
    console.error('[login] ERROR:', errMsg, errStack)
    return apiError(ErrorCodes.INTERNAL_ERROR, `Login error: ${errMsg}`)
  }
}