import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 10, message: 'Slow down! Too many comments.' })
        if (rl) return rl

        await dbConnect()
        const { postId, text } = await req.json()
        if (!postId || !text?.trim()) return NextResponse.json({ error: 'postId and text required' }, { status: 400 })
        if (text.length > 500) return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 })

        const post = await Post.findById(postId)
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        post.comments.push({ userId: auth.userId, text: text.trim(), createdAt: new Date() })
        post.commentsCount = post.comments.length
        await post.save()

        const saved = post.comments[post.comments.length - 1]
        await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Comment', resourceId: postId, details: { commentId: saved._id?.toString() }, request: req })

        return NextResponse.json({ comment: saved }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }
}
