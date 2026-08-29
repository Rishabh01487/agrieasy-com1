import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Metric from '@/lib/models/Metric'
import { rateLimitByIp } from '@/lib/rate-limit'
import { sendAdminAlert } from '@/lib/email'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'

/**
 * POST /api/analytics/pwa-install
 *
 * Records a PWA install event. Idempotent per deviceId — if the same
 * device installs twice (e.g. uninstalls then reinstalls), the second
 * call is silently ignored thanks to the unique index on (type, deviceId).
 *
 * On the FIRST install from a given device, also fires an email alert
 * to ADMIN_EMAIL so you get notified in real-time. Configure via SMTP_*
 * env vars — if email is not configured, the alert is silently skipped.
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
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'unknown'

    if (!deviceId) {
      return NextResponse.json({ error: 'deviceId required' }, { status: 400 })
    }

    // Insert — if (type, deviceId) already exists, the unique index
    // rejects the duplicate and we just return 200 OK (idempotent).
    let isNewInstall = false
    try {
      await Metric.create({
        type: 'pwa_install',
        deviceId,
        platform,
        userAgent,
        language,
        userId,
      })
      isNewInstall = true
    } catch (e: any) {
      // 11000 = duplicate key error — silently ignore (idempotent install)
      if (e?.code !== 11000) throw e
    }

    // Fire email alert ONLY for new installs (not re-installs from same device)
    if (isNewInstall) {
      // Fire-and-forget — don't block the response on email delivery
      sendInstallAlert({ platform, language, userAgent, ip, userId }).catch((err) => {
        console.error('[pwa-install] email alert failed:', err instanceof Error ? err.message : String(err))
      })
    }

    return NextResponse.json({ success: true, recorded: isNewInstall })
  } catch (error) {
    console.error('PWA install tracking error:', error)
    return NextResponse.json({ error: 'Failed to record install' }, { status: 500 })
  }
}

/**
 * Send a "new PWA install" email to the admin.
 * Fire-and-forget — caller should .catch() but not await.
 */
async function sendInstallAlert(opts: {
  platform: string
  language: string
  userAgent: string
  ip: string
  userId: string | null
}): Promise<void> {
  const { platform, language, userAgent, ip, userId } = opts

  // Get the running total so we can say "Install #N"
  let totalInstalls = 0
  try {
    totalInstalls = await Metric.countDocuments({ type: 'pwa_install' })
  } catch {
    // ignore — we'd rather send the email without the count than not send it
  }

  const time = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
  const platformLabel = prettyPlatform(platform)

  const subject = `🎉 AgriEasy PWA installed — Install #${totalInstalls}`
  const text = [
    `New PWA install!`,
    ``,
    `Install number:  #${totalInstalls}`,
    `When:            ${time} IST`,
    `Platform:        ${platformLabel}`,
    `Language:        ${language || 'unknown'}`,
    `IP address:      ${ip}`,
    `Logged-in user:  ${userId || 'not logged in'}`,
    `User agent:      ${userAgent}`,
    ``,
    `View full stats at /admin`,
  ].join('\n')

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
      <div style="background: linear-gradient(135deg, #AC3B61 0%, #123C69 100%); color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
        <h1 style="margin: 0; font-size: 18px; font-weight: 700;">🎉 New PWA Install!</h1>
        <p style="margin: 4px 0 0; font-size: 13px; opacity: 0.9;">Install #${totalInstalls} · ${time} IST</p>
      </div>
      <div style="background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
        <table style="width: 100%; font-size: 14px; color: #1f2937;">
          <tr><td style="padding: 6px 0; color: #6b7280; width: 140px;">Platform</td><td style="padding: 6px 0; font-weight: 600;">${platformLabel}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Language</td><td style="padding: 6px 0;">${language || 'unknown'}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">IP address</td><td style="padding: 6px 0; font-family: monospace; font-size: 13px;">${ip}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">Logged-in user</td><td style="padding: 6px 0;">${userId || 'not logged in'}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280;">User agent</td><td style="padding: 6px 0; font-family: monospace; font-size: 12px; color: #6b7280;">${userAgent}</td></tr>
        </table>
        <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #f3f4f6;">
          <a href="${process.env.APP_URL || 'http://localhost:3000'}/admin" style="display: inline-block; padding: 10px 20px; background: #AC3B61; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 13px;">View full stats →</a>
        </div>
      </div>
      <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 16px;">AgriEasy Alerts · you received this because ADMIN_EMAIL is set</p>
    </div>
  `

  await sendAdminAlert(subject, text, html)
}

function prettyPlatform(p: string): string {
  const map: Record<string, string> = {
    'android': '📱 Android',
    'ios': '🍎 iOS (iPhone/iPad)',
    'desktop-chrome': '💻 Desktop Chrome',
    'desktop-edge': '💻 Desktop Edge',
    'desktop-firefox': '💻 Desktop Firefox',
    'desktop-safari': '💻 Desktop Safari',
    'desktop-other': '💻 Desktop (other browser)',
    'other': '🌐 Other',
    'unknown': '❓ Unknown',
  }
  return map[p] || p
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
  // SECURITY: previously this only checked that a Bearer header was PRESENT
  // — `Authorization: Bearer x` (any string) passed. Now we actually
  // verify the JWT and require admin role via `authenticateRequest`.
  const auth = authenticateRequest(request, ['admin'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden('Admin access required')

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
