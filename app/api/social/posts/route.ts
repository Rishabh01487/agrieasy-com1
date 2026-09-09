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
// Helper: try to populate userId, but if it fails (e.g. corrupt post
// referencing a deleted user), fall back to returning the post with
// userId as a raw ObjectId. The frontend handles this via the
// isDeletedUser check (post.userId is not an object → render as
// "Unknown User"). This prevents a single bad post from breaking the
// entire feed.
async function safePopulate(posts: any[]): Promise<any[]> {
    try {
        // Manual populate so we can catch per-post errors
        const populated = await Post.populate(posts, {
            path: 'userId',
            select: 'farmerName firmName role profilePic',
        })
        // Replace any null userId with a placeholder so the frontend's
        // isDeletedUser check (typeof post.userId !== 'object') still works.
        return populated.map((p: any) => ({
            ...p,
            userId: p.userId && typeof p.userId === 'object' ? p.userId : null,
        }))
    } catch (e) {
        console.error('populate failed, returning raw posts:', e)
        return posts
    }
}

export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, 15)
        const category = searchParams.get('category')
        const feedParam = searchParams.get('feed') || 'latest'
        const userIdParam = searchParams.get('userId')
        // includeClips=true (default) mixes krishiclips into the feed so users
        // see their own clips + others' clips alongside regular posts.
        const includeClips = searchParams.get('includeClips') !== 'false'

        // Build the query — use $in to include both post + krishiclip types
        // when includeClips is on. If a post has a corrupt type (null, wrong
        // case, etc.), Mongoose's enum validation will throw at the model
        // level — but only on save, not on find. So corrupt-type posts in
        // the DB will still be found + returned (just with a non-matching
        // type field). The isDeletedUser check in the frontend handles
        // them gracefully.
        const query: Record<string, unknown> = { isActive: true }
        if (includeClips) {
            query.type = { $in: ['post', 'krishiclip'] }
        } else {
            query.type = 'post'
        }
        if (category && category !== 'all') query.category = category

        let posts: any[] = []

        if (feedParam === 'following' && userIdParam) {
            const followDocs = await Follow.find({ followerId: userIdParam }).select('followingId').lean()
            const followingIds = followDocs.map(f => f.followingId)
            followingIds.push(userIdParam as any)

            query.userId = { $in: followingIds }

            const rankedCount = Math.ceil(limit * 0.6)
            const latestCount = limit - rankedCount

            // Find without populate first (avoids crash on corrupt user refs)
            const [ranked, latest] = await Promise.all([
                Post.find(query).sort({ rankScore: -1, createdAt: -1 }).skip(skip).limit(rankedCount).lean(),
                Post.find(query).sort({ createdAt: -1 }).skip(skip + rankedCount).limit(latestCount).lean(),
            ])
            const merged: any[] = []
            for (let i = 0; i < Math.max(ranked.length, latest.length); i++) {
                if (ranked[i]) merged.push(ranked[i])
                if (latest[i]) merged.push(latest[i])
            }
            posts = await safePopulate(merged)
        } else if (feedParam === 'ranked') {
            const raw = await Post.find(query)
                .sort({ rankScore: -1, createdAt: -1 })
                .skip(skip).limit(limit).lean()
            posts = await safePopulate(raw)
        } else {
            const raw = await Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip).limit(limit).lean()
            posts = await safePopulate(raw)
        }

        const total = await Post.countDocuments(query).catch(() => 0)
        return NextResponse.json({ success: true, data: { posts }, meta: paginationMeta(page, limit, total) })
    } catch (e) {
        console.error('Failed to fetch posts:', e)
        // Return empty array instead of 500 so the feed doesn't break
        // the entire AgriSocial page
        return NextResponse.json({
            success: true,
            data: { posts: [] },
            meta: { page: 1, limit: 15, total: 0, totalPages: 0 },
        })
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

        // Invalidate clips + explore cache so newly uploaded krishiclips appear immediately (Fix: Issue 1)
        if (post.type === 'krishiclip') {
            try {
                const { invalidateByPrefix } = await import('@/lib/cache')
                await invalidateByPrefix('clips')
                await invalidateByPrefix('explore')
            } catch { /* cache invalidation is best-effort */ }
        }

        return NextResponse.json({ post }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create post' }, { status: 500 })
    }
}
