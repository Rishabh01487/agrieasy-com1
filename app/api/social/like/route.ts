import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'

// POST /api/social/like  { userId, postId }
export async function POST(req: NextRequest) {
    await dbConnect()
    try {
        const { userId, postId } = await req.json()
        if (!userId || !postId) return NextResponse.json({ error: 'userId and postId required' }, { status: 400 })

        const post = await Post.findById(postId)
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        const alreadyLiked = post.likes.some((id: { toString: () => string }) => id.toString() === userId)

        if (alreadyLiked) {
            post.likes = post.likes.filter((id: { toString: () => string }) => id.toString() !== userId)
            post.likesCount = Math.max(0, post.likesCount - 1)
        } else {
            post.likes.push(userId)
            post.likesCount = post.likes.length
        }

        await post.save()
        return NextResponse.json({ liked: !alreadyLiked, likesCount: post.likesCount })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to toggle like' }, { status: 500 })
    }
}
