import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { validateUpiId } from '@/lib/validators'
import { logAudit } from '@/lib/audit'
import { createFundAccount } from '@/lib/razorpay'

export async function POST(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const { bankName, accountNumber, ifscCode, bankHolder, upiId } = await request.json()
        if (!bankName || !accountNumber || !ifscCode || !bankHolder) {
            return NextResponse.json({ error: 'All fields required: bankName, accountNumber, ifscCode, bankHolder' }, { status: 400 })
        }

        if (upiId) {
            const upiCheck = validateUpiId(upiId)
            if (!upiCheck.valid) return NextResponse.json({ error: upiCheck.message }, { status: 400 })
        }

        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
        if (!ifscRegex.test(ifscCode.toUpperCase())) {
            return NextResponse.json({ error: 'Invalid IFSC code format (e.g., SBIN0001234)' }, { status: 400 })
        }

        if (!/^\d{9,18}$/.test(accountNumber)) {
            return NextResponse.json({ error: 'Account number must be 9-18 digits' }, { status: 400 })
        }

        let wallet = await Wallet.findOne({ userId: auth.user.userId })
        if (!wallet) {
            wallet = await Wallet.create({ userId: auth.user.userId, balance: 0 })
        }

        wallet.bankName = bankName
        wallet.bankHolder = bankHolder
        wallet.accountNumber = accountNumber
        wallet.ifscCode = ifscCode.toUpperCase()
        if (upiId) wallet.upiId = upiId
        wallet.bankVerified = true
        wallet.bankVerifiedAt = new Date()
        wallet.isKYC = true
        await wallet.save()

        const fundAccount = await createFundAccount(auth.user.userId, { accountNumber, ifscCode, bankHolder })
        if (fundAccount) {
            wallet.razorpayFundAccountId = fundAccount.fundAccountId
            await wallet.save()
        }

        await logAudit({ userId: auth.user.userId, action: 'UPDATE', resource: 'BankVerification', details: { bankName, hasUpi: !!upiId, payoutReady: !!fundAccount }, request })

        return NextResponse.json({
            success: true,
            message: `Bank account verified and linked successfully!`,
            wallet,
        })
    } catch (error) {
        console.error('Bank verify error:', error)
        return NextResponse.json({ error: 'Failed to verify bank account. Try again.' }, { status: 500 })
    }
}

export async function GET(request: NextRequest) {
    const auth = authenticateRequest(request)
    if (!auth) return unauthorized()

    await dbConnect()
    try {
        const wallet = await Wallet.findOne({ userId: auth.user.userId })
        if (!wallet) return NextResponse.json({ bankVerified: false })
        return NextResponse.json({
            bankVerified: wallet.bankVerified || false,
            bankName: wallet.bankName,
            bankHolder: wallet.bankHolder,
            accountNumberMasked: wallet.accountNumber
                ? `XXXX XXXX ${wallet.accountNumber.slice(-4)}`
                : null,
            ifscCode: wallet.ifscCode,
            upiId: wallet.upiId || null,
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
