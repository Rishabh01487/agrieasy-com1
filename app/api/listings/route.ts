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
import { geocodeAddress, haversineKm } from '@/lib/geo'

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
    const minPrice = searchParams.get('minPrice')
    const buyerId = searchParams.get('buyerId')
    const quality = searchParams.get('quality')
    const paymentConditions = searchParams.get('paymentConditions')
    const sortBy = searchParams.get('sortBy') || 'recent'  // recent | price-high | price-low | distance

    // Distance filter — if farmer's lat/lng is provided, only return listings
    // within `radiusKm` (default 50). When radiusKm = 0 or omitted, no
    // distance filter is applied (returns everything nationwide).
    const farmerLat = searchParams.get('farmerLat')
    const farmerLng = searchParams.get('farmerLng')
    const radiusKm = searchParams.get('radiusKm')
    const farmerLatNum = farmerLat ? parseFloat(farmerLat) : NaN
    const farmerLngNum = farmerLng ? parseFloat(farmerLng) : NaN
    const hasFarmerLocation = !isNaN(farmerLatNum) && !isNaN(farmerLngNum)
    const radiusKmNum = radiusKm ? parseFloat(radiusKm) : 0

    const { page, limit, skip } = parsePagination(searchParams, LISTING.MAX_PAGE_SIZE, LISTING.DEFAULT_PAGE_SIZE)

    const fetchListings = async () => {
      const query: Record<string, unknown> = { isActive: true }
      if (commodity) query.commodity = new RegExp(escapeRegex(commodity), 'i')
      const parsedMaxPrice = maxPrice ? parseFloat(maxPrice) : NaN
      if (maxPrice && !isNaN(parsedMaxPrice)) query.pricePerUnit = { $lte: parsedMaxPrice }
      const parsedMinPrice = minPrice ? parseFloat(minPrice) : NaN
      if (minPrice && !isNaN(parsedMinPrice)) {
        query.pricePerUnit = { ...(query.pricePerUnit as object || {}), $gte: parsedMinPrice }
      }
      if (buyerId) query.buyerId = buyerId
      if (quality) query.quality = new RegExp(escapeRegex(quality), 'i')
      if (paymentConditions) query.paymentConditions = new RegExp(escapeRegex(paymentConditions), 'i')

      const total = await Listing.countDocuments(query)
      let listings = await Listing.find(query)
        .populate('buyerId', 'firmName address location shopPhoto')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()

      // Compute distance from farmer for each listing (when his location is
      // known) and apply radius filter + distance sort.
      let distanceFiltered = listings
      if (hasFarmerLocation) {
        distanceFiltered = listings
          .map(l => {
            // Prefer the listing's own geoLocation; fall back to buyer's User.location.
            const geo = (l.geoLocation && (l.geoLocation.latitude || l.geoLocation.longitude))
              ? l.geoLocation
              : ((l.buyerId as any)?.location)
            let distanceKm: number | null = null
            if (geo && (geo.latitude || geo.longitude)) {
              distanceKm = haversineKm(
                { latitude: farmerLatNum, longitude: farmerLngNum },
                { latitude: geo.latitude, longitude: geo.longitude },
              )
            }
            return { ...l, distanceKm }
          })
          .filter(l => {
            // If we couldn't geocode this listing, keep it (don't hide buyers
            // who haven't been geocoded yet). Apply radius only when distance
            // is known.
            if (l.distanceKm === null) return true
            if (radiusKmNum && radiusKmNum > 0) return l.distanceKm <= radiusKmNum
            return true
          })
      }

      // Sort
      if (sortBy === 'distance' && hasFarmerLocation) {
        // null distances (un-geocoded) sink to the bottom
        distanceFiltered.sort((a, b) => {
          if (a.distanceKm === null && b.distanceKm === null) return 0
          if (a.distanceKm === null) return 1
          if (b.distanceKm === null) return -1
          return a.distanceKm - b.distanceKm
        })
      } else if (sortBy === 'price-high') {
        distanceFiltered.sort((a, b) => b.pricePerUnit - a.pricePerUnit)
      } else if (sortBy === 'price-low') {
        distanceFiltered.sort((a, b) => a.pricePerUnit - b.pricePerUnit)
      } else {
        distanceFiltered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      }

      return { success: true, data: { listings: distanceFiltered }, meta: paginationMeta(page, limit, total) }
    }

    const result = await cacheGet(`listings:${JSON.stringify({ commodity, maxPrice, minPrice, buyerId, quality, paymentConditions, sortBy, farmerLat, farmerLng, radiusKm, page, limit })}`, fetchListings, { ttl: 30, prefix: 'listings' })
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
      quantity: data.quantity ?? 0,
      unit: data.unit || 'kg',
      pricePerUnit: data.pricePerUnit,
      priceDate: data.priceDate ? new Date(data.priceDate) : new Date(),
      commodityPhoto: body.commodityPhoto || data.commodityPhoto || '',
      description: data.description,
      location: data.location,
      // Geocode the location so we can compute distance from farmers later.
      // Best-effort — if Nominatim is unavailable, geoLocation stays empty
      // and the listing will fall back to the buyer's profile location.
      geoLocation: await (async () => {
        const g = await geocodeAddress(data.location)
        if (g) return { latitude: g.latitude, longitude: g.longitude }
        // Fall back to buyer's saved location if available
        const buyerUser = await (await import('@/lib/models/User')).default.findById(auth.user.userId).lean()
        return buyerUser?.location || { latitude: undefined, longitude: undefined }
      })(),
      images: data.images,
      shopPhoto: body.shopPhoto || '',  // Cloudinary URL of the buyer's shop (optional)
      quality: body.quality || '',
      paymentConditions: body.paymentConditions || '',
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