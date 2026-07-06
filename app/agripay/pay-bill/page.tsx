'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { AGRI, SHARED, navStyle, inputStyle, labelStyle } from '@/lib/styles'

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
        try {
            const res = await authFetch('/api/agripay/pay-bill', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt, billType: selectedType, description: description || undefined }),
            })
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Payment failed'); setLoading(false); return }
            setSuccess(true)
            setTimeout(() => router.push('/agripay'), 2500)
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    const selectedBill = BILL_TYPES.find(b => b.key === selectedType)

    return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, fontFamily: SHARED.font, color: AGRI.text }}>
            <nav style={{ ...navStyle(AGRI), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: AGRI.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s ease' }}>← AgriPay</Link>
                    <span style={{ color: AGRI.muted }}>›</span>
                    <span style={{ color: AGRI.text, fontWeight: 600, fontSize: '0.875rem' }}>Pay Bill</span>
                </div>
            </nav>

            <div style={{ maxWidth: '600px', margin: '36px auto', padding: '0 24px' }}>
                {success ? (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '48px', textAlign: 'center', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: '16px' }}>{selectedBill?.icon || '✅'}</div>
                        <h2 style={{ color: AGRI.green, fontWeight: 800, margin: '0 0 8px' }}>Payment Successful!</h2>
                        <p style={{ color: AGRI.textSecondary, fontWeight: 700, fontSize: '1.5rem', margin: '0 0 6px' }}>₹{amount}</p>
                        <p style={{ color: AGRI.muted }}>{selectedBill?.label} paid</p>
                    </div>
                ) : (
                    <>
                        <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '24px', marginBottom: '20px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                            <h2 style={{ fontWeight: 800, fontSize: '1.4rem', margin: '0 0 6px', color: AGRI.textSecondary }}>⚡ Pay a Bill</h2>
                            <p style={{ color: AGRI.muted, margin: '0 0 20px', fontSize: '0.875rem' }}>Select a category and enter the amount</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                                {BILL_TYPES.map(b => (
                                    <button key={b.key} onClick={() => setSelectedType(b.key)}
                                        style={{ padding: '14px 8px', background: selectedType === b.key ? AGRI.primaryLight : AGRI.bg, border: `2px solid ${selectedType === b.key ? AGRI.primary : AGRI.border}`, borderRadius: '14px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', transition: 'all 0.2s ease' }}>
                                        <span style={{ fontSize: '1.6rem' }}>{b.icon}</span>
                                        <span style={{ color: selectedType === b.key ? AGRI.primary : AGRI.muted, fontSize: '0.72rem', fontWeight: 700, textAlign: 'center' }}>{b.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {selectedType && (
                            <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radius, padding: '24px', marginBottom: '20px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                                <div style={{ marginBottom: '16px' }}>
                                    <label style={labelStyle(AGRI)}>Amount to Pay</label>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: AGRI.bg, border: `2px solid ${AGRI.border}`, borderRadius: '12px', padding: '10px 16px' }}>
                                        <span style={{ color: AGRI.primary, fontWeight: 900, fontSize: '1.8rem' }}>₹</span>
                                        <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                                            style={{ background: 'none', border: 'none', outline: 'none', color: AGRI.textSecondary, fontSize: '1.8rem', fontWeight: 800, width: '100%' }} autoFocus />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle(AGRI)}>Description (optional)</label>
                                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder={`e.g., ${selectedBill?.desc}`} style={inputStyle(AGRI)} />
                                </div>
                            </div>
                        )}

                        {error && <div style={{ background: AGRI.redLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: AGRI.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <button onClick={handlePay} disabled={loading || !selectedType || !amount}
                            style={{ width: '100%', padding: '15px', background: selectedType && amount ? AGRI.primary : AGRI.border, border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 800, fontSize: '1.05rem', cursor: selectedType && amount ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease' }}>
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
        <Suspense fallback={<div style={{ minHeight: '100vh', background: AGRI.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: AGRI.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>}>
            <PayBillContent />
        </Suspense>
    )
}