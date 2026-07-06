import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { parsePagination, paginationMeta } from '@/lib/api-response'
import { SOCIAL } from '@/lib/config'
import { get as cacheGet } from '@/lib/cache'

// GET /api/social/explore?category=&type=&page=
export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, SOCIAL.EXPLORE_PAGE_SIZE)
        const category = searchParams.get('category') || 'all'
        const type = searchParams.get('type') || 'all'

        const cacheKey = `explore:p${page}:l${limit}:cat${category}:t${type}`

        const fetchExplore = async () => {
            const query: Record<string, unknown> = { isActive: true }
            if (category && category !== 'all') query.category = category
            if (type && type !== 'all') query.type = type

            const total = await Post.countDocuments(query)
            const posts = await Post.find(query)
                .sort({ likesCount: -1, createdAt: -1 })   // trending first
                .skip(skip)
                .limit(limit)
                .populate('userId', 'farmerName firmName role')
                .lean()

            return { success: true, data: { posts }, meta: paginationMeta(page, limit, total) }
        }

        const result = await cacheGet(cacheKey, fetchExplore, { ttl: 120, prefix: 'explore' })
        return NextResponse.json(result ?? await fetchExplore())
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch explore' }, { status: 500 })
    }
}
