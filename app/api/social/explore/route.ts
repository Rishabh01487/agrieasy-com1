import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { parsePagination, paginationMeta } from '@/lib/api-response'
import { SOCIAL } from '@/lib/config'
import { get as cacheGet } from '@/lib/cache'
import { escapeRegex } from '@/lib/auth-fetch'

// GET /api/social/explore?category=&type=&page=
//   Optional ?tag= to filter by hashtag.
export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, SOCIAL.EXPLORE_PAGE_SIZE)
        const category = searchParams.get('category') || 'all'
        const type = searchParams.get('type') || 'all'
        const tag = searchParams.get('tag') || ''

        const cacheKey = `explore:p${page}:l${limit}:cat${category}:t${type}:tag${tag}`

        const fetchExplore = async () => {
            const query: Record<string, unknown> = { isActive: true }
            if (category && category !== 'all') query.category = category
            if (type && type !== 'all') query.type = type
            if (tag) {
                // Hashtag filter (case-insensitive, with or without leading #)
                const cleanTag = tag.replace(/^#/, '').trim()
                if (cleanTag) {
                    const safe = escapeRegex(cleanTag)
                    query.hashtags = { $regex: new RegExp(`^${safe}$`, 'i') }
                }
            }

            const total = await Post.countDocuments(query)
            const posts = await Post.find(query)
                .sort({ likesCount: -1, createdAt: -1 })   // trending first
                .skip(skip)
                .limit(limit)
                .populate('userId', 'farmerName firmName role')
                .lean()

            return { success: true, data: { posts }, meta: paginationMeta(page, limit, total) }
        }

        // Skip cache when filtering by tag (more dynamic)
        if (tag) {
            const result = await fetchExplore()
            return NextResponse.json(result)
        }

        const result = await cacheGet(cacheKey, fetchExplore, { ttl: 120, prefix: 'explore' })
        return NextResponse.json(result ?? await fetchExplore())
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch explore' }, { status: 500 })
    }
}
