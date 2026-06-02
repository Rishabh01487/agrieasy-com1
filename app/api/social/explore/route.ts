import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'

// GET /api/social/explore?category=&type=&page=
export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const category = searchParams.get('category')
        const type = searchParams.get('type')
        const page = parseInt(searchParams.get('page') || '1')
        const limit = 18
        const skip = (page - 1) * limit
        const query: Record<string, unknown> = { isActive: true }
        if (category && category !== 'all') query.category = category
        if (type && type !== 'all') query.type = type

        const posts = await Post.find(query)
            .sort({ likesCount: -1, createdAt: -1 })   // trending first
            .skip(skip)
            .limit(limit)
            .populate('userId', 'farmerName firmName role')
            .lean()

        return NextResponse.json({ posts })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch explore' }, { status: 500 })
    }
}
