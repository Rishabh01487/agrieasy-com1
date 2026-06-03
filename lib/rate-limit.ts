import { NextRequest, NextResponse } from 'next/server'

interface RateLimitConfig {
  windowMs: number
  max: number
  message?: string
  statusCode?: number
}

const stores = new Map<string, number[]>()

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || '127.0.0.1'
}

function pruneTimestamps(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs
  return timestamps.filter(t => t > cutoff)
}

export function rateLimitByIp(req: NextRequest, config: RateLimitConfig): NextResponse | null {
  const key = `ip:${getIp(req)}`
  return checkLimit(key, config)
}

export function rateLimitByUser(userId: string, config: RateLimitConfig): NextResponse | null {
  const key = `user:${userId}`
  return checkLimit(key, config)
}

function checkLimit(key: string, config: RateLimitConfig): NextResponse | null {
  const now = Date.now()
  let timestamps = stores.get(key) || []

  timestamps = pruneTimestamps(timestamps, config.windowMs)

  if (timestamps.length >= config.max) {
    return NextResponse.json(
      { error: config.message || 'Too many requests. Please try again later.' },
      { status: config.statusCode || 429 }
    )
  }

  timestamps.push(now)
  stores.set(key, timestamps)
  return null
}

export function getRateLimitHeaders(key: string, config: RateLimitConfig): Record<string, string> {
  const timestamps = pruneTimestamps(stores.get(key) || [], config.windowMs)
  return {
    'X-RateLimit-Limit': String(config.max),
    'X-RateLimit-Remaining': String(Math.max(0, config.max - timestamps.length)),
    'X-RateLimit-Reset': String(Math.ceil((Date.now() + config.windowMs) / 1000)),
  }
}
