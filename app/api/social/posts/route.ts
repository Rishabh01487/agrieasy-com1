import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import User from '@/lib/models/User'
import Follow from '@/lib/models/Follow'

// GET /api/social/posts?userId=&page=&category=&all=true
export async function GET(req: NextRequest) {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const page = parseInt(searchParams.get('page') || '1')
    const category = searchParams.get('category')
    const all = searchParams.get('all') === 'true'
    const limit = 15
    const skip = (page - 1) * limit

    try {
        const query: Record<string, unknown> = { isActive: true, type: 'post' }

        // Add category filter if provided
        if (category && category !== 'all') query.category = category

        if (userId && !all) {
            // Get personalized feed: posts from followed users + own posts
            const following = await Follow.find({ followerId: userId }).select('followingId')
            const followingIds = following.map(f => f.followingId)

            if (followingIds.length > 0) {
                // Has follows — show personalized feed
                followingIds.push(userId as unknown as typeof followingIds[0])
                query.userId = { $in: followingIds }
            }
            // If no follows, don't restrict — show all posts (fall through)
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

// POST /api/social/posts
export async function POST(req: NextRequest) {
    await dbConnect()
    try {
        const body = await req.json()
        const { userId, type, mediaUrl, mediaType, caption, hashtags, category, location } = body

        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        if (!type || !['post', 'krishiclip'].includes(type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
        if (!caption && !mediaUrl) return NextResponse.json({ error: 'Add a caption or media' }, { status: 400 })

        const user = await User.findById(userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        // Parse hashtags from caption if not explicitly passed
        const extractedTags = caption ? (caption.match(/#\w+/g) || []).map((t: string) => t.toLowerCase()) : []
        const allTags = [...new Set([...(hashtags || []), ...extractedTags])]

        const post = await Post.create({
            userId, type, mediaUrl: mediaUrl || '', mediaType: mediaType || 'text',
            caption: caption || '', hashtags: allTags, category: category || 'general',
            location: location || '',
        })

        return NextResponse.json({ post }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }
}
