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
    fromUserId?: { phone: string; farmerName?: string; firmName?: string; role?: string }
    toUserId?: { phone: string; farmerName?: string; firmName?: string; role?: string }
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
    send: 'Sent', receive: 'Received', topup: 'Added', bill_pay: 'Bill Paid', refund: 'Refunded',
}

const FILTERS = [['all', 'All'], ['topup', 'Added'], ['send', 'Sent'], ['receive', 'Received'], ['bill_pay', 'Bills']]

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
                ? `/api/agripay/history?userId=${userId}&limit=100`
                : `/api/agripay/history?userId=${userId}&limit=100&type=${filter}`
            try {
                const res = await fetch(url)
                const d = await res.json()
                const list: Transaction[] = d.transactions || []
                setTxns(list)
                // Calculate totals
                let credits = 0, debits = 0
                list.forEach(t => {
                    if (t.type === 'send' || t.type === 'bill_pay') debits += t.amount
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
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)', position: 'sticky', top: 0, zIndex: 50 }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: C.brinjal, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← AgriPay</Link>
                    <span style={{ color: C.muted }}>›</span>
                    <span style={{ color: C.text, fontWeight: 600, fontSize: '0.875rem' }}>Transaction History</span>
                </div>
            </nav>

            {/* Summary bar */}
            <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '14px 24px' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '24px', alignItems: 'center' }}>
                    <div>
                        <p style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Total Credits</p>
                        <p style={{ color: C.green, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>+₹{total.credits.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ width: '1px', height: '32px', background: C.border }} />
                    <div>
                        <p style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Total Debits</p>
                        <p style={{ color: C.red, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>-₹{total.debits.toLocaleString('en-IN')}</p>
                    </div>
                    <div style={{ width: '1px', height: '32px', background: C.border }} />
                    <div>
                        <p style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 2px' }}>Transactions</p>
                        <p style={{ color: C.brDark, fontWeight: 800, fontSize: '1.1rem', margin: 0 }}>{txns.length}</p>
                    </div>
                </div>
            </div>

            {/* Filter pills */}
            <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '10px 24px' }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', gap: '8px' }}>
                    {FILTERS.map(([k, l]) => (
                        <button key={k} onClick={() => setFilter(k)}
                            style={{ padding: '6px 16px', borderRadius: '100px', border: `1.5px solid ${filter === k ? C.brinjal : C.border}`, cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem', background: filter === k ? C.brLight : C.white, color: filter === k ? C.brinjal : C.muted }}>
                            {l}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ maxWidth: '700px', margin: '24px auto', padding: '0 24px 40px' }}>
                {loading ? (
                    <p style={{ color: C.muted, textAlign: 'center', padding: '48px', fontSize: '0.9rem' }}>Loading transactions…</p>
                ) : txns.length === 0 ? (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '48px', textAlign: 'center' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
                        <p style={{ color: C.muted, fontSize: '0.9rem' }}>No transactions found</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([day, items]) => (
                        <div key={day} style={{ marginBottom: '24px' }}>
                            <p style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px', paddingLeft: '4px' }}>{day}</p>
                            <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 6px rgba(109,40,217,0.04)' }}>
                                {items.map((t, i) => (
                                    <div key={t._id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', borderBottom: i < items.length - 1 ? `1px solid ${C.bg}` : 'none' }}>
                                        <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: `${typeColor[t.type] || C.brinjal}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>
                                            {catIcon[t.category] || '💳'}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ color: C.text, fontWeight: 700, fontSize: '0.9rem', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description}</p>
                                            <p style={{ color: C.muted, fontSize: '0.72rem', margin: '3px 0 0' }}>
                                                {typeLabel[t.type] || t.type} • {new Date(t.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                {t.status === 'failed' && <span style={{ color: C.red, marginLeft: '6px' }}>• Failed</span>}
                                            </p>
                                        </div>
                                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                            <span style={{ color: typeColor[t.type] || C.text, fontWeight: 800, fontSize: '1rem', display: 'block' }}>
                                                {(t.type === 'send' || t.type === 'bill_pay') ? '-' : '+'}₹{t.amount.toLocaleString('en-IN')}
                                            </span>
                                            <span style={{ color: C.muted, fontSize: '0.7rem', display: 'block' }}>{t.type.replace('_', ' ')}</span>
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
