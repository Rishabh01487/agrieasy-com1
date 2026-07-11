import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Story from '@/lib/models/Story'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validationError } from '@/lib/api-response'
import { objectIdSchema } from '@/lib/validation'

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

        const alreadyViewed = story.viewedBy.some((vid: any) => vid.toString() === auth.user.userId)
        if (!alreadyViewed) {
            story.viewedBy.push(auth.user.userId as any)
            await story.save()
        }

        return NextResponse.json({ success: true, viewed: true, viewersCount: story.viewedBy.length })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to mark story viewed' }, { status: 500 })
    }
}
