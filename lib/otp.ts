
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

// ── Per-phone OTP brute-force cap ───────────────────────────────────
// SECURITY: 6-digit OTP has 1,000,000 possible values; TTL is 5 min.
// Per-IP rate-limiting is bypassable with rotating IPs. A per-phone
// attempt counter caps brute-force at 5 tries per window regardless of
// how many IPs the attacker controls. After the cap is hit, the OTP is
// also invalidated so the attacker has to wait for a new one.

const OTP_MAX_ATTEMPTS = 5
const OTP_ATTEMPTS_TTL_REDIS = 5 * 60      // 5 min — matches OTP TTL
// In-memory fallback TTL — deliberately longer than Redis so a single
// long-lived dev process still throttles across what would otherwise be
// resets. Vercel serverless cold-starts reset the Map regardless; Redis
// is the only real fix in production.
const OTP_ATTEMPTS_TTL_MEMORY = 15 * 60     // 15 min

const fallbackAttempts = new Map<string, { count: number; expiresAt: number }>()

/**
 * Increment the per-phone OTP attempt counter and return the new count.
 * Caller MUST reject with 429 if count > OTP_MAX_ATTEMPTS.
 *
 * - On count === 1 (first attempt in window), the TTL is set.
 * - TTL = 5 min in Redis (matches OTP TTL); 15 min in-memory fallback.
 */
export async function incrOtpAttempts(phone: string): Promise<number> {
  const redis = await getRedis()
  if (redis) {
    const key = `otp:attempts:${phone}`
    // Upstash Redis `incr` returns the post-increment value as a number.
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.expire(key, OTP_ATTEMPTS_TTL_REDIS)
    }
    return typeof count === 'number' ? count : Number(count)
  }

  // In-memory fallback — survives for the process lifetime.
  const now = Date.now()
  const record = fallbackAttempts.get(phone)
  let count: number
  if (!record || now > record.expiresAt) {
    count = 1
    fallbackAttempts.set(phone, { count, expiresAt: now + OTP_ATTEMPTS_TTL_MEMORY * 1000 })
  } else {
    count = record.count + 1
    record.count = count
  }
  return count
}

/**
 * Clear the per-phone attempt counter — called on successful OTP verify.
 */
export async function clearOtpAttempts(phone: string): Promise<void> {
  const redis = await getRedis()
  if (redis) {
    await redis.del(`otp:attempts:${phone}`)
    return
  }
  fallbackAttempts.delete(phone)
}

/**
 * Invalidate the stored OTP for a phone — called when the attempt cap
 * is hit so the attacker cannot keep guessing even if the cap somehow
 * doesn't fire on the next call.
 */
export async function clearOtp(phone: string): Promise<void> {
  const redis = await getRedis()
  if (redis) {
    await redis.del(`otp:${phone}`)
    return
  }
  fallback.delete(phone)
}

export const OTP_BRUTE_FORCE_LIMIT = OTP_MAX_ATTEMPTS

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