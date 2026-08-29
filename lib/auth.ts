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

export function authenticateRequest(req: NextRequest, allowedRoles?: string[]): { user: AuthUser; roleMatch: boolean } | null {
  const authHeader = req.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) token = req.cookies.get('token')?.value || null
  if (!token) return null

  try {
    // SECURITY: pin JWT algorithm to HS256. Without this option, jsonwebtoken
    // accepts any algorithm (HS256/HS384/HS512/RS256/ES256/none) signed with
    // the same key — classic algorithm-confusion attack (an attacker signs
    // a token with RS256 using the RSA public key as the HMAC secret).
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as AuthUser
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return { user: payload, roleMatch: false }
    }
    return { user: payload, roleMatch: true }
  } catch {
    return null
  }
}

export function getUser(auth: NonNullable<ReturnType<typeof authenticateRequest>>): AuthUser {
  return auth.user
}

export function unauthorized(message = 'Authentication required'): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Insufficient permissions'): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 })
}