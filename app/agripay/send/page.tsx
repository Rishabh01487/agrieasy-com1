'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { AGRI, SHARED, navStyle, inputStyle, labelStyle } from '@/lib/styles'

function SendMoneyContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const toParam = searchParams.get('to') || ''

    // Two completely separate flows:
    const [mode, setMode] = useState<'agripay' | 'upi'>('agripay')

    // AgriPay flow state
    const [agripayStep, setAgripayStep] = useState<'recipient' | 'amount' | 'confirm' | 'success'>('recipient')
    const [recipient, setRecipient] = useState(toParam)
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('wallet')

    const [upiStep, setUpiStep] = useState<'enter' | 'pay' | 'success'>('enter')
    const [upiIdToPay, setUpiIdToPay] = useState('')
    const [upiRecipientName, setUpiRecipientName] = useState('')
    const [upiAmount, setUpiAmount] = useState('')
    const [upiNote, setUpiNote] = useState('')
    const [upiRefId, setUpiRefId] = useState('')

    const PAYMENT_METHODS = [
        { key: 'wallet', label: 'AgriPay Wallet', icon: '💳', desc: 'Instant • From wallet balance', color: AGRI.primary },
        { key: 'paylater', label: 'PayLater', icon: '💰', desc: 'Borrowed credit • Repay later', color: '#059669' },
    ]

    const handleAgripaySend = async () => {
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
            setAgripayStep('success')
            setTimeout(() => router.push('/agripay'), 3000)
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    const upiDeepLink = upiIdToPay && upiIdToPay.includes('@')
        ? `upi://pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(upiRecipientName || 'Recipient')}&am=${upiAmount}&tn=${encodeURIComponent(upiNote || 'AgriEasy Transfer')}&cu=INR`
        : ''

    const qrCodeUrl = upiDeepLink
        ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiDeepLink)}`
        : ''

    const handleUpiPaid = async () => {
        setLoading(true); setError('')
        try {
            const res = await authFetch('/api/agripay/upi-pay', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toIdentifier: upiRecipientName || upiIdToPay,
                    upiId: upiIdToPay,
                    amount: parseFloat(upiAmount),
                    note: upiNote,
                    upiRefId: upiRefId || '',
                }),
            })
            const data = await res.json()
            if (res.ok) {
                setUpiStep('success')
                setTimeout(() => router.push('/agripay'), 3000)
            } else {
                setError(data.error || 'Failed to record payment')
            }
        } catch { setError('Network error') }
        setLoading(false)
    }

    const agripaySteps = ['Recipient', 'Amount', 'Confirm']
    const agripayStepIdx = agripayStep === 'recipient' ? 0 : agripayStep === 'amount' ? 1 : 2
    const selectedMethod = PAYMENT_METHODS.find(m => m.key === paymentMethod)

    return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, fontFamily: SHARED.font, color: AGRI.text }}>
            <nav style={{ ...navStyle(AGRI), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: AGRI.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← AgriPay</Link>
                    <span style={{ color: AGRI.muted }}>›</span>
                    <span style={{ color: AGRI.text, fontWeight: 600, fontSize: '0.875rem' }}>Send Money</span>
                </div>
            </nav>

            <div style={{ maxWidth: '540px', margin: '40px auto', padding: '0 24px' }}>

                {/* ═══════════════ MODE SELECTOR ═══════════════ */}
                {mode === 'agripay' && agripayStep !== 'success' && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                        <button onClick={() => setMode('agripay')} style={{ flex: 1, padding: '14px', background: AGRI.primary, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            💳 To AgriPay User
                        </button>
                        <button onClick={() => setMode('upi')} style={{ flex: 1, padding: '14px', background: AGRI.white, color: AGRI.primary, border: `1.5px solid ${AGRI.border}`, borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            📱 Via UPI (Direct)
                        </button>
                    </div>
                )}
                {mode === 'upi' && upiStep !== 'success' && (
                    <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
                        <button onClick={() => setMode('agripay')} style={{ flex: 1, padding: '14px', background: AGRI.white, color: AGRI.primary, border: `1.5px solid ${AGRI.border}`, borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            💳 To AgriPay User
                        </button>
                        <button onClick={() => setMode('upi')} style={{ flex: 1, padding: '14px', background: AGRI.primary, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '0.88rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                            📱 Via UPI (Direct)
                        </button>
                    </div>
                )}

                {/* ═══════════════ AGRI PAY FLOW ═══════════════ */}
                {mode === 'agripay' && agripayStep === 'success' && (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '48px', textAlign: 'center', boxShadow: SHARED.shadowMd }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', border: `2px solid ${AGRI.green}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✅</div>
                        <h2 style={{ color: AGRI.green, fontWeight: 800, margin: '0 0 8px' }}>Money Sent!</h2>
                        <p style={{ color: AGRI.textSecondary, fontWeight: 800, fontSize: '1.8rem', margin: '0 0 4px' }}>₹{amount}</p>
                        <p style={{ color: AGRI.muted, fontSize: '0.875rem' }}>via {selectedMethod?.label} to {recipient}</p>
                        <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '12px 0 0' }}>Redirecting to AgriPay…</p>
                    </div>
                )}

                {mode === 'agripay' && agripayStep !== 'success' && (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '32px', boxShadow: SHARED.shadowMd }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', color: AGRI.textSecondary }}>↗️ Send to AgriPay User</h2>
                        <p style={{ color: AGRI.muted, marginBottom: '22px', fontSize: '0.9rem' }}>Send to another AgriEasy user's wallet</p>

                        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
                            {agripaySteps.map((s, i) => (
                                <div key={s} style={{ flex: 1 }}>
                                    <div style={{ height: '4px', borderRadius: '2px', background: i <= agripayStepIdx ? AGRI.primary : AGRI.border, marginBottom: '4px' }} />
                                    <span style={{ color: i <= agripayStepIdx ? AGRI.primary : AGRI.muted, fontSize: '0.68rem', fontWeight: 700 }}>{s}</span>
                                </div>
                            ))}
                        </div>

                        {agripayStep === 'recipient' && (
                            <div>
                                <label style={labelStyle(AGRI)}>Phone Number or AgriPay ID</label>
                                <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)} placeholder="e.g., 9876543210 or 9876543210@agripay" style={inputStyle(AGRI)} autoFocus />
                            </div>
                        )}

                        {agripayStep === 'amount' && (
                            <div>
                                <div style={{ background: AGRI.primaryLight, borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                                    <span style={{ color: AGRI.muted, fontSize: '0.8rem' }}>Sending to: </span><strong style={{ color: AGRI.textSecondary }}>{recipient}</strong>
                                </div>
                                <label style={labelStyle(AGRI)}>Amount</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: AGRI.bg, border: `2px solid ${AGRI.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '14px' }}>
                                    <span style={{ color: AGRI.primary, fontWeight: 900, fontSize: '2rem' }}>₹</span>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" style={{ background: 'none', border: 'none', outline: 'none', color: AGRI.textSecondary, fontSize: '2rem', fontWeight: 800, width: '100%' }} autoFocus />
                                </div>
                                <label style={labelStyle(AGRI)}>Payment Method</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
                                    {PAYMENT_METHODS.map(m => (
                                        <button key={m.key} onClick={() => setPaymentMethod(m.key)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: paymentMethod === m.key ? `${m.color}12` : AGRI.bg, border: `1.5px solid ${paymentMethod === m.key ? m.color : AGRI.border}`, borderRadius: '12px', cursor: 'pointer', textAlign: 'left' }}>
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

                        {agripayStep === 'confirm' && (
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
                            {agripayStep !== 'recipient' && (
                                <button onClick={() => { setAgripayStep(agripayStep === 'confirm' ? 'amount' : 'recipient'); setError('') }} style={{ flex: 1, padding: '13px', background: AGRI.bg, border: `1px solid ${AGRI.border}`, borderRadius: '12px', color: AGRI.muted, fontWeight: 700, cursor: 'pointer' }}>← Back</button>
                            )}
                            <button onClick={() => {
                                setError('')
                                if (agripayStep === 'recipient') { if (!recipient.trim()) { setError('Enter phone or AgriPay ID'); return } setAgripayStep('amount') }
                                else if (agripayStep === 'amount') { if (!amount || parseFloat(amount) < 1) { setError('Enter valid amount (min ₹1)'); return } setAgripayStep('confirm') }
                                else handleAgripaySend()
                            }} disabled={loading} style={{ flex: 2, padding: '13px', background: AGRI.primary, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Sending…' : agripayStep === 'confirm' ? '✅ Confirm & Send' : agripayStep === 'amount' ? 'Review →' : 'Next →'}
                            </button>
                        </div>
                    </div>
                )}

                {/* ═══════════════ UPI FLOW (completely separate) ═══════════════ */}
                {mode === 'upi' && upiStep === 'success' && (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '48px', textAlign: 'center', boxShadow: SHARED.shadowMd }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', border: `2px solid ${AGRI.green}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✅</div>
                        <h2 style={{ color: AGRI.green, fontWeight: 800, margin: '0 0 8px' }}>Money Sent!</h2>
                        <p style={{ color: AGRI.textSecondary, fontWeight: 800, fontSize: '1.8rem', margin: '0 0 4px' }}>₹{upiAmount}</p>
                        <p style={{ color: AGRI.muted, fontSize: '0.875rem' }}>via UPI to {upiIdToPay}</p>
                        <p style={{ color: AGRI.green, fontSize: '0.78rem', margin: '8px 0 0', fontWeight: 600 }}>✓ 0% transaction fee — direct bank transfer</p>
                        <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '12px 0 0' }}>Redirecting to AgriPay…</p>
                    </div>
                )}

                {mode === 'upi' && upiStep === 'enter' && (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '32px', boxShadow: SHARED.shadowMd }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', color: AGRI.textSecondary }}>📱 Pay via UPI</h2>
                        <p style={{ color: AGRI.muted, marginBottom: '22px', fontSize: '0.9rem' }}>Pay anyone with a UPI ID — 0% fees, direct bank-to-bank</p>

                        <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '10px', padding: '10px 14px', marginBottom: '20px', fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>
                            ✅ <strong>0% fees</strong> — money goes directly from your bank to their bank. No payment gateway involved.
                        </div>

                        <label style={labelStyle(AGRI)}>Recipient UPI ID</label>
                        <input type="text" value={upiIdToPay} onChange={e => setUpiIdToPay(e.target.value)} placeholder="e.g., farmer@paytm, shop@oksbi, 9876543210@ybl" style={inputStyle(AGRI)} autoFocus />
                        <p style={{ color: AGRI.muted, fontSize: '0.72rem', margin: '4px 0 16px' }}>Enter the recipient's UPI ID. They don't need an AgriEasy account.</p>

                        <label style={labelStyle(AGRI)}>Recipient Name (optional)</label>
                        <input type="text" value={upiRecipientName} onChange={e => setUpiRecipientName(e.target.value)} placeholder="e.g., Ramesh Kumar" style={inputStyle(AGRI)} />

                        <label style={{ ...labelStyle(AGRI), marginTop: '14px' }}>Amount</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: AGRI.bg, border: `2px solid ${AGRI.border}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '14px' }}>
                            <span style={{ color: AGRI.primary, fontWeight: 900, fontSize: '2rem' }}>₹</span>
                            <input type="number" value={upiAmount} onChange={e => setUpiAmount(e.target.value)} placeholder="0" style={{ background: 'none', border: 'none', outline: 'none', color: AGRI.textSecondary, fontSize: '2rem', fontWeight: 800, width: '100%' }} />
                        </div>

                        <input type="text" value={upiNote} onChange={e => setUpiNote(e.target.value)} placeholder="Add a note (optional)" style={inputStyle(AGRI)} />

                        {error && <div style={{ background: AGRI.redLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', margin: '14px 0 0', color: AGRI.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <button onClick={() => {
                            if (!upiIdToPay.trim() || !upiIdToPay.includes('@')) { setError('Enter a valid UPI ID (e.g., name@paytm)'); return }
                            if (!upiAmount || parseFloat(upiAmount) < 1) { setError('Enter valid amount (min ₹1)'); return }
                            setError(''); setUpiStep('pay')
                        }} style={{ width: '100%', padding: '14px', background: AGRI.primary, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', marginTop: '20px' }}>
                            Continue to Pay →
                        </button>
                    </div>
                )}

                {mode === 'upi' && upiStep === 'pay' && (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '32px', boxShadow: SHARED.shadowMd }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: '0 0 6px', color: AGRI.textSecondary, textAlign: 'center' }}>📱 Complete UPI Payment</h2>

                        <div style={{ background: AGRI.primaryLight, borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '0 0 4px' }}>Amount</p>
                            <p style={{ color: AGRI.textSecondary, fontWeight: 900, fontSize: '2.4rem', margin: 0 }}>₹{upiAmount}</p>
                            <p style={{ color: AGRI.muted, fontSize: '0.74rem', margin: '6px 0 0' }}>to {upiIdToPay}</p>
                        </div>

                        {/* QR Code */}
                        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '0 0 10px', fontWeight: 600 }}>Scan with any UPI app to pay</p>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: 240, height: 240, borderRadius: 12, border: `1px solid ${AGRI.border}`, margin: '0 auto', display: 'block' }} />
                        </div>

                        {/* UPI App buttons */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                            <a href={upiDeepLink} style={{ display: 'block', textAlign: 'center', padding: '14px', background: AGRI.primary, color: '#fff', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', textDecoration: 'none' }}>📱 Open UPI App</a>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                <a href={`tez://upi/pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(upiRecipientName || 'Recipient')}&am=${upiAmount}&tn=${encodeURIComponent(upiNote || 'AgriEasy')}&cu=INR`} style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${AGRI.border}`, borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: AGRI.text, textDecoration: 'none' }}>🟢 GPay</a>
                                <a href={`phonepe://pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(upiRecipientName || 'Recipient')}&am=${upiAmount}&tn=${encodeURIComponent(upiNote || 'AgriEasy')}&cu=INR`} style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${AGRI.border}`, borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: AGRI.text, textDecoration: 'none' }}>🟣 PhonePe</a>
                                <a href={`paytmmp://pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(upiRecipientName || 'Recipient')}&am=${upiAmount}&tn=${encodeURIComponent(upiNote || 'AgriEasy')}&cu=INR`} style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${AGRI.border}`, borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: AGRI.text, textDecoration: 'none' }}>🔵 Paytm</a>
                                <a href={`bhim://pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(upiRecipientName || 'Recipient')}&am=${upiAmount}&tn=${encodeURIComponent(upiNote || 'AgriEasy')}&cu=INR`} style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${AGRI.border}`, borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: AGRI.text, textDecoration: 'none' }}>🟠 BHIM</a>
                            </div>
                            <p style={{ color: AGRI.muted, fontSize: '0.72rem', margin: '8px 0', textAlign: 'center' }}>📱 On mobile: tap a button above<br />💻 On desktop: scan the QR code</p>
                        </div>

                        {/* UPI Ref ID */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle(AGRI)}>UPI Reference / UTR Number (optional)</label>
                            <input type="text" value={upiRefId} onChange={e => setUpiRefId(e.target.value)} placeholder="e.g., 412384929374" style={inputStyle(AGRI)} />
                        </div>

                        {error && <div style={{ background: AGRI.redLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', color: AGRI.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <button onClick={handleUpiPaid} disabled={loading} style={{ width: '100%', padding: '14px', background: AGRI.green, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1, marginBottom: '8px' }}>
                            {loading ? 'Recording…' : "✅ I've Paid — Record Transaction"}
                        </button>
                        <button onClick={() => setUpiStep('enter')} style={{ width: '100%', padding: '10px', background: AGRI.bg, border: `1px solid ${AGRI.border}`, borderRadius: '10px', color: AGRI.muted, fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}>← Back</button>
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
