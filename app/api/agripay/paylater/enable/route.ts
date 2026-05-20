import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'

export async function POST(request: NextRequest) {
    await dbConnect()
    try {
        const { userId } = await request.json()
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })

        let wallet = await Wallet.findOne({ userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found. Open AgriPay first.' }, { status: 404 })

        if (wallet.paylaterEligible) {
            return NextResponse.json({ success: true, message: 'PayLater already enabled', wallet })
        }

        const creditScore = Math.min(100, (wallet.isKYC || wallet.bankVerified ? 40 : 0) + 30)
        const limit = Math.min(1000000, creditScore * 10000)

        const updated = await Wallet.findByIdAndUpdate(wallet._id, {
            paylaterEligible: true,
            paylaterCreditScore: creditScore,
            paylaterLimit: limit,
            paylaterUsed: 0,
        }, { new: true })

        return NextResponse.json({
            success: true,
            message: `PayLater enabled! You are eligible for up to ₹${limit.toLocaleString('en-IN')} at 0.099% daily interest.`,
            wallet: updated,
        })
    } catch (error) {
        console.error('PayLater enable error:', error)
        return NextResponse.json({ error: 'Failed to enable PayLater' }, { status: 500 })
    }
}
