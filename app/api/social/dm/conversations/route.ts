import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/lib/models/Conversation'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'

export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()

        const conversations = await Conversation.find({ participants: auth.user.userId })
            .sort({ lastMessageAt: -1 })
            .populate('participants', 'farmerName firmName role')
            .lean()

        const data = conversations.map((c: any) => {
            const others = c.participants.filter((p: any) => p._id.toString() !== auth.user.userId)
            const other = others[0] || c.participants[0]
            const lastMsg = c.messages?.[c.messages.length - 1] || null
            const unread = c.messages?.some((m: any) =>
                m.senderId?.toString() !== auth.user.userId && !m.readBy?.some((r: any) => r.toString() === auth.user.userId)
            ) || false
            return {
                _id: c._id,
                other: other ? { _id: other._id, farmerName: other.farmerName, firmName: other.firmName, role: other.role } : null,
                lastMessageText: c.lastMessageText || (lastMsg?.text || (lastMsg?.mediaUrl ? '[media]' : '')),
                lastMessageAt: c.lastMessageAt,
                unread,
            }
        })

        return NextResponse.json({ success: true, data: { conversations: data } })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()
        const body = await req.json()
        const { participantId } = body

        if (!participantId || participantId === auth.user.userId) {
            return NextResponse.json({ error: 'Invalid participantId' }, { status: 400 })
        }

        const existing = await Conversation.findOne({
            participants: { $all: [auth.user.userId, participantId], $size: 2 },
        })

        if (existing) {
            await existing.populate('participants', 'farmerName firmName role')
            return NextResponse.json({ conversation: existing })
        }

        const conv = await Conversation.create({
            participants: [auth.user.userId, participantId],
        })
        await conv.populate('participants', 'farmerName firmName role')
        return NextResponse.json({ conversation: conv }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
    }
}
