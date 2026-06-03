import { NextRequest, NextResponse } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 5, message: 'Too many uploads. Try again later.' })
  if (rl) return rl

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    if (process.env.CLOUDINARY_CLOUD_NAME) {
      return new Promise<NextResponse>((resolve) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'agrieasy',
            resource_type: file.type.startsWith('video') ? 'video' : 'image',
          },
          (error, result) => {
            if (error || !result) {
              resolve(NextResponse.json({ error: 'Upload to cloud failed' }, { status: 500 }))
            } else {
              resolve(NextResponse.json({ url: result.secure_url }))
            }
          }
        )
        uploadStream.end(buffer)
      })
    }

    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type || 'image/jpeg'};base64,${base64}`
    return NextResponse.json({ url: dataUrl })
  } catch {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
