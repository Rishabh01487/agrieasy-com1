'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { AGRI, SHARED, navStyle, inputStyle, labelStyle } from '@/lib/styles'

const PAYMENT_METHODS = [
    { key: 'wallet', label: 'AgriPay Wallet', icon: '💳', desc: 'Instant • From wallet balance', color: AGRI.primary },
    { key: 'paylater', label: 'PayLater', icon: '💰', desc: 'Borrowed credit • Repay later', color: '#059669' },
]

function SendMoneyContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const toParam = searchParams.get('to') || ''

    const [step, setStep] = useState<'recipient' | 'amount' | 'confirm' | 'success'>('recipient')
    const [recipient, setRecipient] = useState(toParam)
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
            setTimeout(() => router.push('/agripay'), 3000)
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    const steps = ['Recipient', 'Amount', 'Confirm']
    const stepIdx = step === 'recipient' ? 0 : step === 'amount' ? 1 : 2
    const selectedMethod = PAYMENT_METHODS.find(m => m.key === paymentMethod)

    return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, fontFamily: SHARED.font, color: AGRI.text }}>
            <nav style={{ ...navStyle(AGRI), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: AGRI.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s ease' }}>← AgriPay</Link>
                    <span style={{ color: AGRI.muted }}>›</span>
                    <span style={{ color: AGRI.text, fontWeight: 600, fontSize: '0.875rem' }}>Send Money</span>
                </div>
            </nav>

            <div style={{ maxWidth: '540px', margin: '40px auto', padding: '0 24px' }}>
                {step === 'success' ? (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '48px', textAlign: 'center', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', border: `2px solid ${AGRI.green}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✅</div>
                        <h2 style={{ color: AGRI.green, fontWeight: 800, margin: '0 0 8px' }}>Money Sent!</h2>
                        <p style={{ color: AGRI.textSecondary, fontWeight: 800, fontSize: '1.8rem', margin: '0 0 4px' }}>₹{amount}</p>
                        <p style={{ color: AGRI.muted, fontSize: '0.875rem' }}>via {selectedMethod?.label} to {recipient}</p>
                    </div>
                ) : (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '32px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', color: AGRI.textSecondary }}>↗️ Send Money</h2>
                        <p style={{ color: AGRI.muted, marginBottom: '22px', fontSize: '0.9rem' }}>Send to any AgriEasy user via your preferred method</p>

                        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
                            {steps.map((s, i) => (
                                <div key={s} style={{ flex: 1 }}>
                                    <div style={{ height: '4px', borderRadius: '2px', background: i <= stepIdx ? AGRI.primary : AGRI.border, marginBottom: '4px' }} />
                                    <span style={{ color: i <= stepIdx ? AGRI.primary : AGRI.muted, fontSize: '0.68rem', fontWeight: 700 }}>{s}</span>
                                </div>
                            ))}
                        </div>

                        {step === 'recipient' && (
                            <div>
                                <label style={labelStyle(AGRI)}>Phone Number or AgriPay ID</label>
                                <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
                                    placeholder="e.g., 9876543210 or 9876543210@agripay" style={inputStyle(AGRI)} autoFocus />
                            </div>
                        )}

                        {step === 'amount' && (
                            <div>
                                <div style={{ background: AGRI.primaryLight, borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                                    <span style={{ color: AGRI.muted, fontSize: '0.8rem' }}>Sending to: </span>
                                    <strong style={{ color: AGRI.textSecondary }}>{recipient}</strong>
                                </div>
                                <label style={labelStyle(AGRI)}>Amount</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: AGRI.bg, border: `2px solid ${AGRI.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '14px' }}>
                                    <span style={{ color: AGRI.primary, fontWeight: 900, fontSize: '2rem' }}>₹</span>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                                        style={{ background: 'none', border: 'none', outline: 'none', color: AGRI.textSecondary, fontSize: '2rem', fontWeight: 800, width: '100%' }} autoFocus />
                                </div>

                                {/* Payment Method Selection */}
                                <label style={labelStyle(AGRI)}>Payment Method</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                                    {PAYMENT_METHODS.map(m => (
                                        <button key={m.key} onClick={() => setPaymentMethod(m.key)}
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: paymentMethod === m.key ? `${m.color}12` : AGRI.bg, border: `1.5px solid ${paymentMethod === m.key ? m.color : AGRI.border}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease' }}>
                                            <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
                                            <div style={{ flex: 1 }}>
                                                <p style={{ color: AGRI.text, fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{m.label}</p>
                                                <p style={{ color: AGRI.muted, fontSize: '0.75rem', margin: '2px 0 0' }}>{m.desc}</p>
                                            </div>
                                            {paymentMethod === m.key && <span style={{ color: m.color, fontWeight: 900 }}>✓</span>}
                                        </button>
                                    ))}
                                </div>

                                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)" style={inputStyle(AGRI)} />
                            </div>
                        )}

                        {step === 'confirm' && (
                            <div>
                                <div style={{ background: AGRI.primaryLight, borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '16px' }}>
                                    <p style={{ color: AGRI.muted, fontSize: '0.85rem', margin: '0 0 8px' }}>Sending</p>
                                    <p style={{ color: AGRI.textSecondary, fontWeight: 900, fontSize: '2.8rem', margin: '0 0 8px' }}>₹{amount}</p>
                                    <p style={{ color: AGRI.muted, fontSize: '0.875rem', margin: '0 0 6px' }}>to <strong style={{ color: AGRI.text }}>{recipient}</strong></p>
                                    {note && <p style={{ color: AGRI.muted, fontSize: '0.8rem', margin: '8px 0 0', fontStyle: 'italic' }}>&quot;{note}&quot;</p>}
                                </div>
                                <div style={{ background: AGRI.bg, border: `1px solid ${AGRI.border}`, borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span style={{ fontSize: '1.2rem' }}>{selectedMethod?.icon}</span>
                                    <div>
                                        <p style={{ color: AGRI.text, fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{selectedMethod?.label}</p>
                                        <p style={{ color: AGRI.muted, fontSize: '0.75rem', margin: 0 }}>{selectedMethod?.desc}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {error && <div style={{ background: AGRI.redLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', margin: '14px 0 0', color: AGRI.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            {step !== 'recipient' && (
                                <button onClick={() => { setStep(step === 'confirm' ? 'amount' : 'recipient'); setError('') }}
                                    style={{ flex: 1, padding: '13px', background: AGRI.bg, border: `1px solid ${AGRI.border}`, borderRadius: '12px', color: AGRI.muted, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>
                                    ← Back
                                </button>
                            )}
                            <button onClick={() => {
                                setError('')
                                if (step === 'recipient') { if (!recipient.trim()) { setError('Enter phone or AgriPay ID'); return } setStep('amount') }
                                else if (step === 'amount') { if (!amount || parseFloat(amount) < 1) { setError('Enter valid amount (min ₹1)'); return } setStep('confirm') }
                                else handleSend()
                            }} disabled={loading}
                                style={{ flex: 2, padding: '13px', background: AGRI.primary, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease' }}>
                                {loading ? 'Sending…' : step === 'confirm' ? '✅ Confirm & Send' : step === 'amount' ? 'Review →' : 'Next →'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`input:focus { border-color: ${AGRI.primary} !important; }`}</style>
        </div>
    )
}

export default function SendMoney() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: AGRI.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AGRI.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>}>
            <SendMoneyContent />
        </Suspense>
    )
}