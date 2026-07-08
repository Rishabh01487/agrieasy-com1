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
    const params = {
      timestamp,
      folder,
      allowed_formats: 'jpg,jpeg,png,webp,gif,mp4',
      max_file_size: 10485760, // 10MB
    }
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET)

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
