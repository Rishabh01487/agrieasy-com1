/**
 * CSRF Protection — double-submit cookie pattern.
 *
 * How it works:
 * 1. On every page load, the browser gets a `csrf_token` cookie (random hex).
 * 2. The frontend reads this cookie and sends it as an `X-CSRF-Token` header
 *    on every state-changing request (POST/PUT/PATCH/DELETE).
 * 3. The server checks that the header matches the cookie.
 *
 * Why this works:
 * - An attacker on `evil.com` can make the victim's browser SEND the cookie
 *   (because cookies auto-attach), but they CANNOT READ the cookie value
 *   (same-origin policy). So they can't set the matching `X-CSRF-Token` header.
 *
 * Usage in API routes:
 *   import { verifyCsrf } from '@/lib/csrf'
 *   if (!verifyCsrf(request)) return NextResponse.json({error:'CSRF'}, {status:403})
 */

import { NextRequest, NextResponse } from 'next/server'

const COOKIE_NAME = 'csrf_token'
const HEADER_NAME = 'x-csrf-token'

/** Generate a random CSRF token (32 bytes = 64 hex chars). */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Set the CSRF cookie on a response if it doesn't already exist.
 * Called from middleware on every request.
 */
export function ensureCsrfCookie(request: NextRequest, response: NextResponse): NextResponse {
  const existing = request.cookies.get(COOKIE_NAME)?.value
  if (!existing) {
    const token = generateCsrfToken()
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: false, // MUST be readable by frontend JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
  }
  return response
}

/**
 * Verify the CSRF token for state-changing requests.
 * Returns true if valid, false if the request should be rejected.
 *
 * Call this at the top of every POST/PUT/PATCH/DELETE API route.
 */
export function verifyCsrf(request: NextRequest): boolean {
  const cookieToken = request.cookies.get(COOKIE_NAME)?.value
  const headerToken = request.headers.get(HEADER_NAME)

  if (!cookieToken || !headerToken) {
    return false
  }

  // Constant-time comparison to prevent timing attacks
  if (cookieToken.length !== headerToken.length) {
    return false
  }

  let match = true
  for (let i = 0; i < cookieToken.length; i++) {
    if (cookieToken[i] !== headerToken[i]) {
      match = false
    }
  }
  return match
}

/**
 * Wrap a POST/PUT/PATCH/DELETE handler with CSRF protection.
 * Usage:
 *   export async function POST(request: NextRequest) {
 *     if (!verifyCsrf(request)) return NextResponse.json({error:'CSRF token invalid'}, {status:403})
 *     // ... your handler code
 *   }
 */
export function csrfGuard(request: NextRequest): NextResponse | null {
  if (!verifyCsrf(request)) {
    return NextResponse.json(
      { error: 'CSRF token invalid or missing' },
      { status: 403 }
    )
  }
  return null
}
