import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest } from '@/lib/auth'

/** Hash an IP for anonymous-view dedup (no PII stored). */
function hashIp(ip: string): string {
  let h = 0
  for (let i = 0; i < ip.length; i++) {
    h = ((h << 5) - h + ip.charCodeAt(i)) | 0
  }
  return 'ip_' + Math.abs(h).toString(36)
}

function getIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || req.headers.get('x-real-ip')
    || '127.0.0.1'
}

/**
 * POST /api/social/clips/[id]/view
 *
 * Records a UNIQUE view for the given clip:
 *   - If the viewer is logged in → adds their userId to `viewedBy` if not
 *     already there. If already there, no-op (idempotent).
 *   - If anonymous → hashes the IP and adds to `viewedByIpHash` if not
 *     already there.
 *   - Increments `views` counter ONLY when this is a new unique viewer.
 *   - Returns the current view count.
 *
 * This endpoint is idempotent: the same user calling it 100 times for the
 * same clip results in `views` being incremented exactly once.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    if (!id) return NextResponse.json({ error: 'Missing clip id' }, { status: 400 })

    await dbConnect()

    // Identify viewer from JWT (Authorization header or ?userId= query).
    let viewerUserId: string | null = null
    const auth = authenticateRequest(req)
    if (auth?.user?.userId) {
      viewerUserId = auth.user.userId
    } else {
      const url = new URL(req.url)
      const uidParam = url.searchParams.get('userId')
      if (uidParam && /^[0-9a-fA-F]{24}$/.test(uidParam)) viewerUserId = uidParam
    }

    const ipHash = hashIp(getIp(req))
    const useUserId = !!viewerUserId

    // Check if this viewer has already viewed this clip.
    // For logged-in users: check viewedBy array. For anonymous: check viewedByIpHash.
    const post: any = await Post.findById(id)
      .select(useUserId ? 'viewedBy' : 'viewedByIpHash')
      .lean()
    if (!post) return NextResponse.json({ error: 'Clip not found' }, { status: 404 })

    const alreadyViewed = useUserId
      ? (post.viewedBy || []).some((u: any) => (u?.toString?.() || u) === viewerUserId)
      : (post.viewedByIpHash || []).includes(ipHash)

    if (alreadyViewed) {
      // Idempotent — don't increment the counter, just return current count
      const fullPost: any = await Post.findById(id).select('views').lean()
      return NextResponse.json({ success: true, views: fullPost?.views || 0, alreadyViewed: true })
    }

    // New unique view — add to dedup array + increment counter atomically
    const updated: any = await Post.findByIdAndUpdate(
      id,
      {
        $addToSet: useUserId ? { viewedBy: viewerUserId } : { viewedByIpHash: ipHash },
        $inc: { views: 1 },
      },
      { new: true, select: 'views' },
    ).lean()

    return NextResponse.json({ success: true, views: updated?.views || 1, alreadyViewed: false })
  } catch (e) {
    console.error('Clip view error:', e)
    return NextResponse.json({ error: 'Failed to record view' }, { status: 500 })
  }
}
