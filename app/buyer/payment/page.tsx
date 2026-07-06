'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { BUYER, SHARED, inputStyle, labelStyle, cardStyle, buttonPrimary, navStyle } from '@/lib/styles'

const PAYMENT_METHODS = [
  { key: 'wallet', label: 'AgriPay Wallet', icon: '💳', desc: 'Instant • From wallet balance', color: BUYER.primary },
]

function PaymentContent() {
  const router = useRouter()
  const [step, setStep] = useState<'recipient' | 'amount' | 'confirm' | 'success'>('recipient')
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('wallet')

  const handleSend = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt < 1) { setError('Min ₹1'); return }
    setLoading(true); setError('')
    try {
      const res = await authFetch('/api/agripay/transfer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toIdentifier: recipient, amount: amt, note, paymentMethod }),
      })
      const json = await res.json()
      if (!res.ok) { setError(json.error || 'Transfer failed'); setLoading(false); return }
      setStep('success')
      setTimeout(() => router.push('/buyer/dashboard'), 3000)
    } catch { setError('Network error') } finally { setLoading(false) }
  }

  const inp = inputStyle(BUYER)
  const lbl = labelStyle(BUYER)

  const steps = ['Recipient', 'Amount', 'Confirm']
  const stepIdx = step === 'recipient' ? 0 : step === 'amount' ? 1 : 2
  const selectedMethod = PAYMENT_METHODS.find(m => m.key === paymentMethod)

  return (
    <div style={{ minHeight: '100vh', background: BUYER.bg, fontFamily: SHARED.font, color: BUYER.text }}>
      <nav style={{ ...navStyle(BUYER), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link href="/buyer/dashboard" style={{ color: BUYER.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← Dashboard</Link>
          <span style={{ color: BUYER.muted }}>›</span>
          <span style={{ color: BUYER.text, fontWeight: 600, fontSize: '0.875rem' }}>Send Payment</span>
        </div>
      </nav>

      <div style={{ maxWidth: '540px', margin: '40px auto', padding: '0 24px' }}>
        {step === 'success' ? (
          <div style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowLg, textAlign: 'center' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: SHARED.successLight, border: `2px solid ${SHARED.success}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✅</div>
            <h2 style={{ color: SHARED.success, fontWeight: 800, margin: '0 0 8px' }}>Payment Sent!</h2>
            <p style={{ color: BUYER.textSecondary, fontWeight: 800, fontSize: '1.8rem', margin: '0 0 4px' }}>₹{amount}</p>
            <p style={{ color: BUYER.muted, fontSize: '0.875rem' }}>via {selectedMethod?.label} to {recipient}</p>
          </div>
        ) : (
          <div style={{ ...cardStyle(BUYER), boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', color: BUYER.textSecondary }}>Send Payment</h2>
            <p style={{ color: BUYER.muted, marginBottom: '22px', fontSize: '0.9rem' }}>Send money to any farmer or user on AgriEasy</p>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
              {steps.map((s, i) => (
                <div key={s} style={{ flex: 1 }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: i <= stepIdx ? BUYER.primary : BUYER.border, marginBottom: '4px' }} />
                  <span style={{ color: i <= stepIdx ? BUYER.primary : BUYER.muted, fontSize: '0.68rem', fontWeight: 700 }}>{s}</span>
                </div>
              ))}
            </div>

            {step === 'recipient' && (
              <div>
                <label style={lbl}>Recipient Phone or AgriPay ID</label>
                <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
                  placeholder="e.g., 9876543210 or 9876543210@agripay" style={inp} autoFocus />

                <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                  <Link href="/agripay/scan" style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', background: BUYER.primaryLight, border: `1px solid ${BUYER.border}`,
                    borderRadius: '12px', color: BUYER.primary, fontWeight: 700, fontSize: '0.875rem',
                    textDecoration: 'none', transition: 'all 0.2s ease',
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>📷</span> Scan QR
                  </Link>
                  <Link href="/agripay" style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    padding: '12px', background: BUYER.primaryLight, border: `1px solid ${BUYER.border}`,
                    borderRadius: '12px', color: BUYER.primary, fontWeight: 700, fontSize: '0.875rem',
                    textDecoration: 'none', transition: 'all 0.2s ease',
                  }}>
                    <span style={{ fontSize: '1.2rem' }}>💳</span> AgriPay
                  </Link>
                </div>
              </div>
            )}

            {step === 'amount' && (
              <div>
                <div style={{ background: BUYER.primaryLight, borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                  <span style={{ color: BUYER.muted, fontSize: '0.8rem' }}>Sending to: </span>
                  <strong style={{ color: BUYER.textSecondary }}>{recipient}</strong>
                </div>
                <label style={lbl}>Amount</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: BUYER.bg, border: `2px solid ${BUYER.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '14px' }}>
                  <span style={{ color: BUYER.primary, fontWeight: 900, fontSize: '2rem' }}>₹</span>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                    style={{ background: 'none', border: 'none', outline: 'none', color: BUYER.textSecondary, fontSize: '2rem', fontWeight: 800, width: '100%' }} autoFocus />
                </div>

                <label style={lbl}>Payment Method</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                  {PAYMENT_METHODS.map(m => (
                    <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                      style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: paymentMethod === m.key ? `${m.color}12` : BUYER.bg, border: `1.5px solid ${paymentMethod === m.key ? m.color : BUYER.border}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}>
                      <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
                      <div style={{ flex: 1 }}>
                        <p style={{ color: BUYER.text, fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{m.label}</p>
                        <p style={{ color: BUYER.muted, fontSize: '0.75rem', margin: '2px 0 0' }}>{m.desc}</p>
                      </div>
                      {paymentMethod === m.key && <span style={{ color: m.color, fontWeight: 900 }}>✓</span>}
                    </button>
                  ))}
                </div>

                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)" style={inp} />
              </div>
            )}

            {step === 'confirm' && (
              <div>
                <div style={{ background: BUYER.primaryLight, borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
                  <p style={{ color: BUYER.muted, fontSize: '0.85rem', margin: '0 0 8px' }}>Sending</p>
                  <p style={{ color: BUYER.textSecondary, fontWeight: 900, fontSize: '2.8rem', margin: '0 0 8px' }}>₹{amount}</p>
                  <p style={{ color: BUYER.muted, fontSize: '0.875rem', margin: '0 0 6px' }}>to <strong style={{ color: BUYER.text }}>{recipient}</strong></p>
                  {note && <p style={{ color: BUYER.muted, fontSize: '0.8rem', margin: '8px 0 0', fontStyle: 'italic' }}>&quot;{note}&quot;</p>}
                </div>
                <div style={{ background: BUYER.bg, border: `1px solid ${BUYER.border}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.2rem' }}>{selectedMethod?.icon}</span>
                  <div>
                    <p style={{ color: BUYER.text, fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{selectedMethod?.label}</p>
                    <p style={{ color: BUYER.muted, fontSize: '0.75rem', margin: 0 }}>{selectedMethod?.desc}</p>
                  </div>
                </div>
              </div>
            )}

            {error && <div style={{ background: SHARED.errorLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', margin: '14px 0 0', color: SHARED.error, fontSize: '0.85rem', fontWeight: 600 }}>⚠ {error}</div>}

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              {step !== 'recipient' && (
                <button onClick={() => { setStep(step === 'confirm' ? 'amount' : 'recipient'); setError('') }}
                  style={{ flex: 1, padding: '13px', background: BUYER.bg, border: `1px solid ${BUYER.border}`, borderRadius: '12px', color: BUYER.muted, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                  ← Back
                </button>
              )}
              <button onClick={() => {
                setError('')
                if (step === 'recipient') { if (!recipient.trim()) { setError('Enter phone or AgriPay ID'); return } setStep('amount') }
                else if (step === 'amount') { if (!amount || parseFloat(amount) < 1) { setError('Enter valid amount (min ₹1)'); return } setStep('confirm') }
                else handleSend()
              }} disabled={loading}
                style={{ flex: 2, padding: '13px', background: BUYER.primary, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 4px 14px rgba(5,150,105,0.25)', transition: 'all 0.2s ease' }}>
                {loading ? 'Sending…' : step === 'confirm' ? '✅ Confirm & Send' : step === 'amount' ? 'Review →' : 'Next →'}
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`input:focus { border-color: ${BUYER.primary} !important; box-shadow: 0 0 0 3px rgba(5,150,105,0.1) !important; }`}</style>
    </div>
  )
}

export default function Payment() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: BUYER.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BUYER.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>}>
      <PaymentContent />
    </Suspense>
  )
}