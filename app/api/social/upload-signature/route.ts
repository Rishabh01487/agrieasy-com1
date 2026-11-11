import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { randomBytes } from 'crypto'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 30, message: 'Too many upload requests. Slow down.' })
  if (rl) return rl

  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME
    const apiKey = process.env.CLOUDINARY_API_KEY
    const apiSecret = process.env.CLOUDINARY_API_SECRET

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json({ available: false, error: 'Cloudinary not configured' })
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret })

    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'agrieasy'

    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind') === 'video' ? 'video' : 'image'

    // SECURITY: Server-derived, per-user public_id.
    // The client cannot choose public_id, so a user cannot target another
    // user's asset for overwrite. We ignore any client-supplied value
    // (this is a GET endpoint, so there is none to read anyway) and bind
    // the signature to our own. The random suffix guarantees uniqueness,
    // which also eliminates the overwrite-your-own-pic vector entirely.
    // public_id charset is [A-Za-z0-9_-]; sanitize the userId defensively.
    const safeUserId = String(auth.user.userId).replace(/[^a-zA-Z0-9_-]/g, '_')
    const publicId = `${safeUserId}_${timestamp}_${randomBytes(4).toString('hex')}`

    // NOTE on format / size enforcement:
    // We deliberately do NOT sign `allowed_formats` or `max_file_size` here.
    // - `allowed_formats` would break audio uploads (kind=video → /auto/upload
    //   is also used for audio clips in the social create page).
    // - `max_file_size` is not a real Cloudinary upload param and would be
    //   silently ignored.
    // Format + size limits should be enforced via an upload preset configured
    // in the Cloudinary dashboard (account-level), not via the signature.
    // The actual security fix here is binding `public_id` server-side, which
    // closes the cross-user overwrite hole.
    const paramsToSign = {
      timestamp,
      folder,
      public_id: publicId,
    }
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

    return NextResponse.json({
      available: true,
      cloudName,
      apiKey,
      signature,
      timestamp,
      folder,
      resourceType: kind,
      // Signed param the client MUST forward verbatim to Cloudinary
      // (omitting or altering it => "Invalid Signature"):
      public_id: publicId,
    })
  } catch {
    return NextResponse.json({ available: false, error: 'Signature generation failed' })
  }
}
