import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import User from '@/lib/models/User'
import Follow from '@/lib/models/Follow'
import { authenticateRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')

        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        const auth = authenticateRequest(req)
        const viewerId = auth?.user.userId || searchParams.get('viewerId')

        const user = await User.findById(userId).select('farmerName firmName role phone address email createdAt').lean()
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const [posts, clips, savedPosts, followersCount, followingCount, isFollowing] = await Promise.all([
            Post.find({ userId, type: 'post', isActive: true }).sort({ createdAt: -1 }).limit(60).lean(),
            Post.find({ userId, type: 'krishiclip', isActive: true }).sort({ createdAt: -1 }).limit(60).lean(),
            viewerId && viewerId === userId
                ? Post.find({ savedBy: viewerId, isActive: true }).sort({ createdAt: -1 }).limit(60)
                    .populate('userId', 'farmerName firmName role').lean()
                : Promise.resolve([]),
            Follow.countDocuments({ followingId: userId }),
            Follow.countDocuments({ followerId: userId }),
            viewerId ? Follow.findOne({ followerId: viewerId, followingId: userId }) : null,
        ])

        const totalLikes = [...posts, ...clips].reduce((sum, p) => sum + (p.likesCount || 0), 0)

        return NextResponse.json({
            user,
            posts,
            clips,
            saved: savedPosts,
            stats: {
                postsCount: posts.length,
                clipsCount: clips.length,
                savedCount: savedPosts.length,
                followersCount,
                followingCount,
                totalLikes,
            },
            isFollowing: !!isFollowing,
            isOwnProfile: viewerId === userId,
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }
}
