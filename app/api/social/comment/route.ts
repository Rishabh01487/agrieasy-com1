import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import Notification from '@/lib/models/Notification'
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

        const pid = objectIdSchema.safeParse(body.postId)
        if (!pid.success) return validationError('Invalid postId', pid.error.issues.map(i => ({ field: 'postId', message: i.message })))

        const cv = validateBody(commentSchema, { content: body.text, parentId: body.parentId })
        if (!cv.success) return validationError('Validation failed', cv.errors)

        const postId = pid.data
        const content = cv.data.content
        const parentId = cv.data.parentId

        const post = await Post.findById(postId)
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        post.comments.push({
            userId: auth.user.userId,
            text: content,
            parentId: parentId || null,
            createdAt: new Date(),
        })
        post.commentsCount = post.comments.length
        await post.save()

        const saved = post.comments[post.comments.length - 1]
        await logAudit({
            userId: auth.user.userId, action: 'CREATE', resource: 'Comment',
            resourceId: postId, details: { commentId: saved._id?.toString(), parentId: parentId || null },
            request: req,
        })

        // Notify the post owner (unless they commented on their own post)
        const postOwnerId = post.userId.toString()
        if (postOwnerId !== auth.user.userId && Notification) {
            await Notification.create({
                userId: postOwnerId,
                actorId: auth.user.userId,
                type: 'comment',
                postId: post._id,
                commentId: saved._id,
                text: content,
            })
        }

        return NextResponse.json({ comment: saved }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }
}
