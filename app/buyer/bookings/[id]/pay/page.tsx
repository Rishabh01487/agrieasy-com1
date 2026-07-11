'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { BUYER, SHARED, inputStyle, labelStyle, cardStyle, navStyle } from '@/lib/styles'

interface Commodity {
  name: string
  quantity: number
  numberOfBags: number
  pricePerUnit: number
}
interface Booking {
  _id: string
  status: string
  commodities: Commodity[]
  totalQuantity: number
  billAmount: number
  billNote: string
  paymentStatus: string
  paymentMethod?: string
  paymentAmount: number
  paidAt?: string
  estimatedArrivalTime?: string
  actualArrivalTime?: string
  farmerId?: { _id: string; farmerName?: string; phone?: string; upiId?: string; email?: string }
}

const inp = inputStyle(BUYER)
const lbl = labelStyle(BUYER)

export default function PayBookingPage() {
  const params = useParams()
  const router = useRouter()
  const bookingId = params.id as string

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Bill form
  const [billAmount, setBillAmount] = useState('')
  const [billNote, setBillNote] = useState('')
  const [billing, setBilling] = useState(false)

  // Payment method
  const [method, setMethod] = useState<'wallet' | 'agripay-upi' | 'direct-upi' | 'cash' | null>(null)
  const [paying, setPaying] = useState(false)
  const [walletBalance, setWalletBalance] = useState<number | null>(null)
  const [upiLink, setUpiLink] = useState<string | null>(null)
  const [upiRef, setUpiRef] = useState('')
  const [confirmingUpi, setConfirmingUpi] = useState(false)

  useEffect(() => {
    if (!bookingId) return
    void (async () => {
      try {
        const res = await authFetch(`/api/bookings/${bookingId}`)
        if (!res.ok) { setError('Failed to load booking'); return }
        const data = await res.json()
        const b = data?.data?.booking || data?.booking
        if (!b) { setError('Booking not found'); return }
        setBooking(b)
        if (b.billAmount) setBillAmount(String(b.billAmount))
        if (b.billNote) setBillNote(b.billNote)

        // Fetch wallet balance (to show available funds)
        const wRes = await authFetch('/api/agripay/wallet').catch(() => null)
        if (wRes && wRes.ok) {
          const wd = await wRes.json()
          const w = wd?.data?.wallet || wd?.wallet
          if (w) setWalletBalance(w.balance ?? 0)
        }
      } catch {
        setError('Network error')
      } finally {
        setLoading(false)
      }
    })()
  }, [bookingId])

  const agreedTotal = (booking?.commodities || []).reduce((s, c) => s + (c.quantity || 0) * (c.pricePerUnit || 0), 0)
  const effectiveBill = booking?.billAmount || (billAmount ? parseFloat(billAmount) : 0) || agreedTotal

  const submitBill = async () => {
    setError(''); setSuccess('')
    if (!billAmount || parseFloat(billAmount) <= 0) {
      setError('Please enter a valid bill amount')
      return
    }
    setBilling(true)
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/bill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billAmount: parseFloat(billAmount), billNote }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to set bill')
        return
      }
      const data = await res.json()
      const b = data?.data?.booking || data?.booking
      if (b) setBooking(b)
      setSuccess('Bill saved — now choose a payment method')
      setTimeout(() => setSuccess(''), 2500)
    } catch {
      setError('Network error')
    } finally {
      setBilling(false)
    }
  }

  const pay = async () => {
    if (!method) { setError('Pick a payment method'); return }
    setError(''); setSuccess('')
    setPaying(true)
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, amount: effectiveBill }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Payment failed')
        return
      }
      const data = await res.json()

      if (method === 'direct-upi') {
        // Show UPI link — buyer completes in their UPI app, then confirms
        setUpiLink(data?.data?.upiLink || data?.upiLink)
      } else {
        // wallet / cash — payment complete, redirect
        setSuccess(data?.data?.message || data?.message || 'Payment successful!')
        setTimeout(() => router.push('/buyer/bookings'), 1500)
      }
    } catch {
      setError('Network error')
    } finally {
      setPaying(false)
    }
  }

  const confirmUpi = async () => {
    setError(''); setSuccess('')
    setConfirmingUpi(true)
    try {
      const res = await authFetch(`/api/bookings/${bookingId}/confirm-upi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentRef: upiRef || undefined }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message || json?.error || 'Failed to confirm')
        return
      }
      setSuccess('Payment confirmed!')
      setTimeout(() => router.push('/buyer/bookings'), 1500)
    } catch {
      setError('Network error')
    } finally {
      setConfirmingUpi(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: BUYER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BUYER.primary, fontWeight: 700, fontFamily: SHARED.font }}>
        Loading booking…
      </div>
    )
  }

  if (!booking) {
    return (
      <div style={{ minHeight: '100vh', background: BUYER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: SHARED.font }}>
        <div style={{ fontSize: '3rem' }}>⚠️</div>
        <p style={{ color: BUYER.muted }}>{error || 'Booking not found'}</p>
        <Link href="/buyer/bookings" style={{ color: BUYER.primary, fontWeight: 700, textDecoration: 'none' }}>← Back to bookings</Link>
      </div>
    )
  }

  const isPaid = booking.paymentStatus === 'paid'

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font, color: BUYER.text }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/buyer/bookings" style={{ color: BUYER.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← Bookings</Link>
          <span style={{ color: BUYER.muted }}>›</span>
          <span style={{ color: BUYER.text, fontWeight: 600, fontSize: '0.9rem' }}>Bill & Pay</span>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ margin: '0 0 6px', fontSize: '1.6rem', fontWeight: 800, color: BUYER.text }}>💰 Bill & Pay Farmer</h1>
        <p style={{ margin: '0 0 24px', color: BUYER.muted, fontSize: '0.92rem' }}>
          Weigh the commodity at your shop, enter the final bill, then pay the farmer.
        </p>

        {error && <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: SHARED.error, fontSize: '0.86rem', fontWeight: 600 }}>⚠️ {error}</div>}
        {success && <div style={{ background: SHARED.successLight, border: '1px solid #6ee7b7', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: SHARED.success, fontSize: '0.86rem', fontWeight: 600 }}>✅ {success}</div>}

        {isPaid && (
          <div style={{ ...cardStyle(BUYER), marginBottom: 20, background: SHARED.successLight, border: '1.5px solid #6ee7b7' }}>
            <h3 style={{ margin: 0, color: SHARED.success, fontSize: '1.05rem', fontWeight: 800 }}>✅ This booking is paid</h3>
            <p style={{ margin: '6px 0 0', color: SHARED.success, fontSize: '0.86rem' }}>
              Paid ₹{booking.paymentAmount.toLocaleString('en-IN')} via {booking.paymentMethod} on {booking.paidAt ? new Date(booking.paidAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : ''}
            </p>
          </div>
        )}

        {/* Farmer + commodity summary */}
        <div style={{ ...cardStyle(BUYER), marginBottom: 16, boxShadow: SHARED.shadowMd }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '0.95rem', fontWeight: 800, color: BUYER.text }}>📦 Shipment</h3>
          <p style={{ margin: '0 0 8px', color: BUYER.text, fontSize: '0.88rem' }}>
            <strong>Farmer:</strong> {booking.farmerId?.farmerName || booking.farmerId?.email || '—'}
            <span style={{ color: BUYER.muted }}> · 📞 {booking.farmerId?.phone || '—'}</span>
            {booking.farmerId?.upiId && <span style={{ color: BUYER.muted }}> · UPI: {booking.farmerId.upiId}</span>}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
            {(booking.commodities || []).map((c, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: BUYER.bgSub, borderRadius: 6, fontSize: '0.85rem' }}>
                <span style={{ color: BUYER.text }}>🌾 {c.name}</span>
                <span style={{ color: BUYER.textSecondary }}>{c.quantity} kg · {c.numberOfBags} bags · ₹{c.pricePerUnit}/kg = ₹{(c.quantity * c.pricePerUnit).toLocaleString('en-IN')}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, padding: '8px 10px', background: BUYER.primaryLight, borderRadius: 6 }}>
            <span style={{ color: BUYER.text, fontSize: '0.85rem', fontWeight: 700 }}>Agreed total</span>
            <span style={{ color: BUYER.primary, fontSize: '0.92rem', fontWeight: 800 }}>₹{agreedTotal.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Step 1: Bill entry — only if not yet billed */}
        {booking.paymentStatus === 'unpaid' && (
          <div style={{ ...cardStyle(BUYER), marginBottom: 16, boxShadow: SHARED.shadowMd }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: BUYER.text }}>Step 1 — Enter final bill (after weighing)</h3>
            <p style={{ margin: '0 0 14px', color: BUYER.muted, fontSize: '0.78rem' }}>
              The actual weight may differ from the estimate. Enter the final amount you owe the farmer.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={lbl}>Final Amount (₹)</label>
                <input type="number" value={billAmount} onChange={e => setBillAmount(e.target.value)} placeholder={String(agreedTotal)} style={inp} />
              </div>
              <div>
                <label style={lbl}>Note (optional)</label>
                <input type="text" value={billNote} onChange={e => setBillNote(e.target.value)} placeholder="e.g., Actual weight 495 kg" style={inp} />
              </div>
            </div>
            <button
              onClick={submitBill}
              disabled={billing || !billAmount}
              style={{ width: '100%', padding: '11px 16px', background: billing || !billAmount ? BUYER.muted : BUYER.primary, color: '#fff', border: 'none', borderRadius: 10, fontSize: '0.9rem', fontWeight: 700, cursor: billing || !billAmount ? 'not-allowed' : 'pointer' }}
            >
              {billing ? 'Saving…' : '✅ Save Bill'}
            </button>
          </div>
        )}

        {/* Step 2: Payment method — show once billed (or if already pending/paid) */}
        {(booking.paymentStatus === 'billed' || booking.paymentStatus === 'pending' || booking.paymentStatus === 'paid') && (
          <div style={{ ...cardStyle(BUYER), marginBottom: 16, boxShadow: SHARED.shadowMd }}>
            <h3 style={{ margin: '0 0 4px', fontSize: '0.95rem', fontWeight: 800, color: BUYER.text }}>
              {isPaid ? 'Payment details' : 'Step 2 — Choose payment method'}
            </h3>
            <p style={{ margin: '0 0 14px', color: BUYER.muted, fontSize: '0.78rem' }}>
              Paying <strong style={{ color: BUYER.primary }}>₹{effectiveBill.toLocaleString('en-IN')}</strong> to {booking.farmerId?.farmerName || 'farmer'}
            </p>

            {!isPaid && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <PaymentMethodCard
                  selected={method === 'wallet'}
                  onClick={() => setMethod('wallet')}
                  icon="💳"
                  title="AgriPay Wallet"
                  subtitle={walletBalance != null ? `Balance: ₹${walletBalance.toLocaleString('en-IN')}` : 'Loading balance…'}
                  disabled={walletBalance != null && walletBalance < effectiveBill}
                />
                <PaymentMethodCard
                  selected={method === 'agripay-upi'}
                  onClick={() => setMethod('agripay-upi')}
                  icon="📱"
                  title="AgriPay UPI"
                  subtitle="Pay via your AgriPay UPI ID"
                />
                <PaymentMethodCard
                  selected={method === 'direct-upi'}
                  onClick={() => setMethod('direct-upi')}
                  icon="🏦"
                  title="Direct UPI"
                  subtitle="GPay / PhonePe / Paytm"
                />
                <PaymentMethodCard
                  selected={method === 'cash'}
                  onClick={() => setMethod('cash')}
                  icon="💵"
                  title="Cash"
                  subtitle="Pay in cash & record"
                />
              </div>
            )}

            {!isPaid && method === 'wallet' && walletBalance != null && walletBalance < effectiveBill && (
              <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', marginBottom: 10, color: SHARED.error, fontSize: '0.82rem' }}>
                ⚠️ Insufficient wallet balance. <Link href="/agripay" style={{ color: BUYER.primary, fontWeight: 700 }}>Top up your wallet →</Link>
              </div>
            )}

            {!isPaid && method === 'direct-upi' && upiLink && (
              <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, padding: 12, marginBottom: 10 }}>
                <p style={{ margin: '0 0 8px', color: '#92400e', fontSize: '0.85rem', fontWeight: 700 }}>📲 Open your UPI app to pay ₹{effectiveBill.toLocaleString('en-IN')}</p>
                <a
                  href={upiLink}
                  style={{ display: 'block', textAlign: 'center', padding: '10px 16px', background: BUYER.primary, color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700, textDecoration: 'none', marginBottom: 8 }}
                >
                  🚀 Open UPI App
                </a>
                <p style={{ margin: '0 0 6px', color: '#92400e', fontSize: '0.78rem' }}>After completing payment, enter the UPI ref no. (optional) and confirm:</p>
                <input type="text" value={upiRef} onChange={e => setUpiRef(e.target.value)} placeholder="UPI ref no. (e.g., 123456789012)" style={{ ...inp, marginBottom: 8, padding: '8px 12px', fontSize: '0.85rem' }} />
                <button
                  onClick={confirmUpi}
                  disabled={confirmingUpi}
                  style={{ width: '100%', padding: '10px 16px', background: SHARED.success, color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.88rem', fontWeight: 700, cursor: confirmingUpi ? 'not-allowed' : 'pointer' }}
                >
                  {confirmingUpi ? 'Confirming…' : '✅ I have paid — Confirm'}
                </button>
              </div>
            )}

            {!isPaid && !upiLink && (
              <button
                onClick={pay}
                disabled={paying || !method || (method === 'wallet' && walletBalance != null && walletBalance < effectiveBill)}
                style={{
                  width: '100%', padding: '12px 16px',
                  background: (paying || !method) ? BUYER.muted : BUYER.primary,
                  color: '#fff', border: 'none', borderRadius: 10,
                  fontSize: '0.95rem', fontWeight: 700,
                  cursor: (paying || !method) ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
                }}
              >
                {paying ? 'Processing…' : `Pay ₹${effectiveBill.toLocaleString('en-IN')}`}
              </button>
            )}
          </div>
        )}

        <div style={{ textAlign: 'center' }}>
          <Link href="/buyer/bookings" style={{ color: BUYER.muted, textDecoration: 'none', fontSize: '0.84rem' }}>← Back to bookings</Link>
        </div>
      </div>
      <style>{`input:focus { border-color: ${BUYER.primary} !important; box-shadow: 0 0 0 3px rgba(37,99,235,0.1) !important; }`}</style>
    </div>
  )
}

function PaymentMethodCard({
  selected,
  onClick,
  icon,
  title,
  subtitle,
  disabled,
}: {
  selected: boolean
  onClick: () => void
  icon: string
  title: string
  subtitle: string
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer', padding: 12,
        border: `2px solid ${selected ? BUYER.primary : BUYER.borderLight}`,
        borderRadius: 12,
        background: selected ? BUYER.primaryLight : BUYER.white,
        opacity: disabled ? 0.55 : 1,
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{icon}</div>
      <div style={{ color: BUYER.text, fontWeight: 700, fontSize: '0.88rem' }}>{title}</div>
      <div style={{ color: BUYER.muted, fontSize: '0.72rem', marginTop: 2 }}>{subtitle}</div>
      {disabled && <div style={{ color: SHARED.error, fontSize: '0.7rem', marginTop: 4, fontWeight: 700 }}>Insufficient balance</div>}
    </button>
  )
}
