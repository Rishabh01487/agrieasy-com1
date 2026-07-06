import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError } from '@/lib/api-response'
import { validateBody, commentSchema, objectIdSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Slow down! Too many comments.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()

        // Validate postId
        const pid = objectIdSchema.safeParse(body.postId)
        if (!pid.success) return validationError('Invalid postId', pid.error.issues.map(i => ({ field: 'postId', message: i.message })))

        // Validate comment content
        const cv = validateBody(commentSchema, { content: body.text })
        if (!cv.success) return validationError('Validation failed', cv.errors)

        const postId = pid.data
        const content = cv.data.content

        const post = await Post.findById(postId)
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        post.comments.push({ userId: auth.user.userId, text: content, createdAt: new Date() })
        post.commentsCount = post.comments.length
        await post.save()

        const saved = post.comments[post.comments.length - 1]
        await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Comment', resourceId: postId, details: { commentId: saved._id?.toString() }, request: req })

        return NextResponse.json({ comment: saved }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }
}
