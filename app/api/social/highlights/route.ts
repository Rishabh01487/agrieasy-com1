import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Highlight from '@/lib/models/Highlight'
import Story from '@/lib/models/Story'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError } from '@/lib/api-response'
import { sanitize } from '@/lib/validation'

// GET /api/social/highlights?userId=X — list highlights for a user
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        await dbConnect()
        const highlights = await Highlight.find({ userId }).sort({ createdAt: -1 }).lean()
        return NextResponse.json({ success: true, data: { highlights } })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch highlights' }, { status: 500 })
    }
}

// POST /api/social/highlights — create a highlight from active stories
// Body: { name, storyIds: [storyId1, storyId2, ...] }
export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many highlight actions.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()

        if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
            return validationError('Highlight name is required')
        }
        if (!body.storyIds || !Array.isArray(body.storyIds) || body.storyIds.length === 0) {
            return validationError('At least one story is required')
        }

        // Fetch the stories to embed in the highlight
        const stories = await Story.find({ _id: { $in: body.storyIds }, userId: auth.user.userId })
            .select('mediaUrl mediaType caption createdAt')
            .lean()

        if (stories.length === 0) {
            return validationError('No valid stories found')
        }

        const highlight = await Highlight.create({
            userId: auth.user.userId,
            name: sanitize(body.name).slice(0, 50),
            coverImage: stories[0]?.mediaUrl || '',
            stories: stories.map(s => ({
                mediaUrl: s.mediaUrl,
                mediaType: s.mediaType,
                caption: s.caption || '',
                createdAt: s.createdAt,
            })),
        })

        return NextResponse.json({ success: true, highlight }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create highlight' }, { status: 500 })
    }
}
