import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import Wallet from '@/lib/models/Wallet'

export async function POST(request: NextRequest) {
    await dbConnect()
    try {
        const { userId, bankName, accountNumber, ifscCode, bankHolder } = await request.json()
        if (!userId || !bankName || !accountNumber || !ifscCode || !bankHolder) {
            return NextResponse.json({ error: 'All fields required: bankName, accountNumber, ifscCode, bankHolder' }, { status: 400 })
        }

        // Validate IFSC format: 4 letters + 0 + 6 alphanumeric
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/
        if (!ifscRegex.test(ifscCode.toUpperCase())) {
            return NextResponse.json({ error: 'Invalid IFSC code format (e.g., SBIN0001234)' }, { status: 400 })
        }

        // Validate account number (9-18 digits)
        if (!/^\d{9,18}$/.test(accountNumber)) {
            return NextResponse.json({ error: 'Account number must be 9-18 digits' }, { status: 400 })
        }

        let wallet = await Wallet.findOne({ userId })
        if (!wallet) {
            wallet = await Wallet.create({ userId, balance: 0 })
        }

        wallet.bankName = bankName
        wallet.bankHolder = bankHolder
        wallet.accountNumber = accountNumber
        wallet.ifscCode = ifscCode.toUpperCase()
        wallet.bankVerified = true
        wallet.bankVerifiedAt = new Date()
        wallet.isKYC = true
        await wallet.save()

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
    await dbConnect()
    try {
        const userId = request.nextUrl.searchParams.get('userId')
        if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 })
        const wallet = await Wallet.findOne({ userId })
        if (!wallet) return NextResponse.json({ bankVerified: false })
        return NextResponse.json({
            bankVerified: wallet.bankVerified || false,
            bankName: wallet.bankName,
            bankHolder: wallet.bankHolder,
            // Mask account number: show only last 4 digits
            accountNumberMasked: wallet.accountNumber
                ? `XXXX XXXX ${wallet.accountNumber.slice(-4)}`
                : null,
            ifscCode: wallet.ifscCode,
        })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
