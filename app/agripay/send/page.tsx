'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = {
    bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
    brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280',
    border: '#ddd6fe', green: '#059669', red: '#dc2626',
}

export default function SendMoney() {
    const router = useRouter()
    const [step, setStep] = useState<'recipient' | 'amount' | 'confirm' | 'success'>('recipient')
    const [recipient, setRecipient] = useState('')
    const [amount, setAmount] = useState('')
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSend = async () => {
        const amt = parseFloat(amount)
        if (!amt || amt < 1) { setError('Min ₹1'); return }
        setLoading(true); setError('')
        const userId = localStorage.getItem('userId')
        if (!userId) { setError('Not logged in'); setLoading(false); return }
        try {
            const res = await fetch('/api/agripay/transfer', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fromUserId: userId, toIdentifier: recipient, amount: amt, note }),
            })
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Transfer failed'); setLoading(false); return }
            setStep('success')
            setTimeout(() => router.push('/agripay'), 3000)
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    const inp: React.CSSProperties = {
        width: '100%', padding: '13px 14px', background: C.bg, border: `1.5px solid ${C.border}`,
        borderRadius: '10px', color: C.text, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box',
    }

    const steps = ['Recipient', 'Amount', 'Confirm']
    const stepIdx = step === 'recipient' ? 0 : step === 'amount' ? 1 : 2

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
                <div style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: C.brinjal, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← AgriPay</Link>
                    <span style={{ color: C.muted }}>›</span>
                    <span style={{ color: C.text, fontWeight: 600, fontSize: '0.875rem' }}>Send Money</span>
                </div>
            </nav>

            <div style={{ maxWidth: '540px', margin: '40px auto', padding: '0 24px' }}>
                {step === 'success' ? (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', border: `2px solid ${C.green}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✅</div>
                        <h2 style={{ color: C.green, fontWeight: 800, margin: '0 0 8px' }}>Money Sent!</h2>
                        <p style={{ color: C.brDark, fontWeight: 800, fontSize: '1.8rem', margin: '0 0 4px' }}>₹{amount}</p>
                        <p style={{ color: C.muted, fontSize: '0.875rem' }}>sent to {recipient}</p>
                    </div>
                ) : (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '32px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', color: C.brDark }}>↗️ Send Money</h2>
                        <p style={{ color: C.muted, marginBottom: '22px', fontSize: '0.9rem' }}>Send to any AgriEasy user instantly</p>

                        {/* Step indicator */}
                        <div style={{ display: 'flex', gap: '6px', marginBottom: '24px' }}>
                            {steps.map((s, i) => (
                                <div key={s} style={{ flex: 1 }}>
                                    <div style={{ height: '4px', borderRadius: '2px', background: i <= stepIdx ? C.brinjal : C.border, marginBottom: '4px' }} />
                                    <span style={{ color: i <= stepIdx ? C.brinjal : C.muted, fontSize: '0.68rem', fontWeight: 700 }}>{s}</span>
                                </div>
                            ))}
                        </div>

                        {step === 'recipient' && (
                            <div>
                                <label style={{ color: C.muted, fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Phone Number or AgriPay ID</label>
                                <input type="text" value={recipient} onChange={e => setRecipient(e.target.value)}
                                    placeholder="e.g., 9876543210 or 9876543210@agripay" style={inp} autoFocus />
                            </div>
                        )}

                        {step === 'amount' && (
                            <div>
                                <div style={{ background: C.brLight, borderRadius: '10px', padding: '10px 14px', marginBottom: '16px' }}>
                                    <span style={{ color: C.muted, fontSize: '0.8rem' }}>Sending to: </span>
                                    <strong style={{ color: C.brDark }}>{recipient}</strong>
                                </div>
                                <label style={{ color: C.muted, fontSize: '0.78rem', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.bg, border: `2px solid ${C.brMid}`, borderRadius: '12px', padding: '12px 16px', marginBottom: '14px' }}>
                                    <span style={{ color: C.brinjal, fontWeight: 900, fontSize: '2rem' }}>₹</span>
                                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                                        style={{ background: 'none', border: 'none', outline: 'none', color: C.brDark, fontSize: '2rem', fontWeight: 800, width: '100%' }} autoFocus />
                                </div>
                                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)" style={inp} />
                            </div>
                        )}

                        {step === 'confirm' && (
                            <div style={{ background: C.brLight, borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                                <p style={{ color: C.muted, fontSize: '0.85rem', margin: '0 0 8px' }}>Sending</p>
                                <p style={{ color: C.brDark, fontWeight: 900, fontSize: '2.8rem', margin: '0 0 8px' }}>₹{amount}</p>
                                <p style={{ color: C.muted, fontSize: '0.875rem', margin: '0 0 6px' }}>to <strong style={{ color: C.text }}>{recipient}</strong></p>
                                {note && <p style={{ color: C.muted, fontSize: '0.8rem', margin: '8px 0 0', fontStyle: 'italic' }}>&quot;{note}&quot;</p>}
                            </div>
                        )}

                        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', margin: '14px 0 0', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            {step !== 'recipient' && (
                                <button onClick={() => { setStep(step === 'confirm' ? 'amount' : 'recipient'); setError('') }}
                                    style={{ flex: 1, padding: '13px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: '12px', color: C.muted, fontWeight: 700, cursor: 'pointer' }}>
                                    ← Back
                                </button>
                            )}
                            <button onClick={() => {
                                setError('')
                                if (step === 'recipient') { if (!recipient.trim()) { setError('Enter phone or AgriPay ID'); return } setStep('amount') }
                                else if (step === 'amount') { if (!amount || parseFloat(amount) < 1) { setError('Enter valid amount (min ₹1)'); return } setStep('confirm') }
                                else handleSend()
                            }} disabled={loading}
                                style={{ flex: 2, padding: '13px', background: C.brinjal, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
                                {loading ? 'Sending…' : step === 'confirm' ? '✅ Confirm & Send' : step === 'amount' ? 'Review →' : 'Next →'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
            <style>{`input:focus { border-color: ${C.brinjal} !important; }`}</style>
        </div>
    )
}
