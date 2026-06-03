import { NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'

export async function GET() {
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
    const params = { timestamp, folder }
    const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET)

    return NextResponse.json({
      available: true,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      signature,
      timestamp,
      folder,
    })
  } catch {
    return NextResponse.json({ available: false, error: 'Signature generation failed' })
  }
}
