import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { validationError } from '@/lib/api-response'
import { objectIdSchema } from '@/lib/validation'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ postId: string }> },
) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const { postId } = await params
        const v = objectIdSchema.safeParse(postId)
        if (!v.success) return validationError('Invalid postId', v.error.issues.map(i => ({ field: 'postId', message: i.message })))

        await dbConnect()
        const post = await Post.findById(v.data)
        if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

        if (!post.sharedBy.some((id: any) => id.toString() === auth.user.userId)) {
            post.sharedBy.push(auth.user.userId as any)
            post.sharedCount = (post.sharedCount || 0) + 1
            await post.save()
        }

        await logAudit({
            userId: auth.user.userId, action: 'CREATE', resource: 'Share',
            resourceId: post._id.toString(), request: req,
        })

        const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || ''}/agrisocial/post/${post._id}`
        return NextResponse.json({ success: true, sharedCount: post.sharedCount, shareUrl })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to track share' }, { status: 500 })
    }
}
