import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized, forbidden } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { invalidate } from '@/lib/cache'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const auth = authenticateRequest(request, ['admin'])
  if (!auth) return unauthorized()
  if (!auth.roleMatch) return forbidden()

  const { postId } = await params
  await dbConnect()

  try {
    const post = await Post.findByIdAndDelete(postId)
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

    await logAudit({ userId: auth.user.userId, action: 'DELETE', resource: 'Post', resourceId: postId, details: { adminAction: true }, request })

    await invalidate('admin:stats', 'admin')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin delete post error:', error)
    return NextResponse.json({ error: 'Failed to delete post' }, { status: 500 })
  }
}
