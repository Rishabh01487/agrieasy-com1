'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { AGRI, SHARED, navStyle } from '@/lib/styles'

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
    paylaterEligible?: boolean
    paylaterLimit?: number
    paylaterUsed?: number
}

const typeColor: Record<string, string> = {
    send: AGRI.red, receive: AGRI.green, topup: AGRI.green, bill_pay: AGRI.gold, refund: AGRI.green,
    paylater_borrow: '#059669', paylater_repay: '#065f46', neft: AGRI.primary, rtgs: '#7c3aed', upi_pay: '#6366f1',
}
const catIcon: Record<string, string> = {
    fuel: '⛽', salary: '👤', transfer: '💸', recharge: '📱', food: '🍱', booking: '🚛', other: '📄',
    paylater: '💰', neft: '🏦', rtgs: '🏛️', upi: '📱',
}
const typeLabel: Record<string, string> = {
    send: '↑ Sent', receive: '↓ Received', topup: '+ Added', bill_pay: '⚡ Paid', refund: '↩ Refund',
    paylater_borrow: '💰 Borrowed', paylater_repay: '💳 Repaid', neft: '🏦 NEFT', rtgs: '🏛️ RTGS', upi_pay: '📱 UPI',
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
                    authFetch('/api/agripay/wallet').then(r => r.json()),
                    authFetch('/api/agripay/history?limit=6').then(r => r.json()),
                ])
                setWallet(w.wallet)
                setTxns(h.transactions || [])
            } catch (e) { console.error(e) } finally { setLoading(false) }
        }
        void load()
    }, [])

    if (!userId && !loading) return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', fontFamily: SHARED.font }}>
            <div style={{ fontSize: '2.5rem' }}>₹</div>
            <h2 style={{ color: AGRI.textSecondary, fontWeight: 800, margin: 0 }}>Please log in to use AgriPay</h2>
            <Link href="/auth/login" style={{ background: AGRI.primary, color: '#fff', padding: '12px 28px', borderRadius: '12px', textDecoration: 'none', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>Login</Link>
        </div>
    )

    return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, fontFamily: SHARED.font, color: AGRI.text }}>
            {/* Nav */}
            <nav style={{ ...navStyle(AGRI), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: SHARED.shadowMd }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: AGRI.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>₹</div>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: AGRI.textSecondary }}>AgriPay</span>
                        <span style={{ background: AGRI.primaryLight, color: AGRI.primary, border: `1px solid ${AGRI.border}`, borderRadius: '100px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>by AgriEasy</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {!wallet?.bankVerified && (
                            <Link href="/agripay/verify-bank" style={{ color: AGRI.red, background: AGRI.redLight, border: '1px solid #fca5a5', padding: '6px 12px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700, transition: 'all 0.2s ease', cursor: 'pointer' }}>⚠️ Link Bank</Link>
                        )}
                        <Link href="/" style={{ color: AGRI.muted, padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', textDecoration: 'none', background: AGRI.primaryLight, fontWeight: 600, transition: 'all 0.2s ease', cursor: 'pointer' }}>← Home</Link>
                    </div>
                </div>
            </nav>

            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '28px 24px' }}>
                {/* Balance Card */}
                <div style={{ background: AGRI.gradientCard, borderRadius: '20px', padding: '28px', marginBottom: '24px', boxShadow: '0 4px 24px rgba(109,40,217,0.28)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px', borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                    <div style={{ position: 'absolute', bottom: '-20px', left: '40%', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
                    <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Total Balance</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                        <h2 style={{ color: '#fff', fontSize: '2.6rem', fontWeight: 900, margin: 0, letterSpacing: '-0.02em' }}>
                            {loading ? '•••' : balanceVisible ? `₹${(wallet?.balance ?? 0).toLocaleString('en-IN')}` : '₹ ••••••'}
                        </h2>
                        <button onClick={() => setBalanceVisible(v => !v)} style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer', color: '#fff', fontSize: '0.78rem', fontWeight: 600, transition: 'all 0.2s ease' }}>
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

                {/* PayLater Credit Card */}
                {wallet?.paylaterEligible && (
                    <Link href="/agripay/paylater" style={{ textDecoration: 'none', display: 'block', marginBottom: '20px' }}>
                        <div style={{ background: 'linear-gradient(135deg, #065f46 0%, #059669 100%)', borderRadius: '16px', padding: '16px 20px', boxShadow: '0 2px 12px rgba(5,150,105,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s ease' }}>
                            <div>
                                <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 4px' }}>PayLater Credit</p>
                                <p style={{ color: '#fff', fontWeight: 900, fontSize: '1.3rem', margin: 0 }}>₹{((wallet?.paylaterLimit || 0) - (wallet?.paylaterUsed || 0)).toLocaleString('en-IN')}</p>
                                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', margin: '2px 0 0' }}>Available • 0.099%/day interest</p>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: '10px', padding: '10px 14px', textAlign: 'center' }}>
                                <span style={{ color: '#fff', fontSize: '1.4rem', fontWeight: 900 }}>💰</span>
                                <p style={{ color: '#fff', fontSize: '0.7rem', fontWeight: 700, margin: '2px 0 0' }}>Borrow</p>
                            </div>
                        </div>
                    </Link>
                )}

                {/* Quick Actions */}
                <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radius, padding: '20px', marginBottom: '20px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                    <h3 style={{ color: AGRI.textSecondary, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>Quick Actions</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px' }}>
                        {[
                            { href: '/agripay/add-money', icon: '+', label: 'Add\nMoney', color: AGRI.green },
                            { href: '/agripay/send', icon: '↗', label: 'Send\nMoney', color: AGRI.primary },
                            { href: '/agripay/scan', icon: '📷', label: 'Scan\n& Pay', color: '#6366f1' },
                            { href: '/agripay/pay-bill', icon: '⚡', label: 'Pay\nBill', color: AGRI.gold },
                            { href: '/agripay/paylater', icon: '💰', label: 'Pay\nLater', color: '#059669' },
                            { href: '/agripay/history', icon: '📋', label: 'History', color: '#0891b2' },
                        ].map(a => (
                            <Link key={a.label} href={a.href} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', textDecoration: 'none', transition: 'all 0.2s ease' }}>
                                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: `${a.color}15`, border: `1.5px solid ${a.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', color: a.color, fontWeight: 900, transition: 'all 0.2s ease' }}>{a.icon}</div>
                                <span style={{ color: AGRI.muted, fontSize: '0.65rem', fontWeight: 700, textAlign: 'center', whiteSpace: 'pre-line', lineHeight: 1.2 }}>{a.label}</span>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Pay Bills Grid */}
                <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radius, padding: '20px', marginBottom: '20px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                    <h3 style={{ color: AGRI.textSecondary, fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 16px' }}>Pay Bills & Services</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                        {[
                            { icon: '⛽', label: 'Fuel', bill: 'fuel' },
                            { icon: '👤', label: 'Driver Salary', bill: 'salary' },
                            { icon: '📱', label: 'Recharge', bill: 'recharge' },
                            { icon: '🍱', label: 'Food', bill: 'food' },
                            { icon: '🚛', label: 'Booking', bill: 'booking' },
                            { icon: '📄', label: 'Other', bill: 'other' },
                        ].map(s => (
                            <Link key={s.label} href={`/agripay/pay-bill?type=${s.bill}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', background: AGRI.bg, borderRadius: '12px', padding: '14px 6px', border: `1px solid ${AGRI.border}`, textDecoration: 'none', transition: 'all 0.2s ease' }}>
                                <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                                <span style={{ color: AGRI.muted, fontSize: '0.72rem', fontWeight: 600, textAlign: 'center' }}>{s.label}</span>
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
                        <Link href="/agripay/verify-bank" style={{ background: AGRI.gold, color: '#fff', padding: '8px 16px', borderRadius: '10px', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem', whiteSpace: 'nowrap', cursor: 'pointer', transition: 'all 0.2s ease' }}>Link Now →</Link>
                    </div>
                )}

                {/* Recent Transactions */}
                <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radius, padding: '20px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                        <h3 style={{ color: AGRI.textSecondary, fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>Recent Transactions</h3>
                        <Link href="/agripay/history" style={{ color: AGRI.primary, fontSize: '0.8rem', textDecoration: 'none', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s ease' }}>See All →</Link>
                    </div>

                    {loading ? (
                        <p style={{ color: AGRI.muted, textAlign: 'center', padding: '20px', fontSize: '0.9rem' }}>Loading…</p>
                    ) : txns.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '28px' }}>
                            <div style={{ fontSize: '2.5rem', marginBottom: '10px' }}>💳</div>
                            <p style={{ color: AGRI.muted, fontSize: '0.9rem', marginBottom: '12px' }}>No transactions yet</p>
                            <Link href="/agripay/add-money" style={{ color: AGRI.primary, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', cursor: 'pointer', transition: 'all 0.2s ease' }}>Add money to start →</Link>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            {txns.map(t => (
                                <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 6px', borderRadius: '10px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: `${typeColor[t.type] || AGRI.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
                                        {catIcon[t.category] || '💳'}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ color: AGRI.text, fontSize: '0.875rem', fontWeight: 600, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                                        <p style={{ color: AGRI.muted, fontSize: '0.72rem', margin: '2px 0 0' }}>
                                            {typeLabel[t.type] || t.type} • {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <span style={{ color: typeColor[t.type] || AGRI.text, fontWeight: 800, fontSize: '0.95rem', flexShrink: 0 }}>
                                        {(t.type === 'send' || t.type === 'bill_pay' || t.type === 'paylater_repay') ? '-' : '+'}₹{t.amount.toLocaleString('en-IN')}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', padding: '24px 24px 40px', borderTop: `1px solid ${AGRI.border}`, marginTop: '8px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: AGRI.gradient, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '0.8rem' }}>₹</div>
                    <span style={{ color: AGRI.textSecondary, fontWeight: 800, fontSize: '0.85rem' }}>AgriPay</span>
                </div>
                <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '0 auto', maxWidth: '300px', lineHeight: 1.5, fontStyle: 'italic' }}>
                    India&apos;s indigenous payments system for trading Agricultural commodities and more
                </p>
                <p style={{ color: AGRI.border, fontSize: '0.7rem', margin: '8px 0 0', fontWeight: 600 }}>🔒 Secured by AgriEasy • Made in India 🇮🇳</p>
            </div>
        </div>
    )
}