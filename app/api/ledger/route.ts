import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Ledger from '@/lib/models/Ledger'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { rateLimitByUser } from '@/lib/rate-limit'
import { validationError, apiSuccess } from '@/lib/api-response'
import { sanitize } from '@/lib/validation'

// GET /api/ledger?type=&status=&page=
export async function GET(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()
        const { searchParams } = new URL(req.url)
        const typeFilter = searchParams.get('type')
        const statusFilter = searchParams.get('status')
        const page = parseInt(searchParams.get('page') || '1', 10)
        const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
        const skip = (page - 1) * limit

        const query: Record<string, unknown> = { userId: auth.user.userId }
        if (typeFilter && typeFilter !== 'all') query.type = typeFilter
        if (statusFilter && statusFilter !== 'all') query.status = statusFilter

        const [entries, total] = await Promise.all([
            Ledger.find(query)
                .sort({ createdAt: -1 })
                .skip(skip).limit(limit)
                .populate('counterpartyId', 'farmerName firmName role')
                .lean(),
            Ledger.countDocuments(query),
        ])

        // MED-5 FIX: Use MongoDB aggregation pipeline instead of fetching all entries.
        // Prevents performance DoS when a user has thousands of ledger entries.
        const mongoose = (await import('mongoose')).default
        const summaryAgg = await Ledger.aggregate([
            { $match: { userId: new mongoose.Types.ObjectId(auth.user.userId) } },
            { $group: {
                _id: null,
                totalEarnings: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'earning'] }, { $eq: ['$status', 'paid'] }] }, '$amount', 0] } },
                totalExpenses: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'expense'] }, { $eq: ['$status', 'paid'] }] }, '$amount', 0] } },
                pendingReceivables: { $sum: { $cond: [{ $and: [{ $or: [{ $eq: ['$type', 'bill'] }, { $eq: ['$type', 'invoice'] }] }, { $eq: ['$status', 'pending'] }] }, '$amount', 0] } },
                pendingPayables: { $sum: { $cond: [{ $and: [{ $eq: ['$type', 'expense'] }, { $eq: ['$status', 'pending'] }] }, '$amount', 0] } },
                entryCount: { $sum: 1 },
            } },
        ])
        const summary = summaryAgg.length > 0 ? summaryAgg[0] : {
            totalEarnings: 0, totalExpenses: 0,
            pendingReceivables: 0, pendingPayables: 0, entryCount: 0,
        }

        return apiSuccess({ entries, summary }, { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to fetch ledger' }, { status: 500 })
    }
}

// POST /api/ledger — create a new ledger entry
export async function POST(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 20, message: 'Too many ledger entries.' })
        if (rl) return rl

        await dbConnect()
        const body = await req.json()

        // Basic validation
        if (!body.type || !['bill', 'invoice', 'earning', 'expense'].includes(body.type)) {
            return validationError('Invalid type. Must be bill, invoice, earning, or expense.')
        }
        if (!body.amount || typeof body.amount !== 'number' || body.amount <= 0) {
            return validationError('Amount must be a positive number')
        }

        const user = await User.findById(auth.user.userId).select('role farmerName firmName')
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

        const entry = await Ledger.create({
            userId: auth.user.userId,
            role: user.role,
            type: body.type,
            counterpartyId: body.counterpartyId || undefined,
            counterpartyName: sanitize(body.counterpartyName || '').slice(0, 200),
            listingId: body.listingId || undefined,
            amount: body.amount,
            quantity: body.quantity || 0,
            unit: body.unit || 'kg',
            pricePerUnit: body.pricePerUnit || 0,
            commodity: sanitize(body.commodity || '').slice(0, 200),
            billPhoto: body.billPhoto || '',
            status: body.status || 'pending',
            description: sanitize(body.description || '').slice(0, 1000),
            dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        })

        if (body.counterpartyId && (body.type === 'bill' || body.type === 'invoice')) {
            const mirrorType = body.type === 'bill' ? 'expense' : 'expense'
            const counterpartyName = user.farmerName || user.firmName || 'User'
            await Ledger.create({
                userId: body.counterpartyId,
                role: user.role === 'buyer' ? 'farmer' : 'buyer',  // opposite role
                type: mirrorType,
                counterpartyId: auth.user.userId,
                counterpartyName,
                listingId: body.listingId || undefined,
                amount: body.amount,
                quantity: body.quantity || 0,
                unit: body.unit || 'kg',
                pricePerUnit: body.pricePerUnit || 0,
                commodity: sanitize(body.commodity || '').slice(0, 200),
                billPhoto: body.billPhoto || '',
                status: body.status || 'pending',
                description: sanitize(body.description || '').slice(0, 1000),
                dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
            })
        }

        await logAudit({
            userId: auth.user.userId, action: 'CREATE', resource: 'Ledger',
            resourceId: entry._id.toString(), details: { type: body.type, amount: body.amount }, request: req,
        })

        return apiSuccess({ entry }, undefined, 201)
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to create ledger entry' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        await dbConnect()
        const body = await req.json()
        if (!body.id) return validationError('Entry id required')

        const entry = await Ledger.findById(body.id)
        if (!entry) return NextResponse.json({ error: 'Entry not found' }, { status: 404 })
        if (entry.userId.toString() !== auth.user.userId) {
            return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
        }

        if (body.status && ['pending', 'paid', 'overdue', 'cancelled'].includes(body.status)) {
            entry.status = body.status
            if (body.status === 'paid' && !entry.paidAt) {
                entry.paidAt = new Date()
            }
        }
        await entry.save()

        await logAudit({
            userId: auth.user.userId, action: 'UPDATE', resource: 'Ledger',
            resourceId: entry._id.toString(), details: { status: body.status }, request: req,
        })

        return apiSuccess({ entry })
    } catch (e) {
        console.error(e)
        return NextResponse.json({ error: 'Failed to update ledger entry' }, { status: 500 })
    }
}
