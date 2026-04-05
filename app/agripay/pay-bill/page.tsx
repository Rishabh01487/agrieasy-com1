'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const C = {
    bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
    brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280',
    border: '#ddd6fe', green: '#059669', gold: '#d97706',
}

const BILL_TYPES = [
    { key: 'fuel', icon: '⛽', label: 'Fuel', desc: 'Diesel, Petrol' },
    { key: 'salary', icon: '👤', label: 'Driver Salary', desc: 'Pay your driver' },
    { key: 'recharge', icon: '📱', label: 'Mobile Recharge', desc: 'Prepaid recharge' },
    { key: 'food', icon: '🍱', label: 'Food & Meals', desc: 'Canteen, hotel' },
    { key: 'booking', icon: '🚛', label: 'Vehicle Booking', desc: 'Transport charges' },
    { key: 'other', icon: '📄', label: 'Other Bill', desc: 'Misc expenses' },
]

function PayBillContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const typeParam = searchParams.get('type') || ''
    const [selectedType, setSelectedType] = useState(typeParam)
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handlePay = async () => {
        const amt = parseFloat(amount)
        if (!selectedType) { setError('Select a bill category'); return }
        if (!amt || amt < 1) { setError('Enter a valid amount (min ₹1)'); return }
        setLoading(true); setError('')
        const userId = localStorage.getItem('userId')
        if (!userId) { setError('Not logged in'); setLoading(false); return }
        try {
            const res = await fetch('/api/agripay/pay-bill', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: amt, billType: selectedType, description: description || undefined }),
            })
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Payment failed'); setLoading(false); return }
            setSuccess(true)
            setTimeout(() => router.push('/agripay'), 2500)
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    const inp: React.CSSProperties = { width: '100%', padding: '12px 14px', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: '10px', color: C.text, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box' }
    const selectedBill = BILL_TYPES.find(b => b.key === selectedType)

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: C.brinjal, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← AgriPay</Link>
                    <span style={{ color: C.muted }}>›</span>
                    <span style={{ color: C.text, fontWeight: 600, fontSize: '0.875rem' }}>Pay Bill</span>
                </div>
            </nav>

            <div style={{ maxWidth: '600px', margin: '36px auto', padding: '0 24px' }}>
                {success ? (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>{selectedBill?.icon || '✅'}</div>
                        <h2 style={{ color: C.green, fontWeight: 800, margin: '0 0 8px' }}>Payment Successful!</h2>
                        <p style={{ color: C.brDark, fontWeight: 700, fontSize: '1.5rem', margin: '0 0 6px' }}>₹{amount}</p>
                        <p style={{ color: C.muted }}>{selectedBill?.label} paid</p>
                    </div>
                ) : (
                    <>
                        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', margin: '0 0 6px', color: C.brDark }}>⚡ Pay a Bill</h2>
                            <p style={{ color: C.muted, margin: '0 0 20px', fontSize: '0.875rem' }}>Select a category and enter the amount</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                                {BILL_TYPES.map(b => (
                                    <button key={b.key} onClick={() => setSelectedType(b.key)}
                                        style={{ padding: '14px 8px', background: selectedType === b.key ? C.brLight : C.bg, border: `2px solid ${selectedType === b.key ? C.brinjal : C.border}`, borderRadius: '14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                                        <span style={{ fontSize: '1.6rem' }}>{b.icon}</span>
                                        <span style={{ color: selectedType === b.key ? C.brinjal : C.muted, fontSize: '0.72rem', fontWeight: 700, textAlign: 'center' }}>{b.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedType && (
                            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '24px', marginBottom: '20px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Amount to Pay</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: C.bg, border: `2px solid ${C.brMid}`, borderRadius: '12px', padding: '10px 16px' }}>
                                        <span style={{ color: C.brinjal, fontWeight: 900, fontSize: '1.8rem' }}>₹</span>
                                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                                            style={{ background: 'none', border: 'none', outline: 'none', color: C.brDark, fontSize: '1.8rem', fontWeight: 800, width: '100%' }} autoFocus />
                                    </div>
                                </div>
                                <div>
                                    <label style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Description (optional)</label>
                                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={`e.g., ${selectedBill?.desc}`} style={inp} />
                                </div>
                            </div>
                        )}

                        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <button onClick={handlePay} disabled={loading || !selectedType || !amount}
                            style={{ width: '100%', padding: '15px', background: selectedType && amount ? C.brinjal : C.brMid, border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 800, fontSize: '1.05rem', cursor: selectedType && amount ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Processing…' : `Pay ₹${amount || '0'}`}
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default function PayBill() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#faf7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6d28d9', fontWeight: 700 }}>Loading…</div>}>
            <PayBillContent />
        </Suspense>
    )
}
