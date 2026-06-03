import crypto from 'crypto'

function getAuth(): string {
  const key = process.env.RAZORPAY_KEY_ID
  const secret = process.env.RAZORPAY_KEY_SECRET
  if (!key || !secret) throw new Error('Razorpay not configured')
  return Buffer.from(`${key}:${secret}`).toString('base64')
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  return expected === signature
}

export async function createFundAccount(userId: string, bankDetails: {
  accountNumber: string
  ifscCode: string
  bankHolder: string
}): Promise<{ fundAccountId: string } | null> {
  if (!process.env.RAZORPAY_KEY_ID) return null
  try {
    const res = await fetch('https://api.razorpay.com/v1/fund_accounts', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${getAuth()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_id: userId,
        account_type: 'bank_account',
        bank_account: {
          name: bankDetails.bankHolder,
          ifsc: bankDetails.ifscCode,
          account_number: bankDetails.accountNumber,
        },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { fundAccountId: data.id }
  } catch {
    return null
  }
}

export async function createPayout(amount: number, fundAccountId: string, referenceId: string): Promise<{ payoutId: string; status: string } | null> {
  if (!process.env.RAZORPAY_KEY_ID) return null
  try {
    const res = await fetch('https://api.razorpay.com/v1/payouts', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${getAuth()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fund_account_id: fundAccountId,
        amount: amount * 100,
        currency: 'INR',
        mode: 'IMPS',
        purpose: 'payout',
        reference_id: referenceId,
        narration: 'AgriPay withdrawal',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return { payoutId: data.id, status: data.status }
  } catch {
    return null
  }
}

export function isPayoutsEnabled(): boolean {
  return !!process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_ACCOUNT_TYPE === 'live'
}
