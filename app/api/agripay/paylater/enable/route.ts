import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const wallet = await Wallet.findOne({ userId: auth.user.userId })
        if (!wallet) return NextResponse.json({ error: 'Wallet not found. Open AgriPay first.' }, { status: 404 })

        if (wallet.paylaterEligible) {
            return NextResponse.json({ success: true, message: 'PayLater already enabled', wallet })
        }

        // FIX: Require bank verification before enabling PayLater
        if (!wallet.bankVerified) {
            return NextResponse.json({ error: 'Please verify your bank account first before enabling PayLater.' }, { status: 400 })
        }

        const creditScore = Math.min(100, (wallet.isKYC || wallet.bankVerified ? 40 : 0) + 30)
        const limit = Math.min(1000000, creditScore * 10000)

        const updated = await Wallet.findByIdAndUpdate(wallet._id, {
            paylaterEligible: true,
            paylaterCreditScore: creditScore,
            paylaterLimit: limit,
            paylaterUsed: 0,
        }, { new: true })

        await logAudit({ userId: auth.user.userId, action: 'UPDATE', resource: 'PayLaterEnable', details: { creditScore, limit }, request })

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