import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns'
import dbConnect from '@/lib/mongodb'
import Listing from '@/lib/models/Listing'
import '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parsePagination, paginationMeta, validationError } from '@/lib/api-response'
import { validateBody, createListingSchema } from '@/lib/validation'
import { LISTING } from '@/lib/config'
import { get as cacheGet, invalidateByPrefix } from '@/lib/cache'

// Force Node.js runtime (not Edge) so DNS and MongoDB work
export const runtime = 'nodejs'

// Apply Google DNS before any MongoDB call
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(request: NextRequest) {
  try {
    // Re-apply DNS in handler context
    dns.setDefaultResultOrder('ipv4first')
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
    await dbConnect()

    const searchParams = request.nextUrl.searchParams
    const commodity = searchParams.get('commodity')
    const maxPrice = searchParams.get('maxPrice')
    const buyerId = searchParams.get('buyerId')

    const { page, limit, skip } = parsePagination(searchParams, LISTING.MAX_PAGE_SIZE, LISTING.DEFAULT_PAGE_SIZE)
    const filters: Record<string, string | null> = { commodity, maxPrice, buyerId, page: String(page), limit: String(limit) }
    const cacheKey = `listings:${JSON.stringify(filters)}`

    const fetchListings = async () => {
      const query: Record<string, unknown> = { isActive: true }
      // FIX: Escape regex to prevent ReDoS
      if (commodity) query.commodity = new RegExp(escapeRegex(commodity), 'i')
      // FIX: Guard against NaN
      const parsedPrice = maxPrice ? parseFloat(maxPrice) : NaN
      if (maxPrice && !isNaN(parsedPrice)) query.pricePerUnit = { $lte: parsedPrice }
      // FIX: Allow filtering by buyerId for dashboard
      if (buyerId) query.buyerId = buyerId

      const total = await Listing.countDocuments(query)
      const listings = await Listing.find(query)
        .populate('buyerId', 'firmName address')  // FIX: removed phone (PII)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)

      return { success: true, data: { listings }, meta: paginationMeta(page, limit, total) }
    }

    const result = await cacheGet(cacheKey, fetchListings, { ttl: 60, prefix: 'listings' })
    return NextResponse.json(result ?? await fetchListings())
  } catch (error: unknown) {
    const e = error as Error & { code?: string; syscall?: string }
    console.error('LISTINGS ERROR CODE:', e.code, '| SYSCALL:', e.syscall, '| MSG:', e.message?.slice(0, 200))
    return NextResponse.json({ error: 'Failed to fetch listings', detail: e.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many listing requests.' })
  if (rl) return rl

  await dbConnect()

  try {
    const body = await request.json()
    const v = validateBody(createListingSchema, body)
    if (!v.success) return validationError('Validation failed', v.errors)
    const data = v.data

    const listing = await Listing.create({
      buyerId: auth.user.userId,
      commodity: data.commodity,
      variety: data.variety,
      quantity: data.quantity,
      unit: data.unit,
      pricePerUnit: data.pricePerUnit,
      description: data.description,
      location: data.location,
      images: data.images,
      isActive: true,
    })

    await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Listing', resourceId: listing._id.toString(), details: { commodity: data.commodity, quantity: data.quantity, pricePerUnit: data.pricePerUnit }, request })

    await invalidateByPrefix('listings')

    return NextResponse.json({ success: true, listing }, { status: 201 })
  } catch (error) {
    console.error('Create listing error:', error)
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
  }
}