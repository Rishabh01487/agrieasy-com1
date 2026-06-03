import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import User from '@/lib/models/User'
import Follow from '@/lib/models/Follow'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const page = parseInt(searchParams.get('page') || '1')
        const category = searchParams.get('category')
        const all = searchParams.get('all') === 'true'
        const limit = 15
        const skip = (page - 1) * limit
        const query: Record<string, unknown> = { isActive: true, type: 'post' }

        if (category && category !== 'all') query.category = category

        if (userId && !all) {
            const following = await Follow.find({ followerId: userId }).select('followingId')
            const followingIds = following.map(f => f.followingId)

            if (followingIds.length > 0) {
                followingIds.push(userId as unknown as typeof followingIds[0])
                query.userId = { $in: followingIds }
            }
        }

        const posts = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'farmerName firmName role phone')
            .lean()

        return NextResponse.json({ posts, total: posts.length })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 10, message: 'Slow down! Too many posts.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()
        const { type, mediaUrl, mediaType, caption, hashtags, category, location } = body

        if (!type || !['post', 'krishiclip'].includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
        if (!caption && !mediaUrl) return NextResponse.json({ error: 'Add a caption or media' }, { status: 400 })

        const user = await User.findById(auth.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const extractedTags = caption ? (caption.match(/#\w+/g) || []).map((t: string) => t.toLowerCase()) : []
        const allTags = [...new Set([...(hashtags || []), ...extractedTags])]

        const post = await Post.create({
            userId: auth.userId, type, mediaUrl: mediaUrl || '', mediaType: mediaType || 'text',
            caption: caption || '', hashtags: allTags, category: category || 'general',
            location: location || '',
        })

        await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Post', resourceId: post._id.toString(), details: { type, category }, request: req })

        return NextResponse.json({ post }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }
}
