'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { AGRI, SHARED, navStyle, breadcrumbNav } from '@/lib/styles'

interface Transaction {
    _id: string
    type: string
    amount: number
    description: string
    category: string
    status: string
    createdAt: string
    fromUserId?: { phone: string; farmerName?: string; firmName?: string; role?: string }
    toUserId?: { phone: string; farmerName?: string; firmName?: string; role?: string }
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
    send: 'Sent', receive: 'Received', topup: 'Added', bill_pay: 'Bill Paid', refund: 'Refunded',
    paylater_borrow: 'Borrowed', paylater_repay: 'Repaid', neft: 'NEFT', rtgs: 'RTGS', upi_pay: 'UPI',
}

const FILTERS = [['all', 'All'], ['topup', 'Added'], ['send', 'Sent'], ['receive', 'Received'], ['bill_pay', 'Bills'], ['paylater_borrow', 'PayLater']]

export default function TransactionHistory() {
    const [txns, setTxns] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('all')
    const [total, setTotal] = useState({ credits: 0, debits: 0 })

    useEffect(() => {
        const load = async () => {
            setLoading(true)
            const userId = localStorage.getItem('userId')
            if (!userId) { setLoading(false); return }
            const url = filter === 'all'
                ? `/api/agripay/history?limit=100`
                : `/api/agripay/history?limit=100&type=${filter}`
            try {
                const res = await authFetch(url)
                const d = await res.json()
                const list: Transaction[] = d.transactions || []
                setTxns(list)
                // Calculate totals
                let credits = 0, debits = 0
                list.forEach(t => {
                    if (t.type === 'send' || t.type === 'bill_pay' || t.type === 'paylater_repay') debits += t.amount
                    else credits += t.amount
                })
                setTotal({ credits, debits })
            } catch (e) { console.error(e) } finally { setLoading(false) }
        }
        void load()
    }, [filter])

    // Group by date
    const grouped: Record<string, Transaction[]> = {}
    txns.forEach(t => {
        const day = new Date(t.createdAt).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
        if (!grouped[day]) grouped[day] = []
        grouped[day].push(t)
    })

    return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, fontFamily: SHARED.font, color: AGRI.text }}>
            <nav style={{ ...navStyle(AGRI), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: AGRI.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s ease' }}>← AgriPay</Link>
                    <span style={{ color: AGRI.muted }}>›</span>
                    <span style={{ color: AGRI.text, fontWeight: 600, fontSize: '0.875rem' }}>Transaction History</span>
                </div>
            </nav>

            {/* Summary bar */}
            <div style={{ ...breadcrumbNav(AGRI), boxShadow: SHARED.shadow }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div>
                        <p style={{ color: AGRI.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Total Credits</p>
                        <p style={{ color: AGRI.green, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>+₹{total.credits.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ width: '1px', height: '32px', background: AGRI.border }} />
                    <div>
                        <p style={{ color: AGRI.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Total Debits</p>
                        <p style={{ color: AGRI.red, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>-₹{total.debits.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ width: '1px', height: '32px', background: AGRI.border }} />
                    <div>
                        <p style={{ color: AGRI.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Transactions</p>
                        <p style={{ color: AGRI.textSecondary, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{txns.length}</p>
                    </div>
                </div>
            </div>

            {/* Filter pills */}
            <div style={{ ...breadcrumbNav(AGRI), padding: '10px 24px' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '8px' }}>
                    {FILTERS.map(([k, l]) => (
                        <button key={k} onClick={() => setFilter(k)}
                            style={{ padding: '6px 16px', borderRadius: '100px', border: `1.5px solid ${filter === k ? AGRI.primary : AGRI.border}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: filter === k ? AGRI.primaryLight : AGRI.white, color: filter === k ? AGRI.primary : AGRI.muted, transition: 'all 0.2s ease' }}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ maxWidth: '700px', margin: '24px auto', padding: '0 24px 40px' }}>
                {loading ? (
                    <p style={{ color: AGRI.muted, textAlign: 'center', padding: '48px', fontSize: '0.9rem' }}>Loading transactions…</p>
                ) : txns.length === 0 ? (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radius, padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
                        <p style={{ color: AGRI.muted, fontSize: '0.9rem' }}>No transactions found</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([day, items]) => (
                        <div key={day} style={{ marginBottom: '24px' }}>
                            <p style={{ color: AGRI.muted, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', paddingLeft: '4px' }}>{day}</p>
                            <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radius, overflow: 'hidden', boxShadow: SHARED.shadow, transition: 'all 0.2s ease' }}>
                                {items.map((t, i) => (
                                    <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: i < items.length - 1 ? `1px solid ${AGRI.bg}` : 'none', transition: 'all 0.2s ease' }}>
                                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${typeColor[t.type] || AGRI.primary}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                                            {catIcon[t.category] || '💳'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ color: AGRI.text, fontWeight: 700, fontSize: '0.9rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                                            <p style={{ color: AGRI.muted, fontSize: '0.72rem', margin: '3px 0 0' }}>
                                                {typeLabel[t.type] || t.type} • {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                {t.status === 'failed' && <span style={{ color: AGRI.red, marginLeft: '6px' }}>• Failed</span>}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <span style={{ color: typeColor[t.type] || AGRI.text, fontWeight: 800, fontSize: '1rem', display: 'block' }}>
                                                {(t.type === 'send' || t.type === 'bill_pay' || t.type === 'paylater_repay') ? '-' : '+'}₹{t.amount.toLocaleString('en-IN')}
                                            </span>
                                            <span style={{ color: AGRI.muted, fontSize: '0.7rem', display: 'block' }}>{t.type.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}