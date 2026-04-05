'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface Transaction {
    _id: string
    type: string
    amount: number
    description: string
    category: string
    status: string
    createdAt: string
}

interface Wallet {
    balance: number
    agripayId: string
    isKYC: boolean
    bankVerified: boolean
    bankName?: string
}

const C = {
    bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
    brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280',
    border: '#ddd6fe', green: '#059669', red: '#dc2626', gold: '#d97706',
}

const typeColor: Record<string, string> = {
    send: C.red, receive: C.green, topup: C.green, bill_pay: C.gold, refund: C.green,
}
const catIcon: Record<string, string> = {
    fuel: '⛽', salary: '👤', transfer: '💸', recharge: '📱', food: '🍱', booking: '🚛', other: '📄',
}
const typeLabel: Record<string, string> = {
    send: '↑ Sent', receive: '↓ Received', topup: '+ Added', bill_pay: '⚡ Paid', refund: '↩ Refund',
}

export default function AgriPayDashboard() {
    const [wallet, setWallet] = useState<Wallet | null>(null)
    const [txns, setTxns] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState('')
    const [balanceVisible, setBalanceVisible] = useState(true)

    useEffect(() => {
        const load = async () => {
            const uid = localStorage.getItem('userId') || ''
            setUserId(uid)
            if (!uid) { setLoading(false); return }
            try {
                const [w, h] = await Promise.all([
                    fetch(`/api/agripay/wallet?userId=${uid}`).then(r => r.json()),
                    fetch(`/api/agripay/history?userId=${uid}&limit=6`).then(r => r.json()),
                ])
                setWallet(w.wallet)
                setTxns(h.transactions || [])
            } catch (e) { console.error(e) } finally { setLoading(false) }
        }
        void load()
    }, [])

    if (!userId && !loading) return (
        <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: '"Inter","Segoe UI",sans-serif' }}>
            <div style={{ fontSize: '2.5rem' }}>₹</div>
            <h2 style={{ color: C.brDark, fontWeight: 800, margin: 0 }}>Please log in to use AgriPay</h2>
            <Link href="/auth/login" style={{ background: C.brinjal, color: '#fff', padding: '12px 28px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700 }}>Login</Link>
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
            {/* Nav */}
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: `linear-gradient(135deg, ${C.brDark}, ${C.brinjal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>₹</div>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: C.brDark }}>AgriPay</span>
                        <span style={{ background: C.brLight, color: C.brinjal, border: `1px solid ${C.brMid}`, borderRadius: '100px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>by AgriEasy</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {!wallet?.bankVerified && (
                            <Link href="/agripay/verify-bank" style={{ color: C.red, background: '#fef2f2', border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700 }}>⚠️ Link Bank</Link>
                        )}
                        <Link href="/" style={{ color: C.muted, padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', textDecoration: 'none', background: C.brLight, fontWeight: 600 }}>← Home</Link>
                    </div>
                </div>
            </nav>

            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '28px 24px' }}>
                {/* Balance Card */}
                <div style={{ background: `linear-gradient(135deg, ${C.brDark} 0%, ${C.brinjal} 100%)`, borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 4px 24px rgba(109,40,217,0.28)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ position: 'absolute', bottom: '-20px', left: '40%', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Total Balance</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        <h2 style={{ color: '#fff', fontSize: '2.6rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                            {loading ? '•••' : balanceVisible ? `₹${(wallet?.balance ?? 0).toLocaleString('en-IN')}` : '₹ ••••••'}
                        </h2>
                        <button onClick={() => setBalanceVisible(v => !v)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: '0.78rem', fontWeight: 600 }}>
                            {balanceVisible ? '👁 Hide' : '👁 Show'}
                        </button>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', position: 'relative' }}>
                        <div>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', margin: '0 0 3px' }}>AgriPay ID</p>
                            <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem', fontWeight: 700, margin: 0 }}>{wallet?.agripayId || '—'}</p>
                        </div>
                        {wallet?.bankVerified && (
                            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '8px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                <span style={{ color: '#6ee7b7', fontSize: '0.75rem', fontWeight: 700 }}>✅ Bank Linked</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                    <h3 style={{ color: C.brDark, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>Quick Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
                        {[
                            { href: '/agripay/add-money', icon: '+', label: 'Add\nMoney', color: C.green },
                            { href: '/agripay/send', icon: '↗', label: 'Send\nMoney', color: C.brinjal },
                            { href: '/agripay/scan', icon: '📷', label: 'Scan\n& Pay', color: '#6366f1' },
                            { href: '/agripay/pay-bill', icon: '⚡', label: 'Pay\nBill', color: C.gold },
                            { href: '/agripay/history', icon: '📋', label: 'History', color: '#0891b2' },
                        ].map(a => (
                            <Link key={a.label} href={a.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${a.color}15`, border: `1.5px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: a.color, fontWeight: 900 }}>{a.icon}</div>
                                <span style={{ color: C.muted, fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{a.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Pay Bills Grid */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', marginBottom: '20px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                    <h3 style={{ color: C.brDark, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>Pay Bills & Services</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                        {[
                            { icon: '⛽', label: 'Fuel', bill: 'fuel' },
                            { icon: '👤', label: 'Driver Salary', bill: 'salary' },
                            { icon: '📱', label: 'Recharge', bill: 'recharge' },
                            { icon: '🍱', label: 'Food', bill: 'food' },
                            { icon: '🚛', label: 'Booking', bill: 'booking' },
                            { icon: '📄', label: 'Other', bill: 'other' },
                        ].map(s => (
                            <Link key={s.label} href={`/agripay/pay-bill?type=${s.bill}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: C.bg, borderRadius: '12px', padding: '14px 6px', border: `1px solid ${C.border}`, textDecoration: 'none' }}>
                                <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                                <span style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 600, textAlign: 'center' }}>{s.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Bank Verification CTA */}
                {!wallet?.bankVerified && !loading && (
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', padding: '16px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                        <div>
                            <p style={{ color: '#92400e', fontWeight: 700, fontSize: '0.9rem', margin: '0 0 3px' }}>🏦 Link your Bank Account</p>
                            <p style={{ color: '#78350f', fontSize: '0.8rem', margin: 0 }}>Add money from your bank & enable higher limits</p>
                        </div>
                        <Link href="/agripay/verify-bank" style={{ background: C.gold, color: '#fff', padding: '8px 16px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>Link Now →</Link>
                    </div>
                )}

                {/* Recent Transactions */}
                <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', boxShadow: '0 1px 8px rgba(109,40,217,0.06)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ color: C.brDark, fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>Recent Transactions</h3>
                        <Link href="/agripay/history" style={{ color: C.brinjal, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700 }}>See All →</Link>
                    </div>

                    {loading ? (
                        <p style={{ color: C.muted, textAlign: 'center', padding: '20px', fontSize: '0.9rem' }}>Loading…</p>
                    ) : txns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '28px' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💳</div>
                            <p style={{ color: C.muted, fontSize: '0.9rem', marginBottom: '12px' }}>No transactions yet</p>
                            <Link href="/agripay/add-money" style={{ color: C.brinjal, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>Add money to start →</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {txns.map(t => (
                                <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 6px', borderRadius: '10px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${typeColor[t.type] || C.brinjal}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                        {catIcon[t.category] || '💳'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ color: C.text, fontSize: '0.875rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                                        <p style={{ color: C.muted, fontSize: '0.72rem', margin: '2px 0 0' }}>
                                            {typeLabel[t.type] || t.type} • {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <span style={{ color: typeColor[t.type] || C.text, fontWeight: 800, fontSize: '0.95rem', flexShrink: 0 }}>
                                        {(t.type === 'send' || t.type === 'bill_pay') ? '-' : '+'}₹{t.amount.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', padding: '24px 24px 40px', borderTop: `1px solid ${C.border}`, marginTop: '8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: `linear-gradient(135deg, ${C.brDark}, ${C.brinjal})`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.8rem' }}>₹</div>
                    <span style={{ color: C.brDark, fontWeight: 800, fontSize: '0.85rem' }}>AgriPay</span>
                </div>
                <p style={{ color: C.muted, fontSize: '0.78rem', margin: '0 auto', maxWidth: '300px', lineHeight: 1.5, fontStyle: 'italic' }}>
                    India&apos;s indigenous payments system for trading Agricultural commodities and more
                </p>
                <p style={{ color: C.brMid, fontSize: '0.7rem', margin: '8px 0 0', fontWeight: 600 }}>🔒 Secured by AgriEasy • Made in India 🇮🇳</p>
            </div>
        </div>
    )
}
