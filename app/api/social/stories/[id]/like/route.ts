import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Story from '@/lib/models/Story'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validationError } from '@/lib/api-response'
import { objectIdSchema } from '@/lib/validation'

// POST /api/social/stories/[id]/like — toggle like on a story
export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const { id } = await params
        const v = objectIdSchema.safeParse(id)
        if (!v.success) return validationError('Invalid storyId', v.error.issues.map(i => ({ field: 'id', message: i.message })))

        await dbConnect()
        const story = await Story.findById(v.data)
        if (!story) return NextResponse.json({ error: 'Story not found' }, { status: 404 })

        const alreadyLiked = story.likes.some((uid: any) => uid.toString() === auth.user.userId)

        if (alreadyLiked) {
            story.likes = story.likes.filter((uid: any) => uid.toString() !== auth.user.userId)
        } else {
            story.likes.push(auth.user.userId)
        }
        await story.save()

        return NextResponse.json({ liked: !alreadyLiked, likesCount: story.likes.length })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to toggle story like' }, { status: 500 })
    }
}
