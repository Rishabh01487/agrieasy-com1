import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import { authenticateRequest, unauthorized } from '@/lib/auth'

export async function GET(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const wallet = await Wallet.findOne({ userId: auth.user.userId })
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
