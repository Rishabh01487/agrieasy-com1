import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/mongodb'
import User from '@/lib/models/User'
import Wallet from '@/lib/models/Wallet'
import { authenticateRequest, unauthorized } from '@/lib/auth'

export async function POST(request: NextRequest) {
  const auth = authenticateRequest(request)
  if (!auth || auth.role !== 'admin') return unauthorized()
  try {
    await dbConnect()

    let encrypted = 0

    const users = await User.find({ $or: [{ aadharNumber: { $exists: true, $ne: '' } }, { licenseNumber: { $exists: true, $ne: '' } }] })
    for (const user of users) {
      let changed = false
      if (user.aadharNumber && !user.aadharNumber.includes(':')) {
        user.aadharNumber = user.aadharNumber
        changed = true
      }
      if (user.licenseNumber && !user.licenseNumber.includes(':')) {
        user.licenseNumber = user.licenseNumber
        changed = true
      }
      if (changed) {
        await user.save()
        encrypted++
      }
    }

    const wallets = await Wallet.find({ $or: [{ accountNumber: { $exists: true, $ne: '' } }, { upiId: { $exists: true, $ne: '' } }, { bankName: { $exists: true, $ne: '' } }, { bankHolder: { $exists: true, $ne: '' } }] })
    for (const wallet of wallets) {
      let changed = false
      if (wallet.accountNumber && !wallet.accountNumber.includes(':')) {
        wallet.accountNumber = wallet.accountNumber
        changed = true
      }
      if (wallet.bankName && !wallet.bankName.includes(':')) {
        wallet.bankName = wallet.bankName
        changed = true
      }
      if (wallet.bankHolder && !wallet.bankHolder.includes(':')) {
        wallet.bankHolder = wallet.bankHolder
        changed = true
      }
      if (wallet.upiId && !wallet.upiId.includes(':')) {
        wallet.upiId = wallet.upiId
        changed = true
      }
      if (changed) {
        await wallet.save()
        encrypted++
      }
    }

    return NextResponse.json({ success: true, encrypted })
  } catch (e) {
    console.error('Migration error:', e)
    return NextResponse.json({ error: 'Migration failed' }, { status: 500 })
  }
}
