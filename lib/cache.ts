/**
 * Redis caching utility with Upstash.
 *
 * Usage:
 *   import { cache } from '@/lib/cache'
 *   const data = await cache.get('key', async () => fetchData(), { ttl: 60 })
 *
 * - Returns cached value if fresh, otherwise calls fetcher and caches result.
 * - Automatically skips cache if Redis is not configured.
 * - Supports cache invalidation by key pattern.
 */

import { Redis } from '@upstash/redis'
import { config } from '@/lib/config'

let _redis: Redis | null | undefined

async function getRedis(): Promise<Redis | null> {
  if (_redis !== undefined) return _redis

  const url = config.env.UPSTASH_REDIS_REST_URL
  const token = config.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    _redis = new Redis({ url, token })
  } else {
    _redis = null
  }
  return _redis
}

export interface CacheOptions {
  /** TTL in seconds (default: 300) */
  ttl?: number
  /** Prefix for the key (default: 'cache') */
  prefix?: string
}

const DEFAULT_TTL = 300 // 5 minutes
const CACHE_PREFIX = 'agrieasy'

/**
 * Get a value from cache, or compute and cache it.
 * Returns null if Redis is not configured (falls through to fetcher).
 */
export async function get<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: CacheOptions = {},
): Promise<T | null> {
  const redis = await getRedis()
  if (!redis) return null // No cache available, let caller handle

  const fullKey = `${CACHE_PREFIX}:${options.prefix || 'cache'}:${key}`

  try {
    const cached = await redis.get<string>(fullKey)
    if (cached !== null) {
      return JSON.parse(cached) as T
    }
  } catch (e) {
    console.error(JSON.stringify({ level: 'warn', msg: 'cache_get_error', key, err: String(e) }))
  }

  // Cache miss — call fetcher
  const data = await fetcher()

  try {
    await redis.set(fullKey, JSON.stringify(data), { ex: options.ttl || DEFAULT_TTL })
  } catch (e) {
    console.error(JSON.stringify({ level: 'warn', msg: 'cache_set_error', key, err: String(e) }))
  }

  return data
}

/**
 * Invalidate a specific cache key.
 */
export async function invalidate(key: string, prefix = 'cache'): Promise<void> {
  const redis = await getRedis()
  if (!redis) return
  const fullKey = `${CACHE_PREFIX}:${prefix}:${key}`
  try {
    await redis.del(fullKey)
  } catch (e) {
    console.error(JSON.stringify({ level: 'warn', msg: 'cache_invalidate_error', key, err: String(e) }))
  }
}

/**
 * Invalidate all cache entries matching a prefix pattern.
 * Use sparingly — scans keys.
 */
export async function invalidateByPrefix(prefix: string): Promise<void> {
  const redis = await getRedis()
  if (!redis) return
  try {
    const scanPrefix = `${CACHE_PREFIX}:${prefix}:*`
    let cursor = '0'
    do {
      const result = await redis.scan(cursor, { match: scanPrefix, count: 100 })
      cursor = result[0]
      const keys = result[1]
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } while (cursor !== '0')
  } catch (e) {
    console.error(JSON.stringify({ level: 'warn', msg: 'cache_invalidate_prefix_error', prefix, err: String(e) }))
  }
}