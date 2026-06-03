import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import { authenticateRequest, forbidden } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request, ['admin'])
  if (!auth || auth.role !== 'admin') return forbidden()

  await dbConnect()

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const minBalance = searchParams.get('minBalance')

    const query: Record<string, unknown> = {}
    if (minBalance) query.balance = { $gte: parseFloat(minBalance) }

    const [wallets, total] = await Promise.all([
      Wallet.find(query)
        .populate('userId', 'email phone role farmerName firmName transporterCompanyName')
        .sort({ balance: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Wallet.countDocuments(query),
    ])

    return NextResponse.json({ wallets, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin wallets error:', error)
    return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 })
  }
}
