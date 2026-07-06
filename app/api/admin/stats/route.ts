import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import Transaction from '@/lib/models/Transaction'
import Wallet from '@/lib/models/Wallet'
import AuditLog from '@/lib/models/AuditLog'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { get as cacheGet } from '@/lib/cache'

export async function GET(request: NextRequest) {
  const auth = authenticateRequest(request, ['admin'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden()

  await dbConnect()

  try {
    const fetchStats = async () => {
      const [totalUsers, farmers, buyers, transporters, totalPosts, totalClips, totalTransactions, totalWallets, recentLogs] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ role: 'farmer' }),
        User.countDocuments({ role: 'buyer' }),
        User.countDocuments({ role: 'transporter' }),
        Post.countDocuments({ type: 'post' }),
        Post.countDocuments({ type: 'krishiclip' }),
        Transaction.countDocuments(),
        Wallet.countDocuments(),
        AuditLog.find().sort({ createdAt: -1 }).limit(10).populate('userId', 'email role').lean(),
      ])

      return {
        stats: { totalUsers, farmers, buyers, transporters, totalPosts, totalClips, totalTransactions, totalWallets },
        recentLogs,
      }
    }

    const cacheKey = 'admin:stats'
    const result = await cacheGet(cacheKey, fetchStats, { ttl: 30, prefix: 'admin' })
    return NextResponse.json(result ?? await fetchStats())
  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
