import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Billing from '@/lib/models/Billing'

export async function GET(request: NextRequest) {
  await dbConnect()

  try {
    const searchParams = request.nextUrl.searchParams
    const buyerId = searchParams.get('buyerId')
    const farmerId = searchParams.get('farmerId')

    const query: { buyerId?: string; farmerId?: string } = {}
    if (buyerId) query.buyerId = buyerId
    if (farmerId) query.farmerId = farmerId

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

    return NextResponse.json({ success: true, billing }, { status: 201 })
  } catch (error) {
    console.error('Create billing error:', error)
    return NextResponse.json({ error: 'Failed to create billing' }, { status: 500 })
  }
}
