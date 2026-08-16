/**
 * Next.js Instrumentation Hook
 *
 * Runs ONCE when the Next.js server starts (both `next dev` and `next start`).
 * We use this to pre-warm the MongoDB connection pool so the FIRST user
 * request doesn't have to wait 10-30 seconds for mongoose to establish
 * its connection.
 *
 * Without this, the first user to visit /agrisocial after server boot
 * sees a "Could not load posts" error because their request times out
 * before dbConnect() finishes. With this, the pool is already warm
 * by the time the first request arrives.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  // Only run on the server (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dbConnect = (await import('@/lib/mongodb')).default
    try {
      console.log('[instrumentation] Pre-warming MongoDB connection pool...')
      const mongoose = await dbConnect()
      const readyState = mongoose.connection.readyState
      console.log(`[instrumentation] MongoDB connection established (readyState=${readyState})`)
    } catch (err) {
      // Don't crash the server — the first request will retry via dbConnect()
      console.error('[instrumentation] MongoDB pre-warm failed:', err instanceof Error ? err.message : String(err))
      console.error('[instrumentation] The connection will be retried on the first request.')
    }
  }
}
