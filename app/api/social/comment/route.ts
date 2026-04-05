import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'

// POST /api/social/comment  { userId, postId, text }
export async function POST(req: NextRequest) {
    await dbConnect()
    try {
        const { userId, postId, text } = await req.json()
        if (!userId || !postId || !text?.trim()) return NextResponse.json({ error: 'userId, postId, and text required' }, { status: 400 })
        if (text.length > 500) return NextResponse.json({ error: 'Comment too long (max 500 chars)' }, { status: 400 })

        const post = await Post.findById(postId)
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        post.comments.push({ userId, text: text.trim(), createdAt: new Date() })
        post.commentsCount = post.comments.length
        await post.save()

        const saved = post.comments[post.comments.length - 1]
        return NextResponse.json({ comment: saved }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 })
    }
}
