import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import PayLater from '@/lib/models/PayLater'

export async function GET(request: NextRequest) {
    await dbConnect()
    try {
        const userId = request.nextUrl.searchParams.get('userId')
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        const wallet = await Wallet.findOne({ userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })

        return NextResponse.json({
            eligible: wallet.paylaterEligible || false,
            limit: wallet.paylaterLimit || 0,
            used: wallet.paylaterUsed || 0,
            available: (wallet.paylaterLimit || 0) - (wallet.paylaterUsed || 0),
            maxLimit: wallet.paylaterMaxLimit || 1000000,
            kycComplete: wallet.isKYC || wallet.bankVerified || false,
        })
    } catch (error) {
        console.error('PayLater status error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
