import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { parsePagination, paginationMeta } from '@/lib/api-response'
import { SOCIAL } from '@/lib/config'

export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, SOCIAL.CLIPS_PAGE_SIZE)
        const category = searchParams.get('category') || 'all'

        const query: Record<string, unknown> = { isActive: true, type: 'krishiclip' }
        if (category && category !== 'all') query.category = category

        // Parallel fetch: clips + total count in the same roundtrip.
        // No bulk view increment — that was causing write-lock contention
        // and slowing down the clips page (every page load was firing
        // `Post.updateMany` on all returned clips). Views are now tracked
        // per-user via /api/social/clips/[id]/view when a clip becomes
        // visible in the viewport (see app/agrisocial/clips/page.tsx).
        const [clips, total] = await Promise.all([
            Post.find(query)
                .sort({ rankScore: -1, createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'farmerName firmName role profilePic')
                .lean(),
            Post.countDocuments(query),
        ])

        return NextResponse.json({ success: true, data: { clips }, meta: paginationMeta(page, limit, total) })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch clips' }, { status: 500 })
    }
}
