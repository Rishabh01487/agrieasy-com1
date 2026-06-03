import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import { rateLimitByIp } from '@/lib/rate-limit'
import { generateOtp, storeOtp, sendSms } from '@/lib/otp'

export async function POST(request: NextRequest) {
  const rl = rateLimitByIp(request, { windowMs: 60_000, max: 3, message: 'Too many OTP requests. Try again in a minute.' })
  if (rl) return rl

  try {
    await dbConnect()
    const { phone } = await request.json()
    if (!phone) return NextResponse.json({ error: 'Phone number required' }, { status: 400 })

    const user = await User.findOne({ phone })
    if (!user) return NextResponse.json({ error: 'No account found with this phone number' }, { status: 404 })

    const otp = generateOtp()
    storeOtp(phone, otp)
    await sendSms(phone, `Your AgriPay OTP is: ${otp}. Valid for 5 minutes.`)

    const smsConfigured = process.env.SMS_PROVIDER === 'twilio'
    return NextResponse.json({
      success: true,
      message: 'OTP sent to your phone',
      ...(smsConfigured ? {} : { devOtp: otp }),
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return NextResponse.json({ error: 'Failed to send OTP' }, { status: 500 })
  }
}
