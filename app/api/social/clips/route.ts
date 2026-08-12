import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { parsePagination, paginationMeta } from '@/lib/api-response'
import { SOCIAL } from '@/lib/config'
import { get as cacheGet } from '@/lib/cache'

export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, SOCIAL.CLIPS_PAGE_SIZE)
        const category = searchParams.get('category') || 'all'

        const cacheKey = `clips:p${page}:l${limit}:cat${category}`

        const fetchClips = async () => {
            const query: Record<string, unknown> = { isActive: true, type: 'krishiclip' }
            if (category && category !== 'all') query.category = category

            const total = await Post.countDocuments(query)
            // Instagram Reels uses an algorithmic feed (engagement-weighted),
            // not just chronological. Sort by rankScore (likes*5 + comments*8
            const clips = await Post.find(query)
                .sort({ rankScore: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'farmerName firmName role profilePic')
                .lean()

            return { clips, total }
        }

        // Reduce cache TTL from 120s to 15s so views count updates faster (Fix: Issue 3)
        const cached = await cacheGet(cacheKey, fetchClips, { ttl: 15, prefix: 'clips' })
        const { clips, total } = cached ?? await fetchClips()

        // NOTE: Per-clip view increment has been moved to a dedicated endpoint
        // POST /api/social/clips/[id]/view — called from the client when a clip becomes active.
        // This fixes Issue 3 where the bulk increment here fought with the cache, freezing the
        // displayed views count at a stale value for the entire cache window.

        return NextResponse.json({ success: true, data: { clips }, meta: paginationMeta(page, limit, total) })
    } catch (e: any) {
        console.error('Clips API error:', e)
        return NextResponse.json(
            { error: 'Failed to fetch clips', detail: e?.message || String(e), stack: process.env.NODE_ENV === 'development' ? e?.stack : undefined },
            { status: 500 }
        )
    }
}
