'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { ADMIN, SHARED, getStatusStyle } from '@/lib/styles'

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
    authFetch(`/api/admin/transactions?${params}`)
      .then(r => r.json())
      .then(d => { setTxns(d.transactions || []); setTotal(d.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, typeFilter])

  const cell: React.CSSProperties = { padding: '12px 14px', fontSize: 13, borderBottom: `1px solid ${ADMIN.border}`, fontFamily: SHARED.font }

  const btnBase: React.CSSProperties = {
    padding: '6px 14px',
    borderRadius: 6,
    border: `1px solid ${ADMIN.border}`,
    background: ADMIN.card,
    color: ADMIN.text,
    cursor: 'pointer',
    fontFamily: SHARED.font,
    transition: 'background 0.15s, opacity 0.15s',
  }

  return (
    <div style={{ fontFamily: SHARED.font }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, letterSpacing: '0.02em' }}>Transactions</h1>
      <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}
        style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 8, border: `1px solid ${ADMIN.border}`, background: ADMIN.card, color: ADMIN.text, fontSize: 13, outline: 'none', fontFamily: SHARED.font }}>
        <option value="">All types</option>
        <option value="send">Send</option>
        <option value="receive">Receive</option>
        <option value="topup">Topup</option>
        <option value="bill_pay">Bill Pay</option>
        <option value="paylater_borrow">PayLater Borrow</option>
        <option value="paylater_repay">PayLater Repay</option>
      </select>
      <div style={{ background: ADMIN.card, border: `1px solid ${ADMIN.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 24, color: ADMIN.muted }}>Loading...</div> : txns.length === 0 ? <div style={{ padding: 24, color: ADMIN.muted }}>No transactions</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: ADMIN.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={cell}>Type</th>
                <th style={cell}>Amount</th>
                <th style={cell}>From</th>
                <th style={cell}>To</th>
                <th style={cell}>Status</th>
                <th style={cell}>Date</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t: any, i: number) => {
                const status = getStatusStyle(t.status)
                return (
                  <tr key={t._id} style={{ background: i % 2 === 0 ? ADMIN.card : ADMIN.bgSub, transition: 'background 0.15s' }}>
                    <td style={{ ...cell, color: ADMIN.primary, fontWeight: 600 }}>{t.type}</td>
                    <td style={{ ...cell, fontWeight: 600 }}>₹{t.amount?.toLocaleString('en-IN')}</td>
                    <td style={cell}>{t.fromUserId?.email || t.fromUserId?.phone || '—'}</td>
                    <td style={cell}>{t.toUserId?.email || t.toUserId?.phone || '—'}</td>
                    <td style={cell}>
                      <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: '100px', fontSize: 12, fontWeight: 600, background: status.bg, color: status.color, fontFamily: SHARED.font }}>
                        {status.label}
                      </span>
                    </td>
                    <td style={cell}>{new Date(t.createdAt).toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
          style={{ ...btnBase, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>Prev</button>
        <span style={{ padding: '6px 14px', color: ADMIN.muted, fontSize: 13 }}>Page {page} of {Math.ceil(total / 30)}</span>
        <button disabled={page >= Math.ceil(total / 30)} onClick={() => setPage(p => p + 1)}
          style={{ ...btnBase, cursor: page >= Math.ceil(total / 30) ? 'not-allowed' : 'pointer', opacity: page >= Math.ceil(total / 30) ? 0.5 : 1 }}>Next</button>
      </div>
    </div>
  )
}