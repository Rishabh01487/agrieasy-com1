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

export interface RazorpayOrder {
  id?: string
  amount?: number        // paise
  currency?: string
  amount_paid?: number   // paise
  amount_due?: number    // paise
  status?: 'created' | 'attempted' | 'paid'
  receipt?: string
}

/**
 * SECURITY: Razorpay's payment signature only covers `orderId|paymentId`.
 * It does NOT sign the amount paid — so an attacker can pay ₹1, then call
 * the topup API claiming amount=100000. To prevent amount tampering, we
 * fetch the order from Razorpay server-side (using the secret key) and
 * assert `order.amount === claimedAmount * 100` (paise, exact match).
 *
 * Returns `{ ok: true }` on success, or `{ ok: false, reason }` on any
 * failure (bad signature, fetch failure, amount mismatch, unpaid order).
 */
export async function verifyPaymentSignatureWithAmount(
  orderId: string,
  paymentId: string,
  signature: string,
  expectedAmountInPaise: number,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  // 1) Verify HMAC signature over orderId|paymentId (Razorpay spec).
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(`${orderId}|${paymentId}`)
    .digest('hex')
  if (expected !== signature) {
    return { ok: false, reason: 'Payment verification failed' }
  }

  // 2) Fetch the order from Razorpay using the secret key. The client
  //    cannot tamper with this server-side fetch, so `order.amount` is
  //    the source of truth for what was actually paid.
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) {
    return { ok: false, reason: 'Razorpay not configured' }
  }

  let order: RazorpayOrder
  try {
    const res = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`,
      },
    })
    if (!res.ok) {
      return { ok: false, reason: 'Could not fetch order from Razorpay' }
    }
    order = (await res.json()) as RazorpayOrder
  } catch {
    return { ok: false, reason: 'Failed to fetch order from Razorpay' }
  }

  // 3) Amount must match exactly (paise, integer). Mismatch → reject.
  if (typeof order.amount !== 'number' || order.amount !== expectedAmountInPaise) {
    return { ok: false, reason: 'Amount mismatch — refusing to credit wallet' }
  }

  // 4) Defense-in-depth: order must be in 'paid' state. A 'created' or
  //    'attempted' order means no payment was actually captured.
  if (order.status && order.status !== 'paid') {
    return { ok: false, reason: `Order not in paid state (${order.status})` }
  }

  return { ok: true }
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
