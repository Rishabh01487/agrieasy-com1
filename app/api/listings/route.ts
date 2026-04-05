import { NextRequest, NextResponse } from 'next/server'
import dns from 'dns'
import dbConnect from '@/lib/mongodb'
import Listing from '@/lib/models/Listing'
import '@/lib/models/User' // Required for populate('buyerId') to work

// Force Node.js runtime (not Edge) so DNS and MongoDB work
export const runtime = 'nodejs'

// Apply Google DNS before any MongoDB call
dns.setDefaultResultOrder('ipv4first')
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])

export async function GET(request: NextRequest) {
  try {
    // Re-apply DNS in handler context
    dns.setDefaultResultOrder('ipv4first')
    dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1'])
    await dbConnect()

    const searchParams = request.nextUrl.searchParams
    const commodity = searchParams.get('commodity')
    const maxPrice = searchParams.get('maxPrice')

    const query: { isActive: boolean; commodity?: RegExp; pricePerUnit?: { $lte: number } } = { isActive: true }
    if (commodity) query.commodity = new RegExp(commodity, 'i')
    if (maxPrice) query.pricePerUnit = { $lte: parseFloat(maxPrice) }

    const listings = await Listing.find(query)
      .populate('buyerId', 'firmName phone address')
      .sort({ createdAt: -1 })

    return NextResponse.json({ listings })
  } catch (error: unknown) {
    const e = error as Error & { code?: string; syscall?: string }
    console.error('LISTINGS ERROR CODE:', e.code, '| SYSCALL:', e.syscall, '| MSG:', e.message?.slice(0,200))
    return NextResponse.json({ error: 'Failed to fetch listings', detail: e.message }, { status: 500 })
  }
}


export async function POST(request: NextRequest) {
  await dbConnect()

  try {
    const {
      buyerId, commodity, quantity, unit,
      pricePerUnit, quality, paymentConditions, firmLocation,
    } = await request.json()

    if (!buyerId || !commodity || !quantity || !pricePerUnit || !firmLocation) {
      return NextResponse.json({ error: 'Missing required fields: buyerId, commodity, quantity, pricePerUnit, firmLocation' }, { status: 400 })
    }

    const listing = await Listing.create({
      buyerId,
      commodity,
      quantity,
      unit: unit || 'kg',
      pricePerUnit,
      quality,
      paymentConditions,
      firmLocation,
      isActive: true,
    })

    return NextResponse.json({ success: true, listing }, { status: 201 })
  } catch (error) {
    console.error('Create listing error:', error)
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
  }
}
