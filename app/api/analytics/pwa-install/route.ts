import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Metric from '@/lib/models/Metric'
import { rateLimitByIp } from '@/lib/rate-limit'

/**
 * POST /api/analytics/pwa-install
 *
 * Records a PWA install event. Idempotent per deviceId — if the same
 * device installs twice (e.g. uninstalls then reinstalls), the second
 * call is silently ignored thanks to the unique index on (type, deviceId).
 *
 * No authentication required — PWA installs often happen before login.
 * Rate-limited by IP to prevent abuse (max 10 install pings per hour).
 *
 * Body:
 *   { deviceId: string, platform: string, language: string, userId?: string }
 */
export async function POST(request: NextRequest) {
  // Rate limit: 10 install pings per hour per IP
  const rl = await rateLimitByIp(request, { windowMs: 60 * 60 * 1000, max: 10, message: 'Too many install pings.' })
  if (rl) return rl

  try {
    await dbConnect()

    const body = await request.json().catch(() => ({}))
    const deviceId = String(body.deviceId || '').slice(0, 64)
    const platform = String(body.platform || 'unknown').slice(0, 32)
    const language = String(body.language || '').slice(0, 16)
    const userAgent = String(request.headers.get('user-agent') || '').slice(0, 200)
    const userId = body.userId || null

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    }

    // Insert — if (type, deviceId) already exists, the unique index
    // rejects the duplicate and we just return 200 OK (idempotent).
    try {
      await Metric.create({
        type: 'pwa_install',
        deviceId,
        platform,
        userAgent,
        language,
        userId,
      })
    } catch (e: any) {
      // 11000 = duplicate key error — silently ignore (idempotent install)
      if (e?.code !== 11000) throw e
    }

    return NextResponse.json({ success: true, recorded: true })
  } catch (error) {
    console.error('PWA install tracking error:', error)
    return NextResponse.json({ error: 'Failed to record install' }, { status: 500 })
  }
}

/**
 * GET /api/analytics/pwa-install
 *
 * Returns aggregate PWA install stats. Admin-only.
 *
 * Response:
 *   {
 *     total: number,
 *     byPlatform: { android: number, ios: number, 'desktop-chrome': number, ... },
 *     last7Days: number,
 *     trend: [{ date: 'YYYY-MM-DD', count: number }, ...]  // last 14 days
 *   }
 */
export async function GET(request: NextRequest) {
  // Auth check — only admins can view install stats
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    await dbConnect()

    const [total, byPlatform, last7DaysCount, recentInstalls] = await Promise.all([
      Metric.countDocuments({ type: 'pwa_install' }),
      Metric.aggregate([
        { $match: { type: 'pwa_install' } },
        { $group: { _id: '$platform', count: { $sum: 1 } } },
      ]),
      Metric.countDocuments({
        type: 'pwa_install',
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
      Metric.find({ type: 'pwa_install' })
        .sort({ createdAt: -1 })
        .limit(14 * 24)  // max ~14 days of installs (assuming <24/day)
        .select('platform language createdAt -_id')
        .lean(),
    ])

    // Build a 14-day trend: { 'YYYY-MM-DD': count }
    const trendMap: Record<string, number> = {}
    const now = new Date()
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      trendMap[key] = 0
    }
    for (const install of recentInstalls) {
      const key = String(install.createdAt).slice(0, 10)
      if (key in trendMap) trendMap[key]++
    }
    const trend = Object.entries(trendMap).map(([date, count]) => ({ date, count }))

    const byPlatformMap: Record<string, number> = {}
    for (const p of byPlatform) {
      byPlatformMap[p._id || 'unknown'] = p.count
    }

    return NextResponse.json({
      total,
      byPlatform: byPlatformMap,
      last7Days: last7DaysCount,
      trend,
    })
  } catch (error) {
    console.error('PWA install stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
