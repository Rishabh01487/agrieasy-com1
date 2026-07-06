import { NextResponse } from 'next/server'
import { config } from '@/lib/config'

/**
 * Health check endpoint for load balancers and monitoring.
 *
 * - Liveness: 200 if the server process is running
 * - Readiness: checks all dependencies (MongoDB, Redis, Razorpay config)
 *
 * GET /api/health        → basic liveness
 * GET /api/health?deep=1 → full readiness with dependency checks
 */

export async function GET(request: Request) {
  const url = new URL(request.url)
  const deep = url.searchParams.has('deep')

  const checks: Record<string, { status: 'up' | 'down' | 'degraded'; latencyMs?: number; detail?: string }> = {}

  // ── MongoDB ─────────────────────────────────────────────────────
  if (deep) {
    try {
      const start = performance.now()
      const dbConnect = (await import('@/lib/mongodb')).default
      const mongoose = await dbConnect()
      await mongoose.connection.db?.admin().ping()
      checks.mongodb = { status: 'up', latencyMs: Math.round(performance.now() - start) }
    } catch (e) {
      checks.mongodb = { status: 'down', detail: e instanceof Error ? e.message : 'Connection failed' }
    }
  } else {
    checks.mongodb = { status: 'up' } // Assume up if not deep-checking
  }

  // ── Redis (Upstash) ─────────────────────────────────────────────
  if (deep) {
    try {
      const start = performance.now()
      const { Redis } = await import('@upstash/redis')
      const redis = new Redis({
        url: config.env.UPSTASH_REDIS_REST_URL || '',
        token: config.env.UPSTASH_REDIS_REST_TOKEN || '',
      })
      await redis.ping()
      checks.redis = { status: 'up', latencyMs: Math.round(performance.now() - start) }
    } catch {
      checks.redis = { status: 'degraded', detail: 'Not configured or unreachable' }
    }
  } else {
    checks.redis = config.env.UPSTASH_REDIS_REST_URL
      ? { status: 'up' }
      : { status: 'degraded', detail: 'Not configured (UPSTASH_REDIS_REST_URL missing)' }
  }

  // ── Razorpay ────────────────────────────────────────────────────
  checks.razorpay = config.env.RAZORPAY_KEY_ID
    ? { status: 'up' }
    : { status: 'degraded', detail: 'Not configured (RAZORPAY_KEY_ID missing)' }

  // ── Cloudinary ──────────────────────────────────────────────────
  checks.cloudinary = config.env.CLOUDINARY_CLOUD_NAME
    ? { status: 'up' }
    : { status: 'degraded', detail: 'Not configured (CLOUDINARY_CLOUD_NAME missing)' }

  // ── SMS ─────────────────────────────────────────────────────────
  checks.sms = config.env.SMS_PROVIDER
    ? { status: 'up' }
    : { status: 'degraded', detail: 'No SMS provider configured' }

  // ── Overall status ──────────────────────────────────────────────
  const allStatuses = Object.values(checks).map(c => c.status)
  const hasDown = allStatuses.includes('down')
  const overall = hasDown ? 'unhealthy' : allStatuses.includes('degraded') ? 'degraded' : 'healthy'

  return NextResponse.json({
    status: overall,
    version: process.env.npm_package_version || '0.1.0',
    environment: config.env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    ...(deep ? { checks } : {}),
  }, {
    status: hasDown ? 503 : 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  })
}