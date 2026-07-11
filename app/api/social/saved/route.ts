import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { parsePagination, paginationMeta } from '@/lib/api-response'

export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, 24)

        await dbConnect()
        const query = { savedBy: auth.user.userId, isActive: true }
        const [total, posts] = await Promise.all([
            Post.countDocuments(query),
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip).limit(limit)
                .populate('userId', 'farmerName firmName role profilePic')
                .lean(),
        ])

        return NextResponse.json({ success: true, data: { posts }, meta: paginationMeta(page, limit, total) })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch saved posts' }, { status: 500 })
    }
}
