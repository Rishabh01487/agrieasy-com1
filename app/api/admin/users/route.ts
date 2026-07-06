import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { escapeRegex } from '@/lib/auth-fetch'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request, ['admin'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden()

  await dbConnect()

  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role')
    const search = searchParams.get('search')

    const query: Record<string, unknown> = {}
    if (role) query.role = role
    if (search) {
      query.$or = [
        { email: { $regex: escapeRegex(search), $options: 'i' } },
        { phone: { $regex: escapeRegex(search), $options: 'i' } },
        { farmerName: { $regex: escapeRegex(search), $options: 'i' } },
        { firmName: { $regex: escapeRegex(search), $options: 'i' } },
        { transporterCompanyName: { $regex: escapeRegex(search), $options: 'i' } },
      ]
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ])

    return NextResponse.json({ users, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}
