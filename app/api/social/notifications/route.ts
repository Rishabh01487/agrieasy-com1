import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { parsePagination, paginationMeta } from '@/lib/api-response'

export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const { searchParams } = new URL(req.url)
        const { page, limit, skip } = parsePagination(searchParams, 100, 25)
        const typeFilter = searchParams.get('type')

        await dbConnect()
        const query: Record<string, unknown> = { userId: auth.user.userId }
        if (typeFilter && typeFilter !== 'all') query.type = typeFilter

        const [total, notifications] = await Promise.all([
            Notification.countDocuments(query),
            Notification.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate('actorId', 'farmerName firmName role')
                .populate('postId', 'mediaUrl mediaType caption')
                .lean(),
        ])

        const unreadCount = await Notification.countDocuments({ userId: auth.user.userId, isRead: false })

        return NextResponse.json({
            success: true,
            data: { notifications, unreadCount },
            meta: paginationMeta(page, limit, total),
        })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }
}
