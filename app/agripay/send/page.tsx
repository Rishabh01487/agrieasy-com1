'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { AGRI, SHARED, navStyle, inputStyle, labelStyle } from '@/lib/styles'

const PAYMENT_METHODS = [
    { key: 'wallet', label: 'AgriPay Wallet', icon: '💳', desc: 'Instant • From wallet balance', color: AGRI.primary },
    { key: 'paylater', label: 'PayLater', icon: '💰', desc: 'Borrowed credit • Repay later', color: '#059669' },
    { key: 'upi', label: 'UPI (Direct)', icon: '📱', desc: 'Google Pay, PhonePe, Paytm • 0% fees • Pay anyone', color: '#7c3aed' },
]

function SendMoneyContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const toParam = searchParams.get('to') || ''

    const [step, setStep] = useState<'recipient' | 'amount' | 'confirm' | 'upi_pay' | 'success'>('recipient')
    const [recipient, setRecipient] = useState(toParam)
    const [recipientName, setRecipientName] = useState('')
    const [upiIdToPay, setUpiIdToPay] = useState('')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [paymentMethod, setPaymentMethod] = useState('wallet')
    const [upiRefId, setUpiRefId] = useState('')

    const isUpiDirect = paymentMethod === 'upi'

    const handleSend = async () => {
        const amt = parseFloat(amount)
        if (!amt || amt < 1) { setError('Min ₹1'); return }
        setLoading(true); setError('')

        if (isUpiDirect) {
            // ── Direct UPI flow (FREE — no gateway, no fees) ──
            // Try to find the recipient in AgriEasy first (to get their UPI ID)
            // If not found, let the user enter a UPI ID manually
            try {
                const res = await authFetch(`/api/agripay/upi-pay?toIdentifier=${encodeURIComponent(recipient)}`)
                const data = await res.json().catch(() => ({}))

                if (res.ok && data.upiId) {
                    // Recipient found + has UPI ID → use it directly
                    setUpiIdToPay(data.upiId)
                    setRecipientName(data.recipientName || recipient)
                    setStep('upi_pay')
                    setLoading(false)
                } else {
                    // Recipient not found OR no UPI ID → let user enter UPI ID manually
                    setRecipientName(recipient)
                    setUpiIdToPay('')
                    setStep('upi_pay')
                    setLoading(false)
                }
            } catch {
                // Network error → still let user enter UPI ID manually
                setRecipientName(recipient)
                setUpiIdToPay('')
                setStep('upi_pay')
                setLoading(false)
            }
        } else {
            // ── Wallet / PayLater flow (existing) ──
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
    }

    // Generate UPI deep link from the manually entered or fetched UPI ID
    const upiDeepLink = upiIdToPay
        ? `upi://pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(recipientName || 'Recipient')}&am=${amount}&tn=${encodeURIComponent(note || 'AgriEasy Transfer')}&cu=INR`
        : ''

    // Generate QR code URL (free, no API key needed)
    const qrCodeUrl = upiDeepLink
        ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(upiDeepLink)}`
        : ''

    const handleUpiPaid = async () => {
        setLoading(true)
        setError('')
        try {
            // Record the transaction — works with or without a registered recipient
            const res = await authFetch('/api/agripay/upi-pay', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    toIdentifier: recipient,
                    upiId: upiIdToPay,
                    amount: parseFloat(amount),
                    note,
                    upiRefId: upiRefId || '',
                }),
            })
            const data = await res.json()
            if (res.ok) {
                setStep('success')
                setTimeout(() => router.push('/agripay'), 3000)
            } else {
                setError(data.error || 'Failed to record payment')
            }
        } catch {
            setError('Network error — but your UPI payment was still sent. The transaction will appear in your bank statement.')
        }
        setLoading(false)
    }

    const steps = ['Recipient', 'Amount', 'Confirm']
    const stepIdx = step === 'recipient' ? 0 : step === 'amount' ? 1 : 2
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
                {/* SUCCESS */}
                {step === 'success' ? (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '48px', textAlign: 'center', boxShadow: SHARED.shadowMd }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', border: `2px solid ${AGRI.green}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✅</div>
                        <h2 style={{ color: AGRI.green, fontWeight: 800, margin: '0 0 8px' }}>Money Sent!</h2>
                        <p style={{ color: AGRI.textSecondary, fontWeight: 800, fontSize: '1.8rem', margin: '0 0 4px' }}>₹{amount}</p>
                        <p style={{ color: AGRI.muted, fontSize: '0.875rem' }}>via {selectedMethod?.label} to {upiIdToPay || recipientName || recipient}</p>
                        {isUpiDirect && <p style={{ color: AGRI.green, fontSize: '0.78rem', margin: '8px 0 0', fontWeight: 600 }}>✓ 0% transaction fee — direct bank transfer</p>}
                        <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '12px 0 0' }}>Redirecting to AgriPay…</p>
                    </div>
                ) : step === 'upi_pay' ? (
                    /* ── UPI PAYMENT SCREEN ── */
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '32px', boxShadow: SHARED.shadowMd }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.3rem', margin: '0 0 6px', color: AGRI.textSecondary, textAlign: 'center' }}>📱 Pay via UPI</h2>
                        <p style={{ color: AGRI.muted, fontSize: '0.84rem', margin: '0 0 20px', textAlign: 'center' }}>₹{amount} to {recipientName}</p>

                        {/* Amount card */}
                        <div style={{ background: AGRI.primaryLight, borderRadius: '14px', padding: '20px', textAlign: 'center', marginBottom: '20px' }}>
                            <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '0 0 4px' }}>Amount to pay</p>
                            <p style={{ color: AGRI.textSecondary, fontWeight: 900, fontSize: '2.4rem', margin: 0 }}>₹{amount}</p>
                        </div>

                        {/* UPI ID input — let user enter/edit the UPI ID */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle(AGRI)}>Recipient UPI ID</label>
                            <input
                                type="text"
                                value={upiIdToPay}
                                onChange={e => setUpiIdToPay(e.target.value)}
                                placeholder="e.g., farmer@paytm, shop@oksbi, 9876543210@ybl"
                                style={inputStyle(AGRI)}
                                autoFocus
                            />
                            <p style={{ color: AGRI.muted, fontSize: '0.72rem', margin: '4px 0 0' }}>Enter the recipient's UPI ID. You can pay anyone — they don't need an AgriEasy account.</p>
                        </div>

                        {/* QR Code — only show if UPI ID is entered */}
                        {upiIdToPay && upiIdToPay.includes('@') && (
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '0 0 10px', fontWeight: 600 }}>Scan with any UPI app to pay</p>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={qrCodeUrl} alt="UPI QR Code" style={{ width: 240, height: 240, borderRadius: 12, border: `1px solid ${AGRI.border}`, margin: '0 auto', display: 'block' }} />
                                <p style={{ color: AGRI.muted, fontSize: '0.7rem', margin: '8px 0 0' }}>GPay · PhonePe · Paytm · BHIM · Amazon Pay</p>
                            </div>
                        )}

                        {/* Pay via UPI App buttons — show specific apps + generic */}
                        {upiIdToPay && upiIdToPay.includes('@') && (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                                {/* Generic UPI deep link */}
                                <a href={upiDeepLink} style={{
                                    display: 'block', textAlign: 'center', padding: '14px',
                                    background: AGRI.primary, color: '#fff', borderRadius: '12px',
                                    fontWeight: 800, fontSize: '1rem', textDecoration: 'none',
                                }}>
                                    📱 Open UPI App
                                </a>

                                {/* Specific UPI app deep links (these work better on mobile) */}
                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                                    <a href={`tez://upi/pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(recipientName || 'Recipient')}&am=${amount}&tn=${encodeURIComponent(note || 'AgriEasy')}&cu=INR`} style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${AGRI.border}`, borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: AGRI.text, textDecoration: 'none' }}>🟢 GPay</a>
                                    <a href={`phonepe://pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(recipientName || 'Recipient')}&am=${amount}&tn=${encodeURIComponent(note || 'AgriEasy')}&cu=INR`} style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${AGRI.border}`, borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: AGRI.text, textDecoration: 'none' }}>🟣 PhonePe</a>
                                    <a href={`paytmmp://pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(recipientName || 'Recipient')}&am=${amount}&tn=${encodeURIComponent(note || 'AgriEasy')}&cu=INR`} style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${AGRI.border}`, borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: AGRI.text, textDecoration: 'none' }}>🔵 Paytm</a>
                                    <a href={`bhim://pay?pa=${encodeURIComponent(upiIdToPay)}&pn=${encodeURIComponent(recipientName || 'Recipient')}&am=${amount}&tn=${encodeURIComponent(note || 'AgriEasy')}&cu=INR`} style={{ padding: '8px 14px', background: '#fff', border: `1.5px solid ${AGRI.border}`, borderRadius: '10px', fontSize: '0.78rem', fontWeight: 700, color: AGRI.text, textDecoration: 'none' }}>🟠 BHIM</a>
                                </div>

                                {/* Desktop notice */}
                                <p style={{ color: AGRI.muted, fontSize: '0.72rem', margin: '8px 0 0', textAlign: 'center' }}>
                                    📱 On mobile: tap a button above to open the UPI app.<br/>
                                    💻 On desktop: scan the QR code with your phone's UPI app.
                                </p>
                            </div>
                        )}

                        {/* UPI Ref ID input (optional) */}
                        <div style={{ marginBottom: '16px' }}>
                            <label style={labelStyle(AGRI)}>UPI Reference / UTR Number (optional)</label>
                            <input type="text" value={upiRefId} onChange={e => setUpiRefId(e.target.value)}
                                placeholder="e.g., 412384929374" style={inputStyle(AGRI)} />
                        </div>

                        {error && <div style={{ background: AGRI.redLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', color: AGRI.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        {/* I've Paid button */}
                        <button onClick={handleUpiPaid} disabled={loading || !upiIdToPay}
                            style={{ width: '100%', padding: '14px', background: upiIdToPay ? AGRI.green : AGRI.muted, color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 800, fontSize: '1rem', cursor: upiIdToPay ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1, marginBottom: '8px' }}>
                            {loading ? 'Recording…' : '✅ I\'ve Paid — Record Transaction'}
                        </button>

                        <button onClick={() => setStep('confirm')} style={{ width: '100%', padding: '10px', background: AGRI.bg, border: `1px solid ${AGRI.border}`, borderRadius: '10px', color: AGRI.muted, fontWeight: 700, cursor: 'pointer', fontSize: '0.84rem' }}>
                            ← Back
                        </button>

                        <p style={{ color: AGRI.muted, fontSize: '0.72rem', margin: '12px 0 0', textAlign: 'center' }}>
                            💡 Direct UPI transfer — money goes from your bank to their bank. <strong>0% fees.</strong> No payment gateway involved.
                        </p>
                    </div>
                ) : (
                    /* ── NORMAL FLOW ── */
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '32px', boxShadow: SHARED.shadowMd }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', color: AGRI.textSecondary }}>↗️ Send Money</h2>
                        <p style={{ color: AGRI.muted, marginBottom: '22px', fontSize: '0.9rem' }}>Send money via your preferred method</p>

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
                                <label style={labelStyle(AGRI)}>{isUpiDirect ? 'Recipient (phone, name, or anything)' : 'Phone Number or AgriPay ID'}</label>
                                <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
                                    placeholder={isUpiDirect ? "e.g., Ramesh, Farmer, 9876543210" : "e.g., 9876543210 or 9876543210@agripay"} style={inputStyle(AGRI)} autoFocus />
                                {isUpiDirect && (
                                    <p style={{ color: AGRI.muted, fontSize: '0.72rem', margin: '6px 0 0' }}>For UPI, just enter who you're paying. You'll enter their UPI ID on the next screen.</p>
                                )}
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

                                {isUpiDirect && (
                                    <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>
                                        ✅ UPI Direct = <strong>0% fees</strong>. Pay anyone with a UPI ID — they don't need an AgriEasy account. Money goes directly from your bank to their bank.
                                    </div>
                                )}

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
                                {isUpiDirect && (
                                    <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: '10px', padding: '10px 14px', marginTop: '12px', fontSize: '0.78rem', color: '#065f46', fontWeight: 600 }}>
                                        ✅ 0% fees — direct bank-to-bank UPI transfer. You'll enter the recipient's UPI ID on the next screen.
                                    </div>
                                )}
                            </div>
                        )}

                        {error && <div style={{ background: AGRI.redLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', margin: '14px 0 0', color: AGRI.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            {step !== 'recipient' && (
                                <button onClick={() => { setStep(step === 'confirm' ? 'amount' : 'recipient'); setError('') }}
                                    style={{ flex: 1, padding: '13px', background: AGRI.bg, border: `1px solid ${AGRI.border}`, borderRadius: '12px', color: AGRI.muted, fontWeight: 700, cursor: 'pointer' }}>
                                    ← Back
                                </button>
                            )}
                            <button onClick={() => {
                                setError('')
                                if (step === 'recipient') { if (!recipient.trim()) { setError('Enter recipient'); return } setStep('amount') }
                                else if (step === 'amount') { if (!amount || parseFloat(amount) < 1) { setError('Enter valid amount (min ₹1)'); return } setStep('confirm') }
                                else handleSend()
                            }} disabled={loading}
                                style={{ flex: 2, padding: '13px', background: AGRI.primary, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Processing…' : step === 'confirm' ? (isUpiDirect ? '📱 Pay via UPI →' : '✅ Confirm & Send') : step === 'amount' ? 'Review →' : 'Next →'}
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
