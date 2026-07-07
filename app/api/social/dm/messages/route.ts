import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Conversation from '@/lib/models/Conversation'
import Notification from '@/lib/models/Notification'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError } from '@/lib/api-response'
import { validateBody, sendMessageSchema } from '@/lib/validation'

// GET /api/social/dm/messages?conversationId=
export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const { searchParams } = new URL(req.url)
        const conversationId = searchParams.get('conversationId')
        if (!conversationId) return NextResponse.json({ error: 'conversationId required' }, { status: 400 })

        await dbConnect()
        const conv = await Conversation.findById(conversationId)
        if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        if (!conv.participants.some((p: any) => p.toString() === auth.user.userId)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        // Mark all messages from the other participant as read by the viewer
        let dirty = false
        for (const m of conv.messages) {
            if (m.senderId.toString() !== auth.user.userId && !m.readBy.some((r: any) => r.toString() === auth.user.userId)) {
                m.readBy.push(auth.user.userId as any)
                dirty = true
            }
        }
        if (dirty) await conv.save()

        await conv.populate('messages.senderId', 'farmerName firmName role')
        return NextResponse.json({ success: true, data: { conversation: conv } })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }
}

// POST /api/social/dm/messages — send a message
export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 30, message: 'Slow down!' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()
        const v = validateBody(sendMessageSchema, body)
        if (!v.success) return validationError('Validation failed', v.errors)

        let conversationId = v.data.conversationId
        const recipientId = v.data.recipientId

        // If no conversationId, find or create one with the recipient
        if (!conversationId) {
            if (!recipientId) return NextResponse.json({ error: 'conversationId or recipientId required' }, { status: 400 })
            let conv = await Conversation.findOne({
                participants: { $all: [auth.user.userId, recipientId], $size: 2 },
            })
            if (!conv) {
                conv = await Conversation.create({ participants: [auth.user.userId, recipientId] })
            }
            conversationId = conv._id as any
        }

        const conv = await Conversation.findById(conversationId)
        if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
        if (!conv.participants.some((p: any) => p.toString() === auth.user.userId)) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        const mediaType = v.data.mediaUrl ? (v.data.mediaType || 'image') : 'text'
        const newMsg = {
            senderId: auth.user.userId,
            text: v.data.text || '',
            mediaUrl: v.data.mediaUrl || '',
            mediaType,
            readBy: [auth.user.userId],
            createdAt: new Date(),
        }
        conv.messages.push(newMsg)
        conv.lastMessageAt = new Date()
        conv.lastMessageText = v.data.text || '[media]'
        await conv.save()

        await logAudit({
            userId: auth.user.userId, action: 'CREATE', resource: 'Message',
            resourceId: conversationId, request: req,
        })

        // Notify all other participants
        const otherIds = conv.participants.filter((p: any) => p.toString() !== auth.user.userId)
        if (Notification && otherIds.length > 0) {
            await Notification.insertMany(otherIds.map((uid: any) => ({
                userId: uid,
                actorId: auth.user.userId,
                type: 'message',
                conversationId: conv._id,
                text: v.data.text || '[media]',
            })))
        }

        const saved = conv.messages[conv.messages.length - 1]
        return NextResponse.json({ message: saved, conversationId: conv._id }, { status: 201 })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
    }
}
