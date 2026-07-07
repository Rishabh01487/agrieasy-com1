import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Follow from '@/lib/models/Follow'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError } from '@/lib/api-response'
import { objectIdSchema } from '@/lib/validation'

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 30, message: 'Slow down! Too many follow actions.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()
        const v = objectIdSchema.safeParse(body.followingId)
        if (!v.success) return validationError('Invalid followingId', v.error.issues.map(i => ({ field: 'followingId', message: i.message })))
        const followingId = v.data
        if (auth.user.userId === followingId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

        const existing = await Follow.findOne({ followerId: auth.user.userId, followingId })
        if (existing) {
            await Follow.deleteOne({ followerId: auth.user.userId, followingId })
            await logAudit({ userId: auth.user.userId, action: 'DELETE', resource: 'Follow', resourceId: followingId, details: { followed: false }, request: req })
            return NextResponse.json({ following: false })
        } else {
            await Follow.create({ followerId: auth.user.userId, followingId })
            await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Follow', resourceId: followingId, details: { followed: true }, request: req })

            // Notify the followed user
            if (Notification) {
                await Notification.create({
                    userId: followingId,
                    actorId: auth.user.userId,
                    type: 'follow',
                })
            }

            return NextResponse.json({ following: true })
        }
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to toggle follow' }, { status: 500 })
    }
}

export async function GET(req: NextRequest) {
    try {
        await dbConnect()
        const { searchParams } = new URL(req.url)
        const userId = searchParams.get('userId')
        const targetId = searchParams.get('targetId')
        if (!userId || !targetId) return NextResponse.json({ following: false })
        const exists = await Follow.findOne({ followerId: userId, followingId: targetId })
        const followers = await Follow.countDocuments({ followingId: targetId })
        const following = await Follow.countDocuments({ followerId: targetId })
        return NextResponse.json({ following: !!exists, followersCount: followers, followingCount: following })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ following: false })
    }
}
