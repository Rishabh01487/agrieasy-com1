import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export interface AuthUser {
  userId: string
  email: string
  role: string
  tokenVersion?: number
}

function getSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s || s === 'your-secret-key') {
    throw new Error('JWT_SECRET must be set to a strong random string')
  }
  return s
}

/**
 * Synchronous token verification — checks signature + expiry + algorithm.
 * Does NOT check tokenVersion (that requires a DB lookup).
 * Use this for endpoints where token revocation is not critical
 * (e.g., reading public data, social feed).
 */
export function authenticateRequest(req: NextRequest, allowedRoles?: string[]): { user: AuthUser; roleMatch: boolean } | null {
  const authHeader = req.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) token = req.cookies.get('token')?.value || null
  if (!token) return null

  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as AuthUser
    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return { user: payload, roleMatch: false }
    }
    return { user: payload, roleMatch: true }
  } catch {
    return null
  }
}

/**
 * Async token verification — checks signature + expiry + algorithm +
 * tokenVersion against the database. Use this for sensitive endpoints
 * (wallet, transfers, bank verification, admin actions) where token
 * revocation is critical.
 *
 * If the user's tokenVersion in the DB doesn't match the one in the JWT,
 * the token is considered revoked (e.g., user logged out or changed
 * password) and the function returns null.
 */
export async function authenticateRequestAsync(req: NextRequest, allowedRoles?: string[]): Promise<{ user: AuthUser; roleMatch: boolean } | null> {
  const authHeader = req.headers.get('authorization')
  let token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!token) token = req.cookies.get('token')?.value || null
  if (!token) return null

  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ['HS256'] }) as any

    // HIGH-2 FIX: Verify tokenVersion against the database.
    // If tokenVersion was incremented (via logout or password change),
    // the JWT is revoked.
    if (payload.tokenVersion !== undefined) {
      const dbConnect = (await import('@/lib/mongodb')).default
      const User = (await import('@/lib/models/User')).default
      await dbConnect()
      const user = await User.findById(payload.userId).select('tokenVersion').lean()
      if (!user || user.tokenVersion !== payload.tokenVersion) {
        return null  // Token has been revoked
      }
    }

    if (allowedRoles && !allowedRoles.includes(payload.role)) {
      return { user: payload as AuthUser, roleMatch: false }
    }
    return { user: payload as AuthUser, roleMatch: true }
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
