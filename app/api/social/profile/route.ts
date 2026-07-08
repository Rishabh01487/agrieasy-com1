import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Post from '@/lib/models/Post'
import User from '@/lib/models/User'
import Follow from '@/lib/models/Follow'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { sanitize } from '@/lib/validation'

export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')

        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        // SECURITY: viewerId MUST come from the auth token, not from a query
        // param. Earlier code fell back to searchParams.get('viewerId'), which
        // allowed an unauthenticated attacker to pass ?userId=X&viewerId=X
        // and read any user's private saved posts.
        const auth = authenticateRequest(req)
        const viewerId = auth?.user.userId || null

        // Public profile fields only — PII (phone, email, full address) is
        // restricted to the user viewing their own profile.
        const user = await User.findById(userId)
            .select('farmerName firmName role profilePic bio createdAt')
            .lean()
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        // Only the profile owner may see their own saved posts.
        const isOwnProfile = !!viewerId && viewerId === userId

        const [posts, clips, savedPosts, followersCount, followingCount, isFollowing] = await Promise.all([
            Post.find({ userId, type: 'post', isActive: true }).sort({ createdAt: -1 }).limit(60).lean(),
            Post.find({ userId, type: 'krishiclip', isActive: true }).sort({ createdAt: -1 }).limit(60).lean(),
            isOwnProfile
                ? Post.find({ savedBy: viewerId, isActive: true }).sort({ createdAt: -1 }).limit(60)
                    .populate('userId', 'farmerName firmName role profilePic').lean()
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
            isOwnProfile,
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
    }
}

// PATCH /api/social/profile — update the authenticated user's profile pic + bio
// Body: { profilePic?: string, bio?: string }
export async function PATCH(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many profile updates.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()
        const updates: Record<string, unknown> = {}

        if (typeof body.profilePic === 'string') {
            // profilePic should be a Cloudinary URL (uploaded client-side via
            // /api/social/upload-signature). Basic URL validation.
            if (body.profilePic && !body.profilePic.startsWith('http')) {
                return NextResponse.json({ error: 'profilePic must be a valid URL' }, { status: 400 })
            }
            updates.profilePic = sanitize(body.profilePic)
        }
        if (typeof body.bio === 'string') {
            updates.bio = sanitize(body.bio).slice(0, 500)
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
        }

        const user = await User.findByIdAndUpdate(
            auth.user.userId,
            { $set: updates },
            { new: true },
        ).select('farmerName firmName role profilePic bio createdAt')

        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        await logAudit({
            userId: auth.user.userId, action: 'UPDATE', resource: 'Profile',
            resourceId: auth.user.userId, details: { fields: Object.keys(updates) }, request: req,
        })

        return NextResponse.json({ success: true, user })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }
}
