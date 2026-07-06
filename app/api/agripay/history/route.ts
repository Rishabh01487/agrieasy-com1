import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { parsePagination, paginationMeta } from '@/lib/api-response'

export async function GET(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const { page, limit, skip } = parsePagination(request.nextUrl.searchParams, 100, 20)
        const type = request.nextUrl.searchParams.get('type')
        const paymentMethod = request.nextUrl.searchParams.get('paymentMethod')

        const query: Record<string, unknown> = {
            $or: [{ fromUserId: auth.user.userId }, { toUserId: auth.user.userId }],
        }
        if (type) query.type = type
        if (paymentMethod) query.paymentMethod = paymentMethod

        const total = await Transaction.countDocuments(query)
        const transactions = await Transaction.find(query)
            .populate('fromUserId', 'phone farmerName firmName transporterCompanyName driverName role')
            .populate('toUserId', 'phone farmerName firmName transporterCompanyName driverName role')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)

        return NextResponse.json({ success: true, data: { transactions }, meta: paginationMeta(page, limit, total) })
    } catch (error) {
        console.error('History error:', error)
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }
}
