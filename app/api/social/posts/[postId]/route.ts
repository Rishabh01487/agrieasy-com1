import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params

  try {
    await dbConnect()
    const post = await Post.findById(postId)
      .populate('userId', 'farmerName firmName role profilePic')
      .populate('comments.userId', 'farmerName firmName profilePic')
      .lean()

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

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
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Slow down!' })
    if (rl) return rl

    await dbConnect()

    const post = await Post.findById(postId)
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    if (post.userId.toString() !== auth.user.userId) return forbidden('Not authorized to delete this post')

    await Post.findByIdAndDelete(postId)
    await logAudit({ userId: auth.user.userId, action: 'DELETE', resource: 'Post', resourceId: postId, request })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
