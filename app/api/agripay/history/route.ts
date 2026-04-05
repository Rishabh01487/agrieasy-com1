import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Transaction from '@/lib/models/Transaction'

export async function GET(request: NextRequest) {
    await dbConnect()
    try {
        const userId = request.nextUrl.searchParams.get('userId')
        const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')
        const type = request.nextUrl.searchParams.get('type') // optional filter
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        const query: { $or: Array<Record<string, unknown>>; type?: string } = {
            $or: [{ fromUserId: userId }, { toUserId: userId }],
        }
        if (type) query.type = type

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
