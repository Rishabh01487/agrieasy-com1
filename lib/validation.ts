/**
 * Centralized Zod validation schemas for all API endpoints.
 * Also includes the sanitize() helper for XSS protection.
 */

import { z } from 'zod/v4'
import xss from 'xss'

// ── Sanitization ───────────────────────────────────────────────────

const xssOptions = {
  whiteList: {},       // Strip ALL HTML
  stripIgnoreTag: true,
  stripIgnoreTagBody: true,
}

export function sanitize(input: unknown): string {
  if (typeof input !== 'string') return String(input || '')
  return xss(input, xssOptions)
}

function sanitizedString(schema?: z.ZodString) {
  return (schema || z.string()).transform(sanitize)
}

function optSanitizedString(schema?: z.ZodString) {
  return sanitizedString(schema).optional()
}

// ── Reusable field schemas ─────────────────────────────────────────

export const phoneSchema = z
  .string()
  .transform(s => s.replace(/[\s\-()]/g, '').replace(/^(\+91|91)/, ''))
  .refine(s => /^[6-9]\d{9}$/.test(s), 'Invalid Indian phone number (10 digits starting with 6-9)')
  .transform(sanitize)

export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID format')

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password too long')
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one digit')

export const nameSchema = sanitizedString(
  z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long')
)

export const emailSchema = z.string().email('Invalid email address').toLowerCase()

export const upiIdSchema = z
  .string()
  .regex(/^[\w.\-]+@[\w]+$/, 'Invalid UPI ID format (e.g. user@paytm)')

export const roleSchema = z.enum(['farmer', 'buyer', 'transporter', 'admin'])

export const positiveAmountSchema = z
  .number()
  .positive('Amount must be greater than 0')
  .max(10_000_000, 'Amount exceeds maximum allowed')

// ── Auth schemas ───────────────────────────────────────────────────

export const sendOtpSchema = z.object({
  phone: phoneSchema,
})

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, 'OTP must be 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
})

export const loginSchema = z.object({
  // Accept either a 10-digit Indian phone OR an email address — the API
  phone: z.string().min(1, 'Phone or email is required').transform(sanitize),
  password: z.string().min(1, 'Password is required'),
})

export const registerSchema = z.object({
  name: nameSchema,
  phone: phoneSchema,
  email: emailSchema.optional(),
  password: passwordSchema,
  role: roleSchema,
  // Buyer-specific
  firmName: z.string().optional(),
  gstin: z.string().regex(/^[0-9A-Z]{15}$/, 'Invalid GSTIN format').optional().or(z.literal('')),
  // Farmer/Transporter-specific
  aadhaarNumber: z.string().regex(/^\d{12}$/, 'Aadhaar must be 12 digits').optional().or(z.literal('')),
  drivingLicense: z.string().min(1).optional(),
  // Address — accept either a plain string (from the autocomplete form) OR a
  // structured object {state, district, pinCode, fullAddress}. The register
  address: z.union([
    sanitizedString(z.string().min(5, 'Address is too short').max(500)),
    z.object({
      state: sanitizedString(z.string().min(1, 'State is required')),
      district: sanitizedString(z.string().min(1, 'District is required')),
      pinCode: z.string().regex(/^\d{6}$/, 'Invalid PIN code'),
      fullAddress: sanitizedString(z.string().min(5, 'Address is too short').max(300)),
    }),
  ]).optional(),
}).passthrough()  // Allow extra fields from the form (aadhar, companyName, etc.) — Zod v4 defaults to strict reject

// ── Buyer vehicle schema ───────────────────────────────────────────
// Buyer-owned vehicles offered to farmers for transporting produce.
// Freight can be 'free' (buyer absorbs cost), 'flat', or 'per_km'.

export const createBuyerVehicleSchema = z.object({
  vehicleType: z.enum(['mini-truck', 'pickup-van', 'truck', 'tractor-trolley', 'tempo', 'tractor', 'other']),
  vehicleDisplayName: optSanitizedString(z.string().max(100)),
  registrationNumber: z.string().min(3, 'Registration number too short').max(20).regex(/^[A-Z0-9\- ]+$/i, 'Only letters, numbers, spaces and dashes allowed'),
  capacityKg: z.number().positive('Capacity must be positive').max(50_000),
  driverName: optSanitizedString(z.string().max(100)),
  driverPhone: z.string().optional(),
  freightType: z.enum(['free', 'flat', 'per_km']).default('free'),
  freightAmount: z.number().min(0).max(100_000).default(0),
  availability: z.enum(['available', 'unavailable']).default('available'),
  notes: optSanitizedString(z.string().max(500)),
  baseLocation: optSanitizedString(z.string().max(200)),
})

export const updateBuyerVehicleSchema = createBuyerVehicleSchema.partial()

// ── Farmer profile / location schema ───────────────────────────────

export const farmerProfileSchema = z.object({
  farmerAddress: sanitizedString(z.string().min(5, 'Address is too short').max(500)),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  farmerName: optSanitizedString(z.string().max(100)),
  bio: optSanitizedString(z.string().max(500)),
  upiId: z.string().regex(/^[\w.\-]+@[\w]+$/, 'Invalid UPI ID format').optional().or(z.literal('')),
})

// ── Listing schemas ────────────────────────────────────────────────

// Per-commodity entry used by the multi-commodity create-listing flow.
export const commodityEntrySchema = z.object({
  name: sanitizedString(z.string().min(2, 'Commodity name too short').max(100)),
  pricePerUnit: positiveAmountSchema,
  unit: z.enum(['kg', 'quintal', 'ton', 'bags']).optional().default('kg'),
})

export const createListingSchema = z.object({
  commodity: sanitizedString(z.string().min(2).max(100)).optional(),
  pricePerUnit: positiveAmountSchema.optional(),
  // Multi-commodity fields — when present, the API creates one listing per entry.
  // Each entry has its own name + pricePerUnit + unit. The shared fields below
  commodities: z.array(commodityEntrySchema).max(50, 'Maximum 50 commodities per request').optional(),
  variety: optSanitizedString(z.string().max(100)),
  quantity: z.number().min(0).max(100_000).optional().default(0),
  unit: z.enum(['kg', 'quintal', 'ton', 'bags']).optional().default('kg'),
  priceDate: z.string().optional(),
  commodityPhoto: z.string().url().optional().or(z.literal('')),
  description: optSanitizedString(z.string().max(2000)),
  location: sanitizedString(z.string().min(2).max(200)),
  images: z.array(z.string().url()).max(10, 'Maximum 10 images allowed').optional().default([]),
}).refine(
  (data) => (Array.isArray(data.commodities) && data.commodities.length > 0) || (data.commodity && data.pricePerUnit != null),
  "Either 'commodities' array (with at least one entry) or 'commodity'+'pricePerUnit' is required",
)

// ── Booking schemas ────────────────────────────────────────────────

export const createBookingSchema = z.object({
  listingId: objectIdSchema,
  quantity: z.number().positive('Quantity must be positive').max(100_000),
  deliveryAddress: sanitizedString(z.string().min(5).max(500)),
  deliveryDate: z.string().optional(), // ISO date string
  notes: optSanitizedString(z.string().max(500)),
})

// ── Vehicle schemas ────────────────────────────────────────────────

const vehicleRegTransform = z.string()
  .transform(s => s.toUpperCase().replace(/[\s-]/g, ''))
  .refine(s => /^[A-Z0-9]{5,12}$/.test(s), 'Enter a valid vehicle number (e.g. MH12AB1234, KA05ABC1234, BH22A1234)')

export const createVehicleSchema = z.object({
  vehicleType: z.enum(['mini-truck', 'pickup-van', 'truck', 'tractor-trolley', 'tempo']),
  registrationNumber: vehicleRegTransform,
  capacity: z.number().positive().max(50_000, 'Capacity too large'),
  capacityUnit: z.enum(['kg', 'ton']).optional().default('kg'),
  // Accept either `baseRatePerKm` (canonical) or `pricePerKm` (what the
  baseRatePerKm: z.number().min(0).max(1000).optional(),
  pricePerKm: z.number().min(0).max(1000).optional(),
  availability: z.enum(['available', 'unavailable', 'on_trip']).optional().default('available'),
}).passthrough()

// ── Social schemas ─────────────────────────────────────────────────
//
// IMPORTANT: the enum values here MUST match the Mongoose Post model
// in lib/models/Post.ts exactly, otherwise posts will fail to save.

export const POST_CATEGORIES = [
  'farming', 'agritrading', 'technique', 'equipment',
  'weather', 'livestock', 'organic', 'general',
] as const

export const POST_TYPES = ['post', 'krishiclip'] as const

export const createPostSchema = z.object({
  content: optSanitizedString(z.string().max(2200)),
  mediaUrls: z.array(z.string().url()).max(10).optional().default([]),
  type: z.enum(POST_TYPES).default('post'),
  mediaType: z.enum(['image', 'video', 'youtube', 'text']).optional(),
  category: z.enum(POST_CATEGORIES).default('general'),
  hashtags: z.array(sanitizedString(z.string().max(50))).max(30).optional().default([]),
  location: optSanitizedString(z.string().max(200)),
})

export const commentSchema = z.object({
  content: sanitizedString(z.string().min(1, 'Comment cannot be empty').max(500)),
  parentId: objectIdSchema.optional(),
})

// ── Story schema (Instagram-style stories) ────────────────────────

export const createStorySchema = z.object({
  mediaUrl: z.string().url('Story media URL is required'),
  mediaType: z.enum(['image', 'video']),
  caption: optSanitizedString(z.string().max(500)),
  duration: z.number().min(3).max(30).optional().default(5), // seconds
})

// ── Direct Message schema ─────────────────────────────────────────

export const createConversationSchema = z.object({
  participantId: objectIdSchema,
})

export const sendMessageSchema = z.object({
  conversationId: objectIdSchema.optional(),
  recipientId: objectIdSchema.optional(),
  text: sanitizedString(z.string().min(1, 'Message cannot be empty').max(2000)),
  mediaUrl: z.string().url().optional(),
  mediaType: z.enum(['image', 'video']).optional(),
})

// ── Notification helpers ──────────────────────────────────────────

export const NOTIFICATION_TYPES = [
  'like', 'comment', 'follow', 'mention', 'message', 'comment_like', 'story',
  'booking_request', 'booking_status',
] as const

// ── AgriPay schemas ────────────────────────────────────────────────

export const transferSchema = z.object({
  toIdentifier: sanitizedString(z.string().min(1, 'Recipient identifier required')),
  amount: positiveAmountSchema,
  note: optSanitizedString(z.string().max(200)),
  paymentMethod: z.enum(['wallet', 'paylater', 'upi', 'netbanking']).default('wallet'),
})

export const topupSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(100_000, 'Max top-up is ₹1,00,000'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature required'),
})

export const createOrderSchema = z.object({
  amount: z.number().positive('Amount must be positive').max(100_000, 'Max top-up is ₹1,00,000'),
})

export const withdrawSchema = z.object({
  amount: positiveAmountSchema,
})

export const paylaterRepaySchema = z.object({
  loanId: objectIdSchema,
  amount: positiveAmountSchema,
})

export const payBillSchema = z.object({
  billerId: z.string().min(1),
  amount: positiveAmountSchema,
  category: z.string().min(1).optional(),
})

// ── Validation helper ──────────────────────────────────────────────

export function validateBody<T>(schema: z.ZodType<T>, body: unknown) {
  const result = schema.safeParse(body)
  if (result.success) {
    return { success: true as const, data: result.data }
  }
  const errors = result.error.issues.map(i => ({
    field: String(i.path.join('.')),
    message: i.message,
  }))
  return { success: false as const, errors }
}

export function validateQuery<T extends Record<string, unknown>>(
  schema: z.ZodType<Partial<T>>,
  query: Record<string, string | string[] | undefined>,
) {
  // Flatten single-value arrays
  const flat: Record<string, string> = {}
  for (const [k, v] of Object.entries(query)) {
    flat[k] = Array.isArray(v) ? v[0] : (v || '')
  }
  const result = schema.safeParse(flat)
  if (result.success) {
    return { success: true as const, data: result.data }
  }
  const errors = result.error.issues.map(i => ({
    field: String(i.path.join('.')),
    message: i.message,
  }))
  return { success: false as const, errors }
}