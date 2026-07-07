import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import { rateLimitByIp } from '@/lib/rate-limit'
import { generateOtp, storeOtp, sendSms } from '@/lib/otp'
import { validateBody, sendOtpSchema } from '@/lib/validation'
import { apiSuccess, validationError, notFound, apiError, ErrorCodes } from '@/lib/api-response'

export async function POST(request: NextRequest) {
  const rl = await rateLimitByIp(request, { windowMs: 60_000, max: 3, message: 'Too many OTP requests. Try again in a minute.' })
  if (rl) return rl

  try {
    await dbConnect()
    const body = await request.json()

    const v = validateBody(sendOtpSchema, body)
    if (!v.success) return validationError('Invalid phone number', v.errors)
    const data = v.data

    const user = await User.findOne({ phone: data.phone })
    if (!user) return notFound('User')

    const otp = generateOtp()
    await storeOtp(data.phone, otp)
    await sendSms(data.phone, `Your AgriPay OTP is: ${otp}. Valid for 5 minutes.`)

    const smsConfigured = !!process.env.SMS_PROVIDER
    const isDev = process.env.NODE_ENV === 'development'
    return apiSuccess({
      message: 'OTP sent to your phone',
      // Only expose the OTP in the response during local development AND when
      // SMS is not configured. In production we NEVER return the OTP — it must
      // be delivered out-of-band via SMS, otherwise any caller could request
      // an OTP for a victim's phone and immediately read it from the response
      // to bypass authentication entirely.
      ...(isDev && !smsConfigured ? { devOtp: otp } : {}),
    })
  } catch (error) {
    console.error('Send OTP error:', error)
    return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to send OTP')
  }
}