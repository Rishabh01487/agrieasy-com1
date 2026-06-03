import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Follow from '@/lib/models/Follow'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = rateLimitByUser(auth.userId, { windowMs: 60_000, max: 15, message: 'Slow down! Too many follow actions.' })
        if (rl) return rl

        await dbConnect()
        const { followingId } = await req.json()
        if (!followingId) return NextResponse.json({ error: 'followingId required' }, { status: 400 })
        if (auth.userId === followingId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

        const existing = await Follow.findOne({ followerId: auth.userId, followingId })
        if (existing) {
            await Follow.deleteOne({ followerId: auth.userId, followingId })
            await logAudit({ userId: auth.userId, action: 'DELETE', resource: 'Follow', resourceId: followingId, details: { followed: false }, request: req })
            return NextResponse.json({ following: false })
        } else {
            await Follow.create({ followerId: auth.userId, followingId })
            await logAudit({ userId: auth.userId, action: 'CREATE', resource: 'Follow', resourceId: followingId, details: { followed: true }, request: req })
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
