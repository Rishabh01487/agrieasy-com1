import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import Wallet from '@/lib/models/Wallet'
import Transaction from '@/lib/models/Transaction'
import Post from '@/lib/models/Post'
import { authenticateRequest, forbidden, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { invalidate } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = authenticateRequest(request, ['admin'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden()

  const { userId } = await params
  await dbConnect()

  try {
    const [user, wallet, recentTransactions, posts] = await Promise.all([
      User.findById(userId).select('-password').lean(),
      Wallet.findOne({ userId }).lean(),
      Transaction.find({ $or: [{ fromUserId: userId }, { toUserId: userId }] }).sort({ createdAt: -1 }).limit(20).lean(),
      Post.find({ userId }).sort({ createdAt: -1 }).limit(20).lean(),
    ])

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({ user, wallet, recentTransactions, posts })
  } catch (error) {
    console.error('Admin user detail error:', error)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = authenticateRequest(request, ['admin'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden()

  const { userId } = await params
  await dbConnect()

  try {
    const updates = await request.json()
    const allowed = ['role', 'email', 'phone', 'address', 'farmerName', 'firmName', 'transporterCompanyName']
    const sanitized: Record<string, unknown> = {}
    for (const key of allowed) {
      if (updates[key] !== undefined) sanitized[key] = updates[key]
    }

    const user = await User.findByIdAndUpdate(userId, sanitized, { new: true }).select('-password')
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await logAudit({ userId: auth.user.userId, action: 'UPDATE', resource: 'User', resourceId: userId, details: sanitized, request })

    await invalidate('admin:stats', 'admin')

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Admin update user error:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const auth = authenticateRequest(request, ['admin'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden()

  const { userId } = await params
  if (userId === auth.user.userId) return NextResponse.json({ error: 'Cannot delete yourself' }, { status: 400 })

  await dbConnect()

  try {
    const user = await User.findByIdAndDelete(userId)
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    await Promise.all([
      Wallet.deleteMany({ userId }),
      Post.deleteMany({ userId }),
      Transaction.deleteMany({ $or: [{ fromUserId: userId }, { toUserId: userId }] }),
    ])

    await logAudit({ userId: auth.user.userId, action: 'DELETE', resource: 'User', resourceId: userId, details: { role: user.role }, request })

    await invalidate('admin:stats', 'admin')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin delete user error:', error)
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
  }
}
