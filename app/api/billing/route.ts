import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Billing from '@/lib/models/Billing'
import Booking from '@/lib/models/Booking'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { verifyCsrf } from '@/lib/csrf'
import { logAudit } from '@/lib/audit'
import { parsePagination, paginationMeta } from '@/lib/api-response'
import { objectIdSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  await dbConnect()

  try {
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')

    const query: { buyerId?: string; farmerId?: string } = {}
    if (role === 'farmer') query.farmerId = auth.user.userId
    else query.buyerId = auth.user.userId

    const { page, limit, skip } = parsePagination(searchParams, 100, 20)
    const total = await Billing.countDocuments(query)
    const billings = await Billing.find(query)
      .populate('farmerId', 'farmerName phone')
      .populate('bookingId')
      .skip(skip)
      .limit(limit)

    return NextResponse.json({ success: true, data: { billings }, meta: paginationMeta(page, limit, total) })
  } catch (error) {
    console.error('Fetch billings error:', error)
    return NextResponse.json({ error: 'Failed to fetch billings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  // SECURITY: CSRF — without this, a malicious site could force a logged-in
  // user's browser to create billings on arbitrary bookings.
  if (!verifyCsrf(request)) {
    return NextResponse.json({ error: 'CSRF token invalid or missing' }, { status: 403 })
  }

  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  // SECURITY: billing is a buyer-or-farmer action — a transporter/driver
  // creating a billing would be semantically wrong and likely a CSRF or
  // confused-deputy attack.
  if (auth.user.role !== 'buyer' && auth.user.role !== 'farmer') {
    return forbidden('Only buyers or farmers can create billings')
  }

  await dbConnect()

  try {
    const {
      bookingId,
      farmerId,
      buyerId,
      commodity,
      weightReceived,
      pricePerUnit,
      totalAmount,
      transportationCost,
    } = await request.json()

    if (!bookingId || !farmerId || !buyerId || !commodity || !weightReceived || !pricePerUnit || !totalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // SECURITY (IDOR): verify the booking exists AND the caller is party to
    // it. Previously any logged-in user could create billings attributed to
    // arbitrary bookings/users, including bookings they were not part of.
    const bookingIdVal = objectIdSchema.safeParse(bookingId)
    const farmerIdVal = objectIdSchema.safeParse(farmerId)
    const buyerIdVal = objectIdSchema.safeParse(buyerId)
    if (!bookingIdVal.success || !farmerIdVal.success || !buyerIdVal.success) {
      return NextResponse.json({ error: 'Invalid bookingId, farmerId, or buyerId format' }, { status: 400 })
    }

    const booking = await Booking.findById(bookingIdVal.data).lean()
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // The caller must be either the buyer or the farmer of this booking,
    // AND the body's farmerId/buyerId must match the booking's actual
    // parties — otherwise a buyer could forge a billing under a different
    // farmer's name (or vice versa).
    const bookingBuyerId = booking.buyerId?.toString?.() || String(booking.buyerId)
    const bookingFarmerId = booking.farmerId?.toString?.() || String(booking.farmerId)
    const callerId = auth.user.userId

    if (callerId !== bookingBuyerId && callerId !== bookingFarmerId) {
      return forbidden('You are not a participant in this booking')
    }
    if (farmerIdVal.data !== bookingFarmerId || buyerIdVal.data !== bookingBuyerId) {
      return NextResponse.json(
        { error: 'farmerId/buyerId in request body do not match this booking' },
        { status: 400 },
      )
    }

    const billing = await Billing.create({
      bookingId,
      farmerId,
      buyerId,
      commodity,
      weightReceived,
      pricePerUnit,
      totalAmount,
      transportationCost: transportationCost || 0,
      status: 'pending',
    })

    await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Billing', resourceId: billing._id.toString(), details: { bookingId, totalAmount }, request })

    return NextResponse.json({ success: true, billing }, { status: 201 })
  } catch (error) {
    console.error('Create billing error:', error)
    return NextResponse.json({ error: 'Failed to create billing' }, { status: 500 })
  }
}
