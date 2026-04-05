import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Follow from '@/lib/models/Follow'

// POST /api/social/follow  { followerId, followingId }
export async function POST(req: NextRequest) {
    await dbConnect()
    try {
        const { followerId, followingId } = await req.json()
        if (!followerId || !followingId) return NextResponse.json({ error: 'followerId and followingId required' }, { status: 400 })
        if (followerId === followingId) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

        const existing = await Follow.findOne({ followerId, followingId })
        if (existing) {
            await Follow.deleteOne({ followerId, followingId })
            return NextResponse.json({ following: false })
        } else {
            await Follow.create({ followerId, followingId })
            return NextResponse.json({ following: true })
        }
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to toggle follow' }, { status: 500 })
    }
}

// GET /api/social/follow?userId=&targetId=  → check if following
export async function GET(req: NextRequest) {
    await dbConnect()
    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const targetId = searchParams.get('targetId')
    if (!userId || !targetId) return NextResponse.json({ following: false })

    try {
        const exists = await Follow.findOne({ followerId: userId, followingId: targetId })
        const followers = await Follow.countDocuments({ followingId: targetId })
        const following = await Follow.countDocuments({ followerId: targetId })
        return NextResponse.json({ following: !!exists, followersCount: followers, followingCount: following })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ following: false })
    }
}
