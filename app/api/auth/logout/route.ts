import { NextRequest, NextResponse } from 'next/server'
import { verifyCsrf } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: 'CSRF token invalid or missing' }, { status: 403 })
  }
  const response = NextResponse.json({ success: true })
  response.cookies.set('token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  // Also clear the session marker cookie
  response.cookies.set('agrieasy_session', '', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}