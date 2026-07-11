import dbConnect, { isDatabaseHealthy } from '@/lib/mongodb'
import { get as cacheGet } from '@/lib/cache'
import { NextResponse } from 'next/server'

/**
 * Graceful degradation wrapper for API route handlers.
 *
 * When the database circuit breaker is open (too many connection failures),
 * instead of crashing, the API returns:
 *   1. Cached data if available (from Upstash Redis)
 *   2. A 503 with a clear error message if no cache exists
 *
 * Usage:
 *   export const GET = withGracefulDegradation(async (req) => {
 *     await dbConnect()
 *     const data = await Model.find()
 *     return NextResponse.json({ data })
 *   }, { cacheKey: 'listings', cachePrefix: 'listings', ttl: 60 })
 */
export function withGracefulDegradation(
  handler: (request: Request) => Promise<NextResponse>,
  options: {
    cacheKey?: (request: Request) => string
    cachePrefix?: string
    ttl?: number
  } = {},
) {
  return async (request: Request): Promise<NextResponse> => {
    if (!isDatabaseHealthy()) {
      if (options.cacheKey) {
        const key = options.cacheKey(request)
        const cached = await cacheGet<unknown>(key, async () => null, {
          ttl: options.ttl || 300,
          prefix: options.cachePrefix || 'degraded',
        }).catch(() => null)

        if (cached) {
          return NextResponse.json({
            success: true,
            data: cached,
            degraded: true,
            message: 'Database temporarily unavailable — serving cached data',
          })
        }
      }

      return NextResponse.json({
        success: false,
        error: {
          code: 'SERVICE_DEGRADED',
          message: 'Database temporarily unavailable. Please try again in a few moments.',
        },
        degraded: true,
      }, { status: 503 })
    }

    try {
      return await handler(request)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)

      if (msg.includes('circuit breaker') || msg.includes('ECONNREFUSED') || msg.includes('timed out')) {
        return NextResponse.json({
          success: false,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed. Please retry.',
          },
          degraded: true,
        }, { status: 503 })
      }

      throw err
    }
  }
}

/**
 * Ensures database connection with graceful fallback.
 * Use in API routes that can tolerate missing DB (e.g. read-only endpoints
 * that have a cache layer).
 */
export async function safeDbConnect(): Promise<boolean> {
  try {
    await dbConnect()
    return true
  } catch {
    return false
  }
}
