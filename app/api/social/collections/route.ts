import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Collection from '@/lib/models/Collection'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError } from '@/lib/api-response'
import { sanitize } from '@/lib/validation'

// GET /api/social/collections — list all collections for the viewer
export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()
        const collections = await Collection.find({ userId: auth.user.userId })
            .sort({ updatedAt: -1 })
            .lean()

        // Populate cover post for each collection
        const populated = await Promise.all(collections.map(async (c) => {
            const coverPost = c.coverPostId
                ? await Post.findById(c.coverPostId).select('mediaUrl mediaType caption').lean()
                : c.postIds.length > 0
                    ? await Post.findById(c.postIds[0]).select('mediaUrl mediaType caption').lean()
                    : null
            return { ...c, coverPost, postCount: c.postIds.length }
        }))

        return NextResponse.json({ success: true, data: { collections: populated } })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch collections' }, { status: 500 })
    }
}

// POST /api/social/collections — create a new collection
// Body: { name, postId? }
export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 20, message: 'Too many collection actions.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()

        if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
            return validationError('Collection name is required')
        }

        const postIds = body.postId ? [body.postId] : []
        const collection = await Collection.create({
            userId: auth.user.userId,
            name: sanitize(body.name).slice(0, 100),
            postIds,
            coverPostId: body.postId || undefined,
        })

        return NextResponse.json({ success: true, collection }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create collection' }, { status: 500 })
    }
}
