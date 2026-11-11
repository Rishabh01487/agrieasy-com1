import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { randomBytes } from 'crypto'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'
import { loadR2Config, generateR2UploadUrl } from '@/lib/r2'

/**
 * GET /api/social/upload-signature?kind=image|video
 *
 * Returns either an R2 presigned PUT URL (preferred) or a legacy
 * Cloudinary signature (fallback when R2 env vars aren't set).
 *
 * The client distinguishes the two via the `provider` field:
 *   - provider === 'r2'        → PUT the file to `uploadUrl`, then use
 *                                 `publicUrl` as the stored URL.
 *   - provider === 'cloudinary' → POST FormData to api.cloudinary.com
 *                                 (legacy path — see lib/upload-client.ts).
 *
 * Both paths return a server-derived object key / public_id so the
 * client cannot choose it (prevents cross-user asset overwrite).
 */
export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 30, message: 'Too many upload requests. Slow down.' })
  if (rl) return rl

  const { searchParams } = new URL(request.url)
  const kindParam = searchParams.get('kind')
  const kind: 'image' | 'video' | 'audio' =
    kindParam === 'video' ? 'video' :
    kindParam === 'audio' ? 'audio' : 'image'

  // The client sends the file's MIME type so we can set the correct
  // Content-Type on the R2 object (and derive the right file extension).
  const contentType = searchParams.get('contentType') || undefined

  // ── Preferred: R2 presigned URL ──────────────────────────────────
  const r2Config = loadR2Config()
  if (r2Config) {
    try {
      const r2 = await generateR2UploadUrl(r2Config, auth.user.userId, { kind, contentType })
      return NextResponse.json({
        available: true,
        provider: 'r2',
        uploadUrl: r2.uploadUrl,
        publicUrl: r2.publicUrl,
        key: r2.key,
        contentType: r2.contentType,
      })
    } catch (error) {
      console.error('[upload-signature] R2 presign failed:', error)
      // Fall through to Cloudinary if R2 fails at runtime
    }
  }

  // ── Fallback: legacy Cloudinary signature ────────────────────────
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({
        available: false,
        error: 'Media storage not configured. Set R2_* or CLOUDINARY_* env vars.',
      })
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })

    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'agrieasy'
    const safeUserId = String(auth.user.userId).replace(/[^a-zA-Z0-9_-]/g, '_')
    const publicId = `${safeUserId}_${timestamp}_${randomBytes(4).toString('hex')}`

    const paramsToSign = { timestamp, folder, public_id: publicId }
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

    return NextResponse.json({
      available: true,
      provider: 'cloudinary',
      cloudName,
      apiKey,
      signature,
      timestamp,
      folder,
      resourceType: kind === 'audio' ? 'auto' : kind,
      public_id: publicId,
    })
  } catch {
    return NextResponse.json({ available: false, error: 'Signature generation failed' })
  }
}
