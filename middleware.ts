/**
 * Middleware: security headers, CORS, request ID, request logging.
 *
 * Runs on every request.  Order matters:
 * 1. Inject X-Request-Id (or forward from upstream)
 * 2. Log request
 * 3. Apply CORS
 * 4. Apply security headers (HSTS, CSP, etc.)
 * 5. Let the request continue
 *
 * NOTE: Runs in Edge Runtime — no Node.js modules (crypto, fs, etc.)
 */

import { NextRequest, NextResponse } from 'next/server'

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
    "frame-src 'self' https://checkout.razorpay.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com",
    "connect-src 'self' https://api.cloudinary.com https://api.razorpay.com https://api.twilio.com https://www.fast2sms.com",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "media-src 'self' blob: https://res.cloudinary.com",
  ].join('; '),
}

function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin') || ''
  const isDev = process.env.NODE_ENV !== 'production'
  const corsRaw = process.env.CORS_ORIGINS || ''
  const allowedOrigins = corsRaw ? corsRaw.split(',').map(s => s.trim()).filter(Boolean) : []

  // In development, allow all origins
  const isAllowed = isDev || allowedOrigins.length === 0 || allowedOrigins.includes(origin)

  if (isAllowed && origin) {
    response.headers.set('Access-Control-Allow-Origin', origin)
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', [
      'Content-Type',
      'Authorization',
      'X-Request-Id',
    ].join(', '))
    response.headers.set('Access-Control-Max-Age', '86400')
  }

  return response
}

/** Generate a pseudo-unique request ID without Node.js crypto (Edge-compatible) */
function generateRequestId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 10)
  return `${timestamp}-${random}`
}

export function middleware(request: NextRequest) {
  const start = performance.now()
  const requestId = request.headers.get('x-request-id') || generateRequestId()
  const url = request.nextUrl

  const response = NextResponse.next()

  // ── Request ID ──────────────────────────────────────────────────
  response.headers.set('X-Request-Id', requestId)

  // ── Security headers ────────────────────────────────────────────
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  // ── CORS ────────────────────────────────────────────────────────
  applyCors(request, response)

  // ── Request logging (non-static routes only) ───────────────────
  const isStatic = url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname === '/favicon.ico'

  if (!isStatic) {
    const duration = performance.now() - start
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'request',
        method: request.method,
        path: url.pathname,
        requestId,
        userAgent: request.headers.get('user-agent') || '',
        ip: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown',
        duration: `${duration.toFixed(2)}ms`,
      })
    )
  }

  return response
}

// Next.js requires this exact export name for middleware matcher config
// eslint-disable-next-line no-redeclare
export const config = {
  matcher: ['/((?!_next/static|_next/image|icons/|favicon.ico).*)'],
}