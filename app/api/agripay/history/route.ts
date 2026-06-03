import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/lib/models/Transaction'
import { authenticateRequest, unauthorized } from '@/lib/auth'

export async function GET(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')
        const type = request.nextUrl.searchParams.get('type')
        const paymentMethod = request.nextUrl.searchParams.get('paymentMethod')

        const query: Record<string, unknown> = {
            $or: [{ fromUserId: auth.userId }, { toUserId: auth.userId }],
        }
        if (type) query.type = type
        if (paymentMethod) query.paymentMethod = paymentMethod

        const transactions = await Transaction.find(query)
            .populate('fromUserId', 'phone farmerName firmName transporterCompanyName driverName role')
            .populate('toUserId', 'phone farmerName firmName transporterCompanyName driverName role')
            .sort({ createdAt: -1 })
            .limit(limit)

        return NextResponse.json({ transactions })
    } catch (error) {
        console.error('History error:', error)
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }
}
