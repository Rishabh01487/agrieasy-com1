import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import Follow from '@/lib/models/Follow'
import Post from '@/lib/models/Post'
import { authenticateRequest, unauthorized } from '@/lib/auth'

// GET /api/social/suggested
//   Returns users the viewer is NOT following yet, ranked by:
//   - mutual follower count (most-shared followers first)
export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()

        const followedDocs = await Follow.find({ followerId: auth.user.userId }).select('followingId').lean()
        const alreadyFollowing = new Set(followedDocs.map(f => f.followingId.toString()))
        alreadyFollowing.add(auth.user.userId)

        const mutualFollows = await Follow.aggregate([
            { $match: { followerId: auth.user.userId } },
            { $lookup: { from: 'follows', localField: 'followingId', foreignField: 'followerId', as: 'mutuals' } },
            { $unwind: '$mutuals' },
            { $group: { _id: '$mutuals.followingId', mutualCount: { $sum: 1 } } },
            { $match: { _id: { $ne: auth.user.userId } } },
            { $sort: { mutualCount: -1 } },
            { $limit: 20 },
        ])

        const mutualIds = mutualFollows.map((m: any) => m._id)
        const mutualCountMap = new Map(mutualFollows.map((m: any) => [m._id.toString(), m.mutualCount]))

        const activePosters = await Post.aggregate([
            { $match: { createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
            { $group: { _id: '$userId', postCount: { $sum: 1 }, totalLikes: { $sum: '$likesCount' } } },
            { $sort: { totalLikes: -1 } },
            { $limit: 30 },
        ])
        const activeIds = activePosters.map((p: any) => p._id)
        const activeMap = new Map(activePosters.map((p: any) => [p._id.toString(), { postCount: p.postCount, totalLikes: p.totalLikes }]))

        const candidateIds = Array.from(new Set([...mutualIds, ...activeIds]))
            .filter((id: any) => !alreadyFollowing.has(id.toString()))
            .slice(0, 12)

        if (candidateIds.length === 0) {
            const fallback = await User.find({ _id: { $nin: Array.from(alreadyFollowing) } })
                .select('farmerName firmName role')
                .limit(10).lean()
            return NextResponse.json({ success: true, data: { users: fallback.map((u: any) => ({ ...u, mutualCount: 0, postCount: 0 })) } })
        }

        const users = await User.find({ _id: { $in: candidateIds } })
            .select('farmerName firmName role').lean()
        const userMap = new Map(users.map((u: any) => [u._id.toString(), u]))

        const data = candidateIds.map((id: any) => {
            const u = userMap.get(id.toString())
            if (!u) return null
            return {
                ...u,
                mutualCount: mutualCountMap.get(id.toString()) || 0,
                postCount: activeMap.get(id.toString())?.postCount || 0,
            }
        }).filter(Boolean)

        return NextResponse.json({ success: true, data: { users: data } })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch suggested users' }, { status: 500 })
    }
}
