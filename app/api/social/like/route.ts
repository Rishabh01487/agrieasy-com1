import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError } from '@/lib/api-response'
import { objectIdSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 60, message: 'Slow down!' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()
        const v = objectIdSchema.safeParse(body.postId)
        if (!v.success) return validationError('Invalid postId', v.error.issues.map(i => ({ field: 'postId', message: i.message })))
        const postId = v.data

        const post = await Post.findById(postId)
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        const alreadyLiked = post.likes.some((id: { toString: () => string }) => id.toString() === auth.user.userId)

        if (alreadyLiked) {
            post.likes = post.likes.filter((id: { toString: () => string }) => id.toString() !== auth.user.userId)
            post.likesCount = Math.max(0, post.likesCount - 1)
        } else {
            post.likes.push(auth.user.userId)
            post.likesCount = post.likes.length
        }
        await post.save()

        await logAudit({
            userId: auth.user.userId,
            action: alreadyLiked ? 'UPDATE' : 'CREATE',
            resource: 'Like', resourceId: postId,
            details: { liked: !alreadyLiked },
            request: req,
        })

        // Notify the post owner (unless they liked their own post)
        const postOwnerId = post.userId.toString()
        if (!alreadyLiked && postOwnerId !== auth.user.userId && Notification) {
            await Notification.create({
                userId: postOwnerId,
                actorId: auth.user.userId,
                type: 'like',
                postId: post._id,
            })
        }

        return NextResponse.json({ liked: !alreadyLiked, likesCount: post.likesCount })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
    }
}
