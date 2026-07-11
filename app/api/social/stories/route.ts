import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Story from '@/lib/models/Story'
import Follow from '@/lib/models/Follow'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError } from '@/lib/api-response'
import { validateBody, createStorySchema } from '@/lib/validation'

// GET /api/social/stories
export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()
        await dbConnect()

        const now = new Date()
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000) // 24h ago

        const followDocs = await Follow.find({ followerId: auth.user.userId }).select('followingId').lean()
        const followingIds = followDocs.map(f => f.followingId)
        followingIds.push(auth.user.userId as any)

        const stories = await Story.find({
            userId: { $in: followingIds },
            createdAt: { $gte: cutoff },
        }).sort({ createdAt: 1 }).lean()

        // Group by user
        const byUserMap = new Map<string, any>()
        for (const s of stories) {
            const uid = s.userId.toString()
            if (!byUserMap.has(uid)) {
                byUserMap.set(uid, {
                    userId: s.userId,
                    stories: [],
                    hasUnviewed: false,
                })
            }
            const entry = byUserMap.get(uid)
            const viewed = s.viewedBy?.some((v: any) => v.toString() === auth.user.userId)
            if (!viewed) entry.hasUnviewed = true
            entry.stories.push({
                _id: s._id,
                mediaUrl: s.mediaUrl,
                mediaType: s.mediaType,
                caption: s.caption,
                duration: s.duration,
                viewed,
                likesCount: s.likes?.length || 0,
                viewedByCount: s.viewedBy?.length || 0,
                createdAt: s.createdAt,
            })
        }

        // Populate user info
        const userIds = Array.from(byUserMap.keys())
        const users = await User.find({ _id: { $in: userIds } }).select('farmerName firmName role profilePic').lean()
        const userMap = new Map(users.map((u: any) => [u._id.toString(), u]))

        // Always include the viewer's own user data (for the "Your Story" circle)
        const viewerUser = await User.findById(auth.user.userId).select('farmerName firmName role profilePic').lean()
        if (viewerUser && !userMap.has(auth.user.userId)) {
            userMap.set(auth.user.userId, viewerUser)
        }

        const grouped = Array.from(byUserMap.values()).map((g) => ({
            ...g,
            user: userMap.get(g.userId.toString()),
        }))

        grouped.sort((a, b) => {
            if (a.userId.toString() === auth.user.userId) return -1
            if (b.userId.toString() === auth.user.userId) return 1
            if (a.hasUnviewed !== b.hasUnviewed) return a.hasUnviewed ? -1 : 1
            return 0
        })

        return NextResponse.json({ success: true, data: { stories: grouped, viewer: viewerUser } })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch stories' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Slow down! Too many stories.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()
        const v = validateBody(createStorySchema, body)
        if (!v.success) return validationError('Validation failed', v.errors)

        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
        const story = await Story.create({
            userId: auth.user.userId,
            mediaUrl: v.data.mediaUrl,
            mediaType: v.data.mediaType,
            caption: v.data.caption || '',
            duration: v.data.duration || 5,
            expiresAt,
        })

        await logAudit({
            userId: auth.user.userId, action: 'CREATE', resource: 'Story',
            resourceId: story._id.toString(), request: req,
        })

        return NextResponse.json({ story }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create story' }, { status: 500 })
    }
}
