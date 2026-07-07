import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized } from '@/lib/auth'

// POST /api/social/notifications/read — mark all (or specific) notifications as read
//   body: { id?: string }   // if omitted, marks ALL as read
export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()
        const body = await req.json().catch(() => ({}))

        if (body.id) {
            await Notification.updateOne(
                { _id: body.id, userId: auth.user.userId },
                { $set: { isRead: true } },
            )
        } else {
            await Notification.updateMany(
                { userId: auth.user.userId, isRead: false },
                { $set: { isRead: true } },
            )
        }

        const unreadCount = await Notification.countDocuments({ userId: auth.user.userId, isRead: false })
        return NextResponse.json({ success: true, unreadCount })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to mark notifications read' }, { status: 500 })
    }
}
