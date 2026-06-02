import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'

// GET /api/social/clips?page=&category=
export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const page = parseInt(searchParams.get('page') || '1')
        const category = searchParams.get('category')
        const limit = 10
        const skip = (page - 1) * limit
        const query: Record<string, unknown> = { isActive: true, type: 'krishiclip' }
        if (category && category !== 'all') query.category = category

        const clips = await Post.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'farmerName firmName role phone')
            .lean()

        // Increment views for returned clips
        const ids = clips.map(c => c._id)
        await Post.updateMany({ _id: { $in: ids } }, { $inc: { views: 1 } })

        return NextResponse.json({ clips })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch clips' }, { status: 500 })
    }
}
