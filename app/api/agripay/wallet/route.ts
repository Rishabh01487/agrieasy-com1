import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import User from '@/lib/models/User'

export async function GET(request: NextRequest) {
    await dbConnect()
    try {
        const userId = request.nextUrl.searchParams.get('userId')
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        let wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            // Auto-create wallet on first access
            const user = await User.findById(userId)
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
            const agripayId = `${user.phone}@agripay`
            wallet = await Wallet.create({ userId, balance: 0, agripayId })
        }
        return NextResponse.json({ wallet })
    } catch (error) {
        console.error('Get wallet error:', error)
        return NextResponse.json({ error: 'Failed to get wallet' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    await dbConnect()
    try {
        const { userId } = await request.json()
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        const existing = await Wallet.findOne({ userId })
        if (existing) return NextResponse.json({ wallet: existing })
        const user = await User.findById(userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
        const agripayId = `${user.phone}@agripay`
        const wallet = await Wallet.create({ userId, balance: 0, agripayId })
        return NextResponse.json({ success: true, wallet }, { status: 201 })
    } catch (error) {
        console.error('Create wallet error:', error)
        return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
    }
}
