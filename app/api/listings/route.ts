import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns'
import dbConnect from '@/lib/mongodb'
import Listing from '@/lib/models/Listing'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parsePagination, paginationMeta, validationError, apiSuccess } from '@/lib/api-response'
import { validateBody, createListingSchema } from '@/lib/validation'
import { LISTING } from '@/lib/config'
import { get as cacheGet, invalidateByPrefix } from '@/lib/cache'
import { geocodeAddress, haversineKm } from '@/lib/geo'

export const runtime = 'nodejs'

dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function GET(request: NextRequest) {
  try {
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

      let distanceFiltered = listings
      if (hasFarmerLocation) {
        distanceFiltered = listings
          .map(l => {
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

    // Build the list of (commodity, pricePerUnit, unit) tuples to create.
    // Two paths:
    type Entry = { name: string; pricePerUnit: number; unit: string }
    let entries: Entry[]
    if (Array.isArray(data.commodities) && data.commodities.length > 0) {
      entries = data.commodities.map(c => ({ name: c.name, pricePerUnit: c.pricePerUnit, unit: c.unit || 'kg' }))
    } else if (data.commodity && data.pricePerUnit != null) {
      entries = [{ name: data.commodity, pricePerUnit: data.pricePerUnit, unit: data.unit || 'kg' }]
    } else {
      return validationError('No commodities provided', [{ field: 'commodities', message: 'At least one commodity is required' }])
    }

    // Geocode ONCE for the whole batch (Nominatim rate-limits at 1 req/sec,
    // so per-listing geocoding was causing failures when buyers added multiple
    let geoLocation: { latitude?: number; longitude?: number } = {}
    const g = await geocodeAddress(data.location)
    if (g) {
      geoLocation = { latitude: g.latitude, longitude: g.longitude }
    } else {
      const buyerUser = await User.findById(auth.user.userId).lean()
      if (buyerUser?.location?.latitude || buyerUser?.location?.longitude) {
        geoLocation = { latitude: buyerUser.location.latitude, longitude: buyerUser.location.longitude }
      }
    }

    const sharedFields = {
      buyerId: auth.user.userId,
      variety: data.variety,
      quantity: data.quantity ?? 0,
      priceDate: data.priceDate ? new Date(data.priceDate) : new Date(),
      commodityPhoto: body.commodityPhoto || data.commodityPhoto || '',
      description: data.description,
      location: data.location,
      geoLocation,
      images: data.images,
      shopPhoto: body.shopPhoto || '',
      quality: body.quality || '',
      paymentConditions: body.paymentConditions || '',
      isActive: true,
    }

    const docs = entries.map(e => ({ ...sharedFields, commodity: e.name, pricePerUnit: e.pricePerUnit, unit: e.unit }))
    const created = await Listing.insertMany(docs)

    await logAudit({
      userId: auth.user.userId,
      action: 'CREATE',
      resource: 'Listing',
      resourceId: created[0]._id.toString(),
      details: { count: created.length, commodities: entries.map(e => e.name) },
      request,
    })

    await invalidateByPrefix('listings')

    return apiSuccess({ listings: created, listing: created[0] }, undefined, 201)
  } catch (error: unknown) {
    console.error('Create listing error:', error)
    let userMessage = 'Failed to create listing. Please try again.'
    if (error instanceof Error) {
      // Common, safe-to-show cases:
      if (error.message.includes('ENCRYPTION_KEY')) {
        userMessage = 'Server is missing encryption config. Please contact support.'
      } else if (error.message.includes('duplicate key')) {
        userMessage = 'One of these commodities already exists for your shop.'
      } else if (error.message.includes('Validation failed') || error.message.includes('required')) {
        userMessage = error.message
      }
    }
    return NextResponse.json({ error: userMessage }, { status: 500 })
  }
}