import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params

  try {
    await dbConnect()
    const post = await Post.findById(postId)
      .populate('userId', 'farmerName firmName role phone')
      .populate('comments.userId', 'farmerName firmName')
      .lean()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch post' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params

  try {
    await dbConnect()
    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 })
    }

    const post = await Post.findById(postId)
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }
    if (post.userId.toString() !== userId) {
      return NextResponse.json({ error: 'Not authorized to delete this post' }, { status: 403 })
    }

    await Post.findByIdAndDelete(postId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
