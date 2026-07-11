'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { AGRI, SHARED, navStyle, labelStyle } from '@/lib/styles'

const PRESETS = [100, 200, 500, 1000, 2000, 5000]

export default function AddMoney() {
    const router = useRouter()
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    useEffect(() => {
        if (document.getElementById('razorpay-checkout-script')) return
        const script = document.createElement('script')
        script.id = 'razorpay-checkout-script'
        script.src = 'https://checkout.razorpay.com/v1/checkout.js'
        script.async = true
        document.head.appendChild(script)
    }, [])

    const handleAdd = async () => {
        const amt = parseFloat(amount)
        if (!amt || amt < 1) { setError('Enter a valid amount (min ₹1)'); return }

        if (typeof window === 'undefined' || !(window as any).Razorpay) {
            setError('Payment gateway is loading. Please wait a moment and try again.')
            return
        }

        setLoading(true)
        setError('')

        try {
            const orderRes = await authFetch('/api/agripay/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: amt }),
            })

            if (!orderRes.ok) {
                const data = await orderRes.json()
                setError(data.error || 'Failed to create payment order. Please try again.')
                setLoading(false)
                return
            }

            const { orderId, razorpayKey, currency } = await orderRes.json()

            const options = {
                key: razorpayKey,
                amount: Math.round(amt * 100), // Razorpay expects paise
                currency: currency || 'INR',
                name: 'AgriEasy',
                description: 'AgriPay Wallet Top-up',
                order_id: orderId,
                handler: async function (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) {
                    try {
                        const verifyRes = await authFetch('/api/agripay/topup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                amount: amt,
                                razorpayOrderId: response.razorpay_order_id,
                                razorpayPaymentId: response.razorpay_payment_id,
                                razorpaySignature: response.razorpay_signature,
                            }),
                        })

                        if (!verifyRes.ok) {
                            const data = await verifyRes.json()
                            setError(data.error || 'Payment verification failed. Contact support if amount was debited.')
                            setLoading(false)
                            return
                        }

                        const result = await verifyRes.json()
                        setSuccess(true)
                    } catch {
                        setError('Network error during verification. Contact support if amount was debited.')
                        setLoading(false)
                    }
                },
                prefill: {
                    name: '', // Could populate from user profile
                    contact: '', // Could populate from user phone
                },
                theme: {
                    color: '#6d28d9',
                },
                modal: {
                    ondismiss: function () {
                        setLoading(false)
                        setError('Payment cancelled.')
                    },
                },
            }

            const rzp = new (window as any).Razorpay(options)
            rzp.on('payment.failed', function (_response: any) {
                setError('Payment failed. Please try again or use a different method.')
                setLoading(false)
            })
            rzp.open()
        } catch {
            setError('Something went wrong. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, fontFamily: SHARED.font, color: AGRI.text }}>
            <nav style={{ ...navStyle(AGRI), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: AGRI.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s ease' }}>← AgriPay</Link>
                    <span style={{ color: AGRI.muted }}>›</span>
                    <span style={{ color: AGRI.text, fontWeight: 600, fontSize: '0.875rem' }}>Add Money</span>
                </div>
            </nav>

            <div style={{ maxWidth: '540px', margin: '40px auto', padding: '0 24px' }}>
                {success ? (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '48px', textAlign: 'center', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', border: `2px solid ${AGRI.green}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✅</div>
                        <h2 style={{ color: AGRI.green, fontWeight: 800, margin: '0 0 8px' }}>Money Added!</h2>
                        <p style={{ color: AGRI.textSecondary, fontWeight: 700, fontSize: '1.5rem', margin: '0 0 6px' }}>₹{amount}</p>
                        <p style={{ color: AGRI.muted, fontSize: '0.875rem' }}>Added to your AgriPay wallet</p>
                    </div>
                ) : (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '32px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', color: AGRI.textSecondary }}>➕ Add Money</h2>
                        <p style={{ color: AGRI.muted, marginBottom: '28px', fontSize: '0.9rem' }}>Top up your AgriPay wallet instantly</p>

                        {/* Amount input */}
                        <div style={{ background: AGRI.bg, border: `2px solid ${AGRI.border}`, borderRadius: '14px', padding: '16px 20px', marginBottom: '18px' }}>
                            <label style={labelStyle(AGRI)}>Enter Amount</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: AGRI.primary, fontWeight: 900, fontSize: '2rem' }}>₹</span>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                                    style={{ background: 'none', border: 'none', outline: 'none', color: AGRI.textSecondary, fontSize: '2.2rem', fontWeight: 800, width: '100%' }} autoFocus />
                            </div>
                        </div>

                        {/* Presets */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '22px' }}>
                            {PRESETS.map(p => (
                                <button key={p} onClick={() => setAmount(p.toString())}
                                    style={{ padding: '10px', background: amount === p.toString() ? AGRI.primaryLight : AGRI.bg, border: `1.5px solid ${amount === p.toString() ? AGRI.primary : AGRI.border}`, borderRadius: '10px', color: amount === p.toString() ? AGRI.primary : AGRI.muted, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s ease' }}>
                                    ₹{p}
                                </button>
                            ))}
                        </div>

                        {error && <div style={{ background: AGRI.redLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: AGRI.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <button onClick={handleAdd} disabled={loading || !amount}
                            style={{ width: '100%', padding: '15px', background: amount ? AGRI.primary : AGRI.border, border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 800, fontSize: '1.05rem', cursor: amount ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1, transition: 'all 0.2s ease' }}>
                            {loading ? 'Processing…' : `Add ₹${amount || '0'} to Wallet`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}