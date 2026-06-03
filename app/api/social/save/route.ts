import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 20, message: 'Slow down!' })
    if (rl) return rl

    await dbConnect()
    const { postId } = await request.json()
    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

    const post = await Post.findById(postId)
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    if (post.savedBy.includes(auth.userId)) return NextResponse.json({ saved: true })

    post.savedBy.push(auth.userId)
    post.savedCount = (post.savedCount || 0) + 1
    await post.save()
    await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Save', resourceId: postId, request })

    return NextResponse.json({ saved: true, savedCount: post.savedCount })
  } catch {
    return NextResponse.json({ error: 'Failed to save post' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 20, message: 'Slow down!' })
    if (rl) return rl

    await dbConnect()
    const { searchParams } = new URL(request.url)
    const postId = searchParams.get('postId')

    if (!postId) return NextResponse.json({ error: 'postId required' }, { status: 400 })

    const post = await Post.findById(postId)
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const idx = post.savedBy.indexOf(auth.userId)
    if (idx === -1) return NextResponse.json({ saved: false })

    post.savedBy.splice(idx, 1)
    post.savedCount = Math.max(0, (post.savedCount || 0) - 1)
    await post.save()
    await logAudit({ userId: auth.userId, action: 'DELETE', resource: 'Save', resourceId: postId, request })

    return NextResponse.json({ saved: false, savedCount: post.savedCount })
  } catch {
    return NextResponse.json({ error: 'Failed to unsave post' }, { status: 500 })
  }
}
