import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parsePagination, paginationMeta, validationError } from '@/lib/api-response'
import { validateBody, createPostSchema } from '@/lib/validation'
import { SOCIAL } from '@/lib/config'

export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, SOCIAL.DEFAULT_PAGE_SIZE)
        const category = searchParams.get('category')
        const query: Record<string, unknown> = { isActive: true, type: 'post' }

        if (category && category !== 'all') query.category = category

        // Feed shows all active posts (global timeline)

        const total = await Post.countDocuments(query)
        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'farmerName firmName role')
            .lean()

        return NextResponse.json({ success: true, data: { posts }, meta: paginationMeta(page, limit, total) })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Slow down! Too many posts.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()
        const v = validateBody(createPostSchema, body)
        if (!v.success) return validationError('Validation failed', v.errors)
        const data = v.data

        // Extra fields not in schema (backward compat)
        const { mediaType } = body

        const user = await User.findById(auth.user.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const post = await Post.create({
            userId: auth.user.userId, type: data.type,
            mediaUrl: data.mediaUrls?.[0] || '', mediaType: mediaType || 'text',
            caption: data.content || '',
            hashtags: data.hashtags, category: data.category,
            location: data.location || '',
            cropTags: data.cropTags,
        })

        await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Post', resourceId: post._id.toString(), details: { type: data.type, category: data.category }, request: req })

        return NextResponse.json({ post }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }
}
