import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError } from '@/lib/api-response'
import { objectIdSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 20, message: 'Slow down!' })
    if (rl) return rl

    await dbConnect()
    const body = await request.json()
    const v = objectIdSchema.safeParse(body.postId)
    if (!v.success) return validationError('Invalid postId', v.error.issues.map(i => ({ field: 'postId', message: i.message })))
    const postId = v.data

    const post = await Post.findById(postId)
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    if (post.savedBy.includes(auth.user.userId)) return NextResponse.json({ saved: true })

    post.savedBy.push(auth.user.userId)
    post.savedCount = (post.savedCount || 0) + 1
    await post.save()
    await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Save', resourceId: postId, request })

    return NextResponse.json({ saved: true, savedCount: post.savedCount })
  } catch {
    return NextResponse.json({ error: 'Failed to save post' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 20, message: 'Slow down!' })
    if (rl) return rl

    await dbConnect()
    const { searchParams } = new URL(request.url)
    let rawPostId = searchParams.get('postId')
    if (!rawPostId) {
      try {
        const body = await request.json()
        rawPostId = body.postId
      } catch { /* no body */ }
    }

    const v = objectIdSchema.safeParse(rawPostId)
    if (!v.success) return validationError('Invalid postId', v.error.issues.map(i => ({ field: 'postId', message: i.message })))
    const postId = v.data

    const post = await Post.findById(postId)
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    const idx = post.savedBy.indexOf(auth.user.userId)
    if (idx === -1) return NextResponse.json({ saved: false })

    post.savedBy.splice(idx, 1)
    post.savedCount = Math.max(0, (post.savedCount || 0) - 1)
    await post.save()
    await logAudit({ userId: auth.user.userId, action: 'DELETE', resource: 'Save', resourceId: postId, request })

    return NextResponse.json({ saved: false, savedCount: post.savedCount })
  } catch {
    return NextResponse.json({ error: 'Failed to unsave post' }, { status: 500 })
  }
}
