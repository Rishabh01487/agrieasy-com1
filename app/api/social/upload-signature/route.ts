import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'

// SECURITY: explicit format allowlists prevent SVG / HTML / PDF upload
// (stored-XSS vector). Cloudinary's signed-upload treats signed params
// as authoritative — these cannot be tampered with by the client.
const IMAGE_FORMATS = 'jpg,jpeg,png,webp,gif'
const VIDEO_FORMATS = 'mp4,webm,mov'

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

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'agrieasy'

    // SECURITY: support both image (default) and video (clips) uploads.
    // The client picks `?kind=image|video` per file. Both kinds bind
    // resource_type + allowed_formats in the signature to prevent format
    // tampering (e.g. SVG upload via the image endpoint → stored XSS).
    const { searchParams } = new URL(request.url)
    const kind = searchParams.get('kind') === 'video' ? 'video' : 'image'
    const resourceType = kind
    const allowedFormats = kind === 'video' ? VIDEO_FORMATS : IMAGE_FORMATS

    // SECURITY: every parameter that affects storage / format / rendering
    // is included in the signature. Cloudinary rejects uploads where the
    // signed params don't match the upload request exactly. This blocks
    // SVG / HTML / PDF upload via the image endpoint (stored XSS vector).
    //
    // SECURITY: upload is always signed — `unsigned: true` is NEVER set.
    // Unsigned uploads would bypass the allowlist entirely.
    const paramsToSign = {
      timestamp,
      folder,
      resource_type: resourceType,
      allowed_formats: allowedFormats,
    }
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

    return NextResponse.json({
      available: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,  // Required by the browser upload form
      signature,
      timestamp,
      folder,
      // SECURITY: client MUST forward these to Cloudinary in the upload
      // form — otherwise Cloudinary rejects with "Invalid Signature".
      resourceType,
      allowedFormats,
    })
  } catch {
    return NextResponse.json({ available: false, error: 'Signature generation failed' })
  }
}
