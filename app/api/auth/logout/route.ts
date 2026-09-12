import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import jwt from 'jsonwebtoken'

export async function POST(req: NextRequest) {
  try {
    await dbConnect()

    // HIGH-2 FIX: Increment tokenVersion to revoke all existing JWT tokens.
    // Even though the cookie is cleared, the Bearer token in localStorage
    // is still valid until it expires. By incrementing tokenVersion, any
    // future request with the old token will fail the tokenVersion check
    // in authenticateRequest().
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (token) {
      try {
        const secret = process.env.JWT_SECRET
        if (secret && secret !== 'your-secret-key') {
          const decoded: any = jwt.verify(token, secret)
          if (decoded.userId) {
            await User.findByIdAndUpdate(decoded.userId, { $inc: { tokenVersion: 1 } })
          }
        }
      } catch {
        // Token already invalid — nothing to revoke
      }
    }

    const response = NextResponse.json({ success: true })
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    })
    return response
  } catch {
    // Even if DB fails, still clear the cookie
    const response = NextResponse.json({ success: true })
    response.cookies.set('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0,
      path: '/',
    })
    return response
  }
}
