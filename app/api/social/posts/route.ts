import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import Follow from '@/lib/models/Follow'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { parsePagination, paginationMeta, validationError } from '@/lib/api-response'
import { validateBody, createPostSchema } from '@/lib/validation'

// GET /api/social/posts
//   ?page=&limit=&category=&userId=&feed=following|ranked|latest
//
// Instagram-style feed:
//   - feed=following  → posts from people the viewer follows, ranked, then latest
//   - feed=ranked     → ranked across the whole platform (Explore-style top posts mixed in)
//   - feed=latest     → chronological (default for backward compat)
export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, 15)
        const category = searchParams.get('category')
        const feedParam = searchParams.get('feed') || 'latest'
        const userIdParam = searchParams.get('userId')
        // includeClips=true (default) mixes krishiclips into the feed so users
        // see their own clips + others' clips alongside regular posts. The
        // dedicated /agrisocial/clips page still exists for the vertical
        // video experience. Pass ?includeClips=false to get posts only.
        const includeClips = searchParams.get('includeClips') !== 'false'

        const query: Record<string, unknown> = { isActive: true }
        if (includeClips) {
            query.type = { $in: ['post', 'krishiclip'] }
        } else {
            query.type = 'post'
        }
        if (category && category !== 'all') query.category = category

        let posts: any[] = []

        if (feedParam === 'following' && userIdParam) {
            // Following feed: pull the list of followee IDs and query their posts
            const followDocs = await Follow.find({ followerId: userIdParam }).select('followingId').lean()
            const followingIds = followDocs.map(f => f.followingId)
            // Always include the viewer's own posts
            followingIds.push(userIdParam as any)

            query.userId = { $in: followingIds }

            // Mix: top 60% ranked, 40% latest (so the feed feels fresh AND surfaces hits)
            const rankedCount = Math.ceil(limit * 0.6)
            const latestCount = limit - rankedCount

            const [ranked, latest] = await Promise.all([
                Post.find(query).sort({ rankScore: -1, createdAt: -1 }).skip(skip).limit(rankedCount)
                    .populate('userId', 'farmerName firmName role profilePic').lean(),
                Post.find(query).sort({ createdAt: -1 }).skip(skip + rankedCount).limit(latestCount)
                    .populate('userId', 'farmerName firmName role profilePic').lean(),
            ])
            // Interleave so the feed alternates ranked / fresh
            const merged: any[] = []
            for (let i = 0; i < Math.max(ranked.length, latest.length); i++) {
                if (ranked[i]) merged.push(ranked[i])
                if (latest[i]) merged.push(latest[i])
            }
            posts = merged
        } else if (feedParam === 'ranked') {
            posts = await Post.find(query)
                .sort({ rankScore: -1, createdAt: -1 })
                .skip(skip).limit(limit)
                .populate('userId', 'farmerName firmName role profilePic').lean()
        } else {
            posts = await Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip).limit(limit)
                .populate('userId', 'farmerName firmName role profilePic').lean()
        }

        const total = await Post.countDocuments(query)
        return NextResponse.json({ success: true, data: { posts }, meta: paginationMeta(page, limit, total) })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }
}

// POST /api/social/posts — create a new post (single image, carousel, video, or YouTube)
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

        // Detect YouTube URL → store as youtube media type
        const firstUrl = data.mediaUrls?.[0] || ''
        const ytMatch = firstUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)
        const mediaType: 'image' | 'video' | 'youtube' | 'text' =
            body.mediaType && ['image', 'video', 'youtube', 'text'].includes(body.mediaType)
                ? body.mediaType
                : (ytMatch ? 'youtube' : (firstUrl ? 'image' : 'text'))

        const post = await Post.create({
            userId: auth.user.userId,
            type: data.type,
            mediaUrl: firstUrl,
            mediaUrls: data.mediaUrls || [],
            mediaType,
            caption: data.content || '',
            hashtags: data.hashtags,
            category: data.category,
            location: data.location || '',
        })

        await logAudit({
            userId: auth.user.userId, action: 'CREATE', resource: 'Post',
            resourceId: post._id.toString(),
            details: { type: data.type, category: data.category, mediaType },
            request: req,
        })

        // Notify followers that the user posted (skip krishiclips — they go to the clips tab)
        if (post.type === 'post') {
            const followers = await Follow.find({ followingId: auth.user.userId }).select('followerId').lean()
            if (followers.length > 0 && Notification) {
                await Notification.insertMany(followers.map(f => ({
                    userId: f.followerId,
                    actorId: auth.user.userId,
                    type: 'story' as any, // 'new post from someone you follow'
                    postId: post._id,
                    text: 'shared a new post',
                })))
            }
        }

        return NextResponse.json({ post }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }
}
