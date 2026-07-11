
import { randomInt } from 'crypto'
import { Redis } from '@upstash/redis'

let _redis: Redis | null | undefined // undefined = not checked yet

async function getRedis(): Promise<Redis | null> {
  if (_redis !== undefined) return _redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    _redis = new Redis({ url, token })
    console.log('[otp] Upstash Redis client initialized')
  } else {
    _redis = null
    console.warn('[otp] UPSTASH_REDIS_REST_URL/TOKEN not set — using in-memory fallback (not safe for serverless)')
  }
  return _redis
}

const fallback = new Map<string, { otp: string; expiresAt: number }>()

const KEY_TTL = 5 * 60 // 5 minutes

// ── Public API (all async to keep signature uniform) ────────────────

export function generateOtp(): string {
  return randomInt(100000, 1000000).toString()
}

export async function storeOtp(phone: string, otp: string): Promise<void> {
  const redis = await getRedis()
  const payload = JSON.stringify({ otp, expiresAt: Date.now() + KEY_TTL * 1000 })

  if (redis) {
    await redis.set(`otp:${phone}`, payload, { ex: KEY_TTL })
  } else {
    fallback.set(phone, { otp, expiresAt: Date.now() + KEY_TTL * 1000 })
  }
}

export async function verifyOtp(phone: string, otp: string): Promise<boolean> {
  const redis = await getRedis()

  if (redis) {
    const raw = await redis.get(`otp:${phone}`)
    if (!raw) return false

    const record: { otp: string; expiresAt: number } = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (Date.now() > record.expiresAt) {
      await redis.del(`otp:${phone}`)
      return false
    }
    if (record.otp !== otp) return false
    await redis.del(`otp:${phone}`)
    return true
  }

  // In-memory fallback
  const record = fallback.get(phone)
  if (!record) return false
  if (Date.now() > record.expiresAt) {
    fallback.delete(phone)
    return false
  }
  if (record.otp !== otp) return false
  fallback.delete(phone)
  return true
}

// ── SMS sending (unchanged) ────────────────────────────────────────

export async function sendSms(phone: string, message: string): Promise<void> {
  console.log(`[SMS to ${phone}]: ${message}`)

  const provider = process.env.SMS_PROVIDER

  if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID
      const authToken = process.env.TWILIO_AUTH_TOKEN
      const from = process.env.TWILIO_PHONE_NUMBER
      if (!from) return
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${accountSid}:${authToken}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ To: phone, From: from, Body: message }),
      })
    } catch (e) {
      console.error('Twilio SMS error:', e)
    }
    return
  }

  if (provider === 'fast2sms' && process.env.FAST2SMS_API_KEY) {
    try {
      await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': process.env.FAST2SMS_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          numbers: phone.replace('+91', ''),
          message,
        }),
      })
    } catch (e) {
      console.error('Fast2SMS error:', e)
    }
  }
}