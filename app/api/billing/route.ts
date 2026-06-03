import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Billing from '@/lib/models/Billing'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

  await dbConnect()

  try {
    const searchParams = request.nextUrl.searchParams
    const role = searchParams.get('role')

    const query: { buyerId?: string; farmerId?: string } = {}
    if (role === 'farmer') query.farmerId = auth.userId
    else query.buyerId = auth.userId

    const billings = await Billing.find(query)
      .populate('farmerId', 'farmerName phone')
      .populate('bookingId')

    return NextResponse.json({ billings })
  } catch (error) {
    console.error('Fetch billings error:', error)
    return NextResponse.json({ error: 'Failed to fetch billings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth) return unauthorized()

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

    await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Billing', resourceId: billing._id.toString(), details: { bookingId, totalAmount }, request })

    return NextResponse.json({ success: true, billing }, { status: 201 })
  } catch (error) {
    console.error('Create billing error:', error)
    return NextResponse.json({ error: 'Failed to create billing' }, { status: 500 })
  }
}
