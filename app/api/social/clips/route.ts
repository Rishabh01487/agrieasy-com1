import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { parsePagination, paginationMeta } from '@/lib/api-response'
import { SOCIAL } from '@/lib/config'
import { get as cacheGet } from '@/lib/cache'

// GET /api/social/clips?page=&category=
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
            const clips = await Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('userId', 'farmerName firmName role profilePic')
                .lean()

            return { clips, total }
        }

        const cached = await cacheGet(cacheKey, fetchClips, { ttl: 120, prefix: 'clips' })
        const { clips, total } = cached ?? await fetchClips()

        // Increment views for returned clips (side-effect — never cached)
        const ids = clips.map(c => c._id)
        if (ids.length > 0) {
            await Post.updateMany({ _id: { $in: ids } }, { $inc: { views: 1 } })
        }

        return NextResponse.json({ success: true, data: { clips }, meta: paginationMeta(page, limit, total) })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch clips' }, { status: 500 })
    }
}
