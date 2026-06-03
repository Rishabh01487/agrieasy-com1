import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  userId: string
  email: string
  role: string
}

function getSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s || s === 'your-secret-key') {
    throw new Error('JWT_SECRET must be set to a strong random string')
  }
  return s
}

export function authenticateRequest(req: NextRequest, allowedRoles?: string[]): AuthUser | null {
  const authHeader = req.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) token = req.cookies.get('token')?.value || null
  if (!token) return null

  try {
    const payload = jwt.verify(token, getSecret()) as AuthUser
    if (allowedRoles && !allowedRoles.includes(payload.role)) return null
    return payload
  } catch {
    return null
  }
}

export function unauthorized(message = 'Authentication required'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Insufficient permissions'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}
