import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import User from '@/lib/models/User'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { logAudit } from '@/lib/audit'
import { verifyCsrf } from '@/lib/csrf'

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
        const safeWallet = {
            balance: wallet.balance,
            agripayId: wallet.agripayId,
            isKYC: wallet.isKYC,
            bankVerified: wallet.bankVerified,
            bankName: wallet.bankVerified ? wallet.bankName : undefined,
            paylaterEligible: wallet.paylaterEligible,
            paylaterLimit: wallet.paylaterLimit,
            paylaterUsed: wallet.paylaterUsed,
            dailyLimit: wallet.dailyLimit,
            monthlyLimit: wallet.monthlyLimit,
        }
        return NextResponse.json({ wallet: safeWallet })
    } catch (error) {
        console.error('Get wallet error:', error)
        return NextResponse.json({ error: 'Failed to get wallet' }, { status: 500 })
    }
}

export async function POST(request: NextRequest) {
    if (!verifyCsrf(request)) {
        return NextResponse.json({ error: 'CSRF token invalid or missing' }, { status: 403 })
    }
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const existing = await Wallet.findOne({ userId: auth.user.userId })
        // SECURITY: do NOT return the raw wallet document on the "wallet
        // already exists" branch — its toJSON getter exposes the DECRYPTED
        // accountNumber, ifscCode, bankHolder, upiId, and razorpayFundAccountId.
        // Reuse the same safeWallet shape used by the GET handler.
        if (existing) {
            return NextResponse.json({
                wallet: {
                    balance: existing.balance,
                    agripayId: existing.agripayId,
                    isKYC: existing.isKYC,
                    bankVerified: existing.bankVerified,
                    bankName: existing.bankVerified ? existing.bankName : undefined,
                    paylaterEligible: existing.paylaterEligible,
                    paylaterLimit: existing.paylaterLimit,
                    paylaterUsed: existing.paylaterUsed,
                    dailyLimit: existing.dailyLimit,
                    monthlyLimit: existing.monthlyLimit,
                },
            })
        }
        const user = await User.findById(auth.user.userId)
        if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
        const agripayId = `${user.phone}@agripay`
        const wallet = await Wallet.create({ userId: auth.user.userId, balance: 0, agripayId })
        await logAudit({ userId: auth.user.userId, action: 'CREATE', resource: 'Wallet', details: { agripayId }, request })

        // New wallet has no PII yet, but apply the same shape for consistency.
        return NextResponse.json({
            success: true,
            wallet: {
                balance: wallet.balance,
                agripayId: wallet.agripayId,
                isKYC: wallet.isKYC,
                bankVerified: wallet.bankVerified,
                bankName: wallet.bankVerified ? wallet.bankName : undefined,
                paylaterEligible: wallet.paylaterEligible,
                paylaterLimit: wallet.paylaterLimit,
                paylaterUsed: wallet.paylaterUsed,
                dailyLimit: wallet.dailyLimit,
                monthlyLimit: wallet.monthlyLimit,
            },
        }, { status: 201 })
    } catch (error) {
        console.error('Create wallet error:', error)
        return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
    }
}
