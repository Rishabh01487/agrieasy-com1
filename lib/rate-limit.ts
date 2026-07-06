/**
 * Rate limiter with Upstash Redis primary + in-memory fallback.
 *
 * Uses a sliding-window counter stored in Redis.  Works across
 * Vercel serverless instances when UPSTASH_REDIS_REST_URL is set.
 * Falls back to an in-memory Map for local development.
 */

import { NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

// ── Redis client (shared lazy singleton) ───────────────────────────
let _redis: Redis | null | undefined

async function getRedis(): Promise<Redis | null> {
  if (_redis !== undefined) return _redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    _redis = new Redis({ url, token })
    console.log('[rate-limit] Upstash Redis client initialized')
  } else {
    _redis = null
    console.warn('[rate-limit] UPSTASH_REDIS_REST_URL/TOKEN not set — using in-memory fallback (not safe for serverless)')
  }
  return _redis
}

// ── In-memory fallback ─────────────────────────────────────────────
const stores = new Map<string, number[]>()

function pruneTimestamps(timestamps: number[], windowMs: number): number[] {
  const cutoff = Date.now() - windowMs
  return timestamps.filter(t => t > cutoff)
}

// ── Types ──────────────────────────────────────────────────────────

interface RateLimitConfig {
  windowMs: number
  max: number
  message?: string
  statusCode?: number
}

// ── Helpers ────────────────────────────────────────────────────────

function getIp(req: { headers: { get: (name: string) => string | null } }): string {
  return (req.headers.get('x-forwarded-for')?.split(',')[0]?.trim())
    || req.headers.get('x-real-ip')
    || '127.0.0.1'
}

// ── Redis sliding-window check ─────────────────────────────────────
async function checkLimitRedis(key: string, config: RateLimitConfig): Promise<{ allowed: boolean; remaining: number }> {
  const redis = await getRedis()
  if (!redis) return { allowed: false, remaining: 0 }

  const windowKey = `rl:${key}`
  const now = Date.now()
  const windowStart = now - config.windowMs

  // Use a sorted-set-free approach: store a JSON list with a TTL
  // This is simpler and works well with Upstash REST
  const pipeline = redis.pipeline()

  // Get current entries
  const raw: string | null = await redis.get(windowKey)
  let timestamps: number[] = raw ? JSON.parse(raw) : []

  // Prune expired
  timestamps = timestamps.filter((t: number) => t > windowStart)

  const remaining = Math.max(0, config.max - timestamps.length)

  if (timestamps.length >= config.max) {
    return { allowed: false, remaining: 0 }
  }

  // Add current request and store back
  timestamps.push(now)
  const ttlSeconds = Math.ceil(config.windowMs / 1000) + 1
  await redis.set(windowKey, JSON.stringify(timestamps), { ex: ttlSeconds })

  return { allowed: true, remaining: Math.max(0, config.max - timestamps.length) }
}

// ── In-memory check ────────────────────────────────────────────────
function checkLimitMemory(key: string, config: RateLimitConfig): { allowed: boolean; remaining: number } {
  const now = Date.now()
  let timestamps = stores.get(key) || []
  timestamps = pruneTimestamps(timestamps, config.windowMs)

  const remaining = Math.max(0, config.max - timestamps.length)

  if (timestamps.length >= config.max) {
    return { allowed: false, remaining: 0 }
  }

  timestamps.push(now)
  stores.set(key, timestamps)
  return { allowed: true, remaining: Math.max(0, config.max - timestamps.length) }
}

// ── Public API ─────────────────────────────────────────────────────

/**
 * Rate limit by IP address.  Returns a 429 NextResponse if limit exceeded, null otherwise.
 * Now async — callers must await.
 */
export async function rateLimitByIp(req: globalThis.Request, config: RateLimitConfig): Promise<NextResponse | null> {
  const key = `ip:${getIp(req)}`
  return checkLimit(key, config)
}

/**
 * Rate limit by userId.  Returns a 429 NextResponse if limit exceeded, null otherwise.
 */
export async function rateLimitByUser(userId: string, config: RateLimitConfig): Promise<NextResponse | null> {
  const key = `user:${userId}`
  return checkLimit(key, config)
}

async function checkLimit(key: string, config: RateLimitConfig): Promise<NextResponse | null> {
  const redis = await getRedis()

  let result: { allowed: boolean; remaining: number }

  if (redis) {
    result = await checkLimitRedis(key, config)
  } else {
    result = checkLimitMemory(key, config)
  }

  if (!result.allowed) {
    return NextResponse.json(
      { error: config.message || 'Too many requests. Please try again later.' },
      {
        status: config.statusCode || 429,
        headers: {
          'X-RateLimit-Limit': String(config.max),
          'X-RateLimit-Remaining': '0',
          'Retry-After': String(Math.ceil(config.windowMs / 1000)),
        },
      }
    )
  }

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