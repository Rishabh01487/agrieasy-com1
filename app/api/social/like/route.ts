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

        const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 30, message: 'Slow down!' })
        if (rl) return rl

        await dbConnect()
        const { postId } = await req.json()
        if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

        const post = await Post.findById(postId)
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        const alreadyLiked = post.likes.some((id: { toString: () => string }) => id.toString() === auth.userId)

        if (alreadyLiked) {
            post.likes = post.likes.filter((id: { toString: () => string }) => id.toString() !== auth.userId)
            post.likesCount = Math.max(0, post.likesCount - 1)
        } else {
            post.likes.push(auth.userId)
            post.likesCount = post.likes.length
        }

        await post.save()
        await logAudit({ userId: auth.userId, action: alreadyLiked ? 'UPDATE' : 'CREATE', resource: 'Like', resourceId: postId, details: { liked: !alreadyLiked }, request: req })

        return NextResponse.json({ liked: !alreadyLiked, likesCount: post.likesCount })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
    }
}
