import { NextRequest, NextResponse } from 'next/server'

const SECURITY_HEADERS: Record<string, string> = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(self), microphone=(self), geolocation=(self)',
  'Content-Security-Policy': [
    "default-src 'self' upi: tez: phonepe: paytmmp: bhim: amzn:",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://unpkg.com",
    "frame-src 'self' https://checkout.razorpay.com",
    "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://*.tile.openstreetmap.org https://api.qrserver.com",
    "connect-src 'self' https://api.cloudinary.com https://api.razorpay.com https://api.twilio.com https://www.fast2sms.com https://nominatim.openstreetmap.org https://*.tile.openstreetmap.org https://unpkg.com https://internal-api.z.ai https://corsproxy.io https://api.allorigins.win https://generativelanguage.googleapis.com https://*.workers.dev",
    "style-src 'self' 'unsafe-inline' https://unpkg.com",
    "font-src 'self' data:",
    "media-src 'self' blob: https://res.cloudinary.com",
  ].join('; '),
}

function applyCors(request: NextRequest, response: NextResponse) {
  const origin = request.headers.get('origin') || ''
  const isDev = process.env.NODE_ENV !== 'production'
  const corsRaw = process.env.CORS_ORIGINS || ''
  const allowedOrigins = corsRaw ? corsRaw.split(',').map(s => s.trim()).filter(Boolean) : []

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

  response.headers.set('X-Request-Id', requestId)

  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value)
  }

  applyCors(request, response)

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

// eslint-disable-next-line no-redeclare
export const config = {
  matcher: ['/((?!_next/static|_next/image|icons/|favicon.ico).*)'],
}
