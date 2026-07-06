import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request, ['admin'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden()

  await dbConnect()

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '30')
    const type = searchParams.get('type')
    const status = searchParams.get('status')

    const query: Record<string, unknown> = {}
    if (type) query.type = type
    if (status) query.status = status

    const [transactions, total] = await Promise.all([
      Transaction.find(query)
        .populate('fromUserId', 'email phone role farmerName firmName transporterCompanyName')
        .populate('toUserId', 'email phone role farmerName firmName transporterCompanyName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Transaction.countDocuments(query),
    ])

    return NextResponse.json({ transactions, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin transactions error:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}
