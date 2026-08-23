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
      return NextResponse.json({
        available: false,
        error: 'Cloudinary not configured',
        debug: {
          hasCloudName: !!cloudName,
          hasApiKey: !!apiKey,
          hasApiSecret: !!apiSecret,
          hint: !cloudName ? 'CLOUDINARY_CLOUD_NAME missing'
               : !apiKey ? 'CLOUDINARY_API_KEY missing'
               : 'CLOUDINARY_API_SECRET missing',
        },
      })
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'agrieasy'

    // that the browser will send in the upload form — no more, no less.
    // Cloudinary validates that every signed parameter is present in the
    // upload AND that every upload parameter (except file, api_key, signature,
    // resource_type, and a few others) is included in the signature. If they
    // don't match exactly, Cloudinary returns "Invalid Signature" with the
    // string that was signed.
    //
    // The create page sends: api_key, timestamp, signature, folder
    const paramsToSign = {
      timestamp,
      folder,
    }
    const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

    return NextResponse.json({
      available: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,  // Required by the browser upload form
      signature,
      timestamp,
      folder,
    })
  } catch {
    return NextResponse.json({ available: false, error: 'Signature generation failed' })
  }
}
