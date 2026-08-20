import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { validationError } from '@/lib/api-response'
import { objectIdSchema } from '@/lib/validation'

/**
 * POST /api/social/comment/like
 *
 * Toggles a like on a comment. Idempotent — if the user already liked the
 * comment, it unlikes it (removes their userId from the likes array).
 *
 * Body:
 *   { postId: string, commentId: string }
 *
 * Response:
 *   { liked: boolean, likesCount: number }
 *
 * This matches Instagram's behavior: tap the heart next to a comment to
 * like it, tap again to unlike.
 */
export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()
        const body = await req.json()

        const pid = objectIdSchema.safeParse(body.postId)
        if (!pid.success) return validationError('Invalid postId', pid.error.issues.map(i => ({ field: 'postId', message: i.message })))

        const cid = objectIdSchema.safeParse(body.commentId)
        if (!cid.success) return validationError('Invalid commentId', cid.error.issues.map(i => ({ field: 'commentId', message: i.message })))

        const postId = pid.data
        const commentId = cid.data
        const userId = auth.user.userId

        // Atomically toggle the like using MongoDB's $pull and $addToSet.
        // We first check if the user already liked to decide which op to run.
        const post = await Post.findById(postId).lean()
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        const comment = (post.comments as any[]).find(c => c._id.toString() === commentId.toString())
        if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 })

        const alreadyLiked = (comment.likes || []).some((id: any) => id.toString() === userId)

        if (alreadyLiked) {
            // Unlike — remove userId from likes array
            await Post.updateOne(
                { _id: postId, 'comments._id': commentId },
                { $pull: { 'comments.$.likes': userId } }
            )
            // Decrement likesCount (floor at 0)
            const updated = await Post.findById(postId).lean()
            const c = (updated?.comments as any[])?.find(x => x._id.toString() === commentId.toString())
            const newCount = Math.max(0, (c?.likes?.length || 0))
            await Post.updateOne(
                { _id: postId, 'comments._id': commentId },
                { $set: { 'comments.$.likesCount': newCount } }
            )
            await logAudit({ userId, action: 'UPDATE', resource: 'Comment', resourceId: commentId, details: { action: 'unlike' }, request: req })
            return NextResponse.json({ liked: false, likesCount: newCount })
        } else {
            // Like — add userId to likes array
            await Post.updateOne(
                { _id: postId, 'comments._id': commentId },
                { $addToSet: { 'comments.$.likes': userId } }
            )
            const updated = await Post.findById(postId).lean()
            const c = (updated?.comments as any[])?.find(x => x._id.toString() === commentId.toString())
            const newCount = c?.likes?.length || 0
            await Post.updateOne(
                { _id: postId, 'comments._id': commentId },
                { $set: { 'comments.$.likesCount': newCount } }
            )
            await logAudit({ userId, action: 'UPDATE', resource: 'Comment', resourceId: commentId, details: { action: 'like' }, request: req })
            return NextResponse.json({ liked: true, likesCount: newCount })
        }
    } catch (e) {
        console.error('Comment like error:', e)
        return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
    }
}
