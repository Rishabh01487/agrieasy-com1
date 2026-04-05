'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const C = {
    bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
    brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280',
    border: '#ddd6fe', green: '#059669',
}

const PRESETS = [100, 200, 500, 1000, 2000, 5000]

export default function AddMoney() {
    const router = useRouter()
    const [amount, setAmount] = useState('')
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [error, setError] = useState('')

    const handleAdd = async () => {
        const amt = parseFloat(amount)
        if (!amt || amt < 1) { setError('Enter a valid amount (min ₹1)'); return }
        setLoading(true); setError('')
        const userId = localStorage.getItem('userId')
        if (!userId) { setError('Not logged in'); setLoading(false); return }
        try {
            const res = await fetch('/api/agripay/topup', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId, amount: amt }),
            })
            const json = await res.json()
            if (!res.ok) { setError(json.error || 'Failed'); setLoading(false); return }
            setSuccess(true)
            setTimeout(() => router.push('/agripay'), 2000)
        } catch { setError('Network error') } finally { setLoading(false) }
    }

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
                <div style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: C.brinjal, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← AgriPay</Link>
                    <span style={{ color: C.muted }}>›</span>
                    <span style={{ color: C.text, fontWeight: 600, fontSize: '0.875rem' }}>Add Money</span>
                </div>
            </nav>

            <div style={{ maxWidth: '540px', margin: '40px auto', padding: '0 24px' }}>
                {success ? (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '48px', textAlign: 'center', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#dcfce7', border: `2px solid ${C.green}`, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem' }}>✅</div>
                        <h2 style={{ color: C.green, fontWeight: 800, margin: '0 0 8px' }}>Money Added!</h2>
                        <p style={{ color: C.brDark, fontWeight: 700, fontSize: '1.5rem', margin: '0 0 6px' }}>₹{amount}</p>
                        <p style={{ color: C.muted, fontSize: '0.875rem' }}>Added to your AgriPay wallet</p>
                    </div>
                ) : (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '32px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 6px', color: C.brDark }}>➕ Add Money</h2>
                        <p style={{ color: C.muted, marginBottom: '28px', fontSize: '0.9rem' }}>Top up your AgriPay wallet instantly</p>

                        {/* Amount input */}
                        <div style={{ background: C.bg, border: `2px solid ${C.brMid}`, borderRadius: '14px', padding: '16px 20px', marginBottom: '18px' }}>
                            <label style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Enter Amount</label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: C.brinjal, fontWeight: 900, fontSize: '2rem' }}>₹</span>
                                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0"
                                    style={{ background: 'none', border: 'none', outline: 'none', color: C.brDark, fontSize: '2.2rem', fontWeight: 800, width: '100%' }} autoFocus />
                            </div>
                        </div>

                        {/* Presets */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', marginBottom: '22px' }}>
                            {PRESETS.map(p => (
                                <button key={p} onClick={() => setAmount(p.toString())}
                                    style={{ padding: '10px', background: amount === p.toString() ? C.brLight : C.bg, border: `1.5px solid ${amount === p.toString() ? C.brinjal : C.border}`, borderRadius: '10px', color: amount === p.toString() ? C.brinjal : C.muted, fontWeight: 700, cursor: 'pointer', fontSize: '0.9rem' }}>
                                    ₹{p}
                                </button>
                            ))}
                        </div>

                        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '14px', color: '#dc2626', fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <button onClick={handleAdd} disabled={loading || !amount}
                            style={{ width: '100%', padding: '15px', background: amount ? C.brinjal : C.brMid, border: 'none', borderRadius: '14px', color: '#fff', fontWeight: 800, fontSize: '1.05rem', cursor: amount ? 'pointer' : 'not-allowed', opacity: loading ? 0.7 : 1 }}>
                            {loading ? 'Processing…' : `Add ₹${amount || '0'} to Wallet`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
