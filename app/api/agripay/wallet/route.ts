import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function GET(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        let wallet = await Wallet.findOne({ userId: auth.user.userId })
        if (!wallet) {
            const user = await User.findById(auth.user.userId)
            if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
            const agripayId = `${user.phone}@agripay`
            wallet = await Wallet.create({ userId: auth.user.userId, balance: 0, agripayId })
        }
        return NextResponse.json({ wallet })
    } catch (error) {
        console.error('Get wallet error:', error)
        return NextResponse.json({ error: 'Failed to get wallet' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const existing = await Wallet.findOne({ userId: auth.user.userId })
        if (existing) return NextResponse.json({ wallet: existing })
        const user = await User.findById(auth.user.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
        const agripayId = `${user.phone}@agripay`
        const wallet = await Wallet.create({ userId: auth.user.userId, balance: 0, agripayId })
        await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Wallet', details: { agripayId }, request })

        return NextResponse.json({ success: true, wallet }, { status: 201 })
    } catch (error) {
        console.error('Create wallet error:', error)
        return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
    }
}
