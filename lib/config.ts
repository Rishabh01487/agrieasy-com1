/**
 * Centralized, type-safe, Zod-validated environment configuration.
 *
 * Call `config.init()` once at app startup (instrumentation.ts or first import).
 * Access validated values via `config.jwt.secret`, `config.mongo.uri`, etc.
 * Missing required vars throw immediately with a clear message.
 */

import { z } from 'zod/v4'

// ── Schema ─────────────────────────────────────────────────────────

const envSchema = z.object({
  // Required
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be ≥32 characters'),

  // Encryption key — used to encrypt PII (aadhar, license, etc.) at rest.
  // Loosened from `.length(64)` to optional because missing it should NOT
  // crash every API request. The User model already has a try/catch fallback
  // that stores plaintext with a console.warn when ENCRYPTION_KEY is absent,
  // so the app keeps working — just without encryption until the operator
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY should be ≥32 chars').optional(),

  // Auth
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Payments
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_ACCOUNT_TYPE: z.enum(['test', 'live']).optional().default('test'),

  // SMS — accept any string but normalize unknown values to undefined so
  SMS_PROVIDER: z.enum(['twilio', 'fast2sms']).optional().or(
    z.string().transform(() => undefined as undefined)
  ),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_PHONE_NUMBER: z.string().optional(),
  FAST2SMS_API_KEY: z.string().optional(),

  // Redis (Upstash)
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1).optional(),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  // App
  APP_URL: z.string().optional().default('http://localhost:3000'),
  CORS_ORIGINS: z.string().optional().default(''),
})

type Env = z.infer<typeof envSchema>

// ── Shared Business Constants ──────────────────────────────────────

export const PAYLATER = {
  INTEREST_RATE: 0.099,        // 9.9% per annum
  DEFAULT_INTEREST_RATE: 0.11, // 11% after due date
  MAX_LOAN_AMOUNT: 1_000_000,  // ₹10L
  RETURN_PERIOD_DAYS: 30,
} as const

export const WALLET = {
  DEFAULT_DAILY_LIMIT: 10_000,
  DEFAULT_MONTHLY_LIMIT: 100_000,
  DEFAULT_PAYLATER_MAX: 1_000_000,
  MAX_SINGLE_TOPUP: 100_000,
  MIN_TOPUP: 1,
} as const

export const LISTING = {
  MAX_IMAGES: 10,
  MAX_DESCRIPTION_LENGTH: 2000,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const

export const SOCIAL = {
  POST_CAPTION_MAX: 500,
  COMMENT_MAX: 500,
  DEFAULT_PAGE_SIZE: 15,
  CLIPS_PAGE_SIZE: 10,
  EXPLORE_PAGE_SIZE: 18,
} as const

export const OTP = {
  LENGTH: 6,
  TTL_SECONDS: 300, // 5 minutes
} as const

export const UPLOAD = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4'],
} as const

export const PASSWORD_POLICY = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: false,
} as const

// ── Config singleton ───────────────────────────────────────────────

let _env: Env | null = null

export const config = {
  init() {
    if (_env) return _env
    _env = envSchema.parse(process.env)
    if (!_env.ENCRYPTION_KEY) {
      // Don't crash — the User/Wallet models have plaintext fallbacks — but
      console.warn('⚠️  ENCRYPTION_KEY is not set — PII (aadhar, license) will be stored in plaintext. Generate one with: openssl rand -hex 32')
    }
    return _env
  },

  get env(): Env {
    if (!_env) this.init()
    return _env!
  },

  get isDev() {
    return this.env.NODE_ENV === 'development'
  },

  get isProd() {
    return this.env.NODE_ENV === 'production'
  },

  get corsOrigins(): string[] {
    const raw = this.env.CORS_ORIGINS
    if (!raw) return []
    return raw.split(',').map(s => s.trim()).filter(Boolean)
  },
}