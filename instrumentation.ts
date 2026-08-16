/**
 * Next.js Instrumentation Hook
 *
 * Runs ONCE when the Next.js server starts (both `next dev` and `next start`).
 * We use this to pre-warm the MongoDB connection pool so the FIRST user
 * request doesn't have to wait for mongoose to establish its connection.
 *
 * This version RETRIES every 30 seconds until the connection succeeds —
 * so if MongoDB starts up AFTER the Next.js server (e.g. you started
 * `npm run dev` before `mongod`), the pool will still get pre-warmed
 * automatically once MongoDB becomes available.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */
export async function register() {
  // Only run on the server (not during build)
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dbConnect = (await import('@/lib/mongodb')).default

    const tryConnect = async (attempt: number): Promise<void> => {
      try {
        const mongoose = await dbConnect()
        const readyState = mongoose.connection.readyState
        if (readyState === 1) {
          console.log(`[instrumentation] MongoDB connection established (attempt ${attempt})`)
          return
        }
        throw new Error(`readyState=${readyState}`)
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        console.warn(`[instrumentation] MongoDB pre-warm attempt ${attempt} failed: ${msg}`)
        // Retry every 30 seconds until success. This handles the case where
        // MongoDB starts AFTER the Next.js server.
        setTimeout(() => tryConnect(attempt + 1).catch(() => {}), 30_000)
      }
    }

    console.log('[instrumentation] Pre-warming MongoDB connection pool...')
    tryConnect(1).catch(() => {})
  }
}
