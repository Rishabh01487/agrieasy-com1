import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  // Rate limit: signature generation is a precursor to uploads — prevent
  // spamming Cloudinary signature generation.
  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 30, message: 'Too many upload requests. Slow down.' })
  if (rl) return rl

  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ available: false, error: 'Cloudinary not configured' })
    }

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    })

    const timestamp = Math.round(Date.now() / 1000)
    const folder = 'agrieasy'

    // CRITICAL: The signature must be computed over EXACTLY the parameters
    // that the browser will send in the upload form — no more, no less.
    // Cloudinary validates that every signed parameter is present in the
    // upload AND that every upload parameter (except file, api_key, signature,
    // resource_type, and a few others) is included in the signature. If they
    // don't match exactly, Cloudinary returns "Invalid Signature" with the
    // string that was signed.
    //
    // The create page sends: api_key, timestamp, signature, folder
    // (api_key, signature, and resource_type are excluded from signing by
    //  Cloudinary's spec — only timestamp and folder need to be signed here)
    const paramsToSign = {
      timestamp,
      folder,
    }
    const signature = cloudinary.utils.api_sign_request(paramsToSign, process.env.CLOUDINARY_API_SECRET)

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
