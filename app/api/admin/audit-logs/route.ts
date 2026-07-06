import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import AuditLog from '@/lib/models/AuditLog'
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
    const action = searchParams.get('action')
    const resource = searchParams.get('resource')

    const query: Record<string, unknown> = {}
    if (action) query.action = action
    if (resource) query.resource = resource

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .populate('userId', 'email role')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ])

    return NextResponse.json({ logs, total, page, totalPages: Math.ceil(total / limit) })
  } catch (error) {
    console.error('Admin audit logs error:', error)
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 })
  }
}
