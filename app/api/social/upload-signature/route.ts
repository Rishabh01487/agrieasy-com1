import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
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

    // Only sign timestamp + folder — Cloudinary's signed upload API
    // validates that these params match. Including resource_type and
    // allowed_formats in the signature caused "Invalid Signature" errors
    // because Cloudinary treats them differently in the upload form
    // vs the signature generation.
    const paramsToSign = { timestamp, folder }
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

    return NextResponse.json({
      available: true,
      cloudName,
      apiKey,
      signature,
      timestamp,
      folder,
      resourceType: kind,
    })
  } catch {
    return NextResponse.json({ available: false, error: 'Signature generation failed' })
  }
}
