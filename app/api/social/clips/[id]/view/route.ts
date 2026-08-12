import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest } from '@/lib/auth'
import { apiError, ErrorCodes } from '@/lib/api-response'

// POST /api/social/clips/[id]/view — increment views for a single clip
// Called from the client when a clip becomes active (IntersectionObserver isActive=true)
// This replaces the bulk increment-in-list-endpoint approach which fought with the cache.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return apiError(ErrorCodes.AUTH_REQUIRED, 'Authentication required')

        await dbConnect()
        const { id } = await params

        const updated = await Post.findByIdAndUpdate(
            id,
            { $inc: { views: 1 } },
            { select: 'views', lean: true }
        )

        if (!updated) return apiError(ErrorCodes.NOT_FOUND, 'Clip not found')

        return NextResponse.json({ success: true, data: { views: (updated.views || 0) + 1 } })
    } catch (e) {
        console.error(e)
        return apiError(ErrorCodes.INTERNAL_ERROR, 'Failed to record view')
    }
}
