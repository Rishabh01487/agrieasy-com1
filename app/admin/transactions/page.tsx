'use client'

import { useState, useEffect } from 'react'

const C = {
  card: '#1a1a2e',
  accent: '#6d28d9',
  text: '#e2e8f0',
  muted: '#94a3b8',
  border: '#2d2d44',
  green: '#22c55e',
  red: '#ef4444',
  yellow: '#eab308',
}

const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: `1px solid ${C.border}` }

export default function AdminTransactions() {
  const [txns, setTxns] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '30' })
    if (typeFilter) params.set('type', typeFilter)
    fetch(`/api/admin/transactions?${params}`)
      .then(r => r.json())
      .then(d => { setTxns(d.transactions || []); setTotal(d.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, typeFilter])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Transactions</h1>
      <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
        style={{ marginBottom: 20, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, outline: 'none' }}>
        <option value="">All types</option>
        <option value="send">Send</option>
        <option value="receive">Receive</option>
        <option value="topup">Topup</option>
        <option value="bill_pay">Bill Pay</option>
        <option value="paylater_borrow">PayLater Borrow</option>
        <option value="paylater_repay">PayLater Repay</option>
      </select>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 24, color: C.muted }}>Loading...</div> : txns.length === 0 ? <div style={{ padding: 24, color: C.muted }}>No transactions</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                <th style={cell}>Type</th>
                <th style={cell}>Amount</th>
                <th style={cell}>From</th>
                <th style={cell}>To</th>
                <th style={cell}>Status</th>
                <th style={cell}>Date</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t: any) => (
                <tr key={t._id}>
                  <td style={{ ...cell, color: C.accent, fontWeight: 600 }}>{t.type}</td>
                  <td style={{ ...cell, fontWeight: 600 }}>₹{t.amount?.toLocaleString('en-IN')}</td>
                  <td style={cell}>{t.fromUserId?.email || t.fromUserId?.phone || '—'}</td>
                  <td style={cell}>{t.toUserId?.email || t.toUserId?.phone || '—'}</td>
                  <td style={{ ...cell, color: t.status === 'success' ? C.green : t.status === 'failed' ? C.red : C.yellow }}>{t.status}</td>
                  <td style={cell}>{new Date(t.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
          style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>Prev</button>
        <span style={{ padding: '6px 14px', color: C.muted, fontSize: 13 }}>Page {page} of {Math.ceil(total / 30)}</span>
        <button disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}
          style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: page >= Math.ceil(total / 30) ? 'not-allowed' : 'pointer', opacity: page >= Math.ceil(total / 30) ? 0.5 : 1 }}>Next</button>
      </div>
    </div>
  )
}
