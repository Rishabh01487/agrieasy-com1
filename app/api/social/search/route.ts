import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { escapeRegex } from '@/lib/auth-fetch'

// GET /api/social/search?q=boys&kind=users|hashtags|all
export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const { searchParams } = new URL(req.url)
        const q = (searchParams.get('q') || '').trim()
        const kind = searchParams.get('kind') || 'all'

        if (!q) return NextResponse.json({ success: true, data: { users: [], hashtags: [] } })

        await dbConnect()
        const safe = escapeRegex(q)
        const regex = new RegExp(safe, 'i')

        const [users, hashtags] = await Promise.all([
            (kind === 'all' || kind === 'users')
                ? User.find({
                    $or: [
                        { farmerName: { $regex: regex } },
                        { firmName: { $regex: regex } },
                        { phone: { $regex: regex } },
                    ],
                }).select('farmerName firmName role phone').limit(20).lean()
                : Promise.resolve([]),
            (kind === 'all' || kind === 'hashtags')
                ? Post.aggregate([
                    { $unwind: '$hashtags' },
                    { $match: { hashtags: { $regex: regex } } },
                    { $group: { _id: '$hashtags', count: { $sum: 1 } } },
                    { $sort: { count: -1 } },
                    { $limit: 20 },
                ])
                : Promise.resolve([]),
        ])

        return NextResponse.json({
            success: true,
            data: {
                users,
                hashtags: hashtags.map((h: any) => ({ tag: h._id, count: h.count })),
            },
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to search' }, { status: 500 })
    }
}
