import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'

export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    const { userId, postId } = await request.json()
    if (!userId || !postId) {
      return NextResponse.json({ error: 'userId and postId required' }, { status: 400 })
    }

    const post = await Post.findById(postId)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.savedBy.includes(userId)) {
      return NextResponse.json({ saved: true })
    }

    post.savedBy.push(userId)
    post.savedCount = (post.savedCount || 0) + 1
    await post.save()

    return NextResponse.json({ saved: true, savedCount: post.savedCount })
  } catch {
    return NextResponse.json({ error: 'Failed to save post' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await dbConnect()
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const postId = searchParams.get('postId')

    if (!userId || !postId) {
      return NextResponse.json({ error: 'userId and postId required' }, { status: 400 })
    }

    const post = await Post.findById(postId)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const idx = post.savedBy.indexOf(userId)
    if (idx === -1) {
      return NextResponse.json({ saved: false })
    }

    post.savedBy.splice(idx, 1)
    post.savedCount = Math.max(0, (post.savedCount || 0) - 1)
    await post.save()

    return NextResponse.json({ saved: false, savedCount: post.savedCount })
  } catch {
    return NextResponse.json({ error: 'Failed to unsave post' }, { status: 500 })
  }
}
