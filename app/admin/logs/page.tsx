'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { ADMIN, SHARED } from '@/lib/styles'

const actionColors: Record<string, string> = {
  CREATE: ADMIN.green,
  UPDATE: ADMIN.blue,
  DELETE: ADMIN.red,
  LOGIN: ADMIN.yellow,
  VIOLATION: ADMIN.red,
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [actionFilter, setActionFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '30' })
    if (actionFilter) params.set('action', actionFilter)
    authFetch(`/api/admin/audit-logs?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, actionFilter])

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
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, letterSpacing: '0.02em' }}>Audit Logs</h1>
      <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
        style={{ marginBottom: 20, padding: '10px 14px', borderRadius: 8, border: `1px solid ${ADMIN.border}`, background: ADMIN.card, color: ADMIN.text, fontSize: 13, outline: 'none', fontFamily: SHARED.font }}>
        <option value="">All actions</option>
        <option value="CREATE">CREATE</option>
        <option value="UPDATE">UPDATE</option>
        <option value="DELETE">DELETE</option>
        <option value="LOGIN">LOGIN</option>
        <option value="VIOLATION">VIOLATION</option>
      </select>
      <div style={{ background: ADMIN.card, border: `1px solid ${ADMIN.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 24, color: ADMIN.muted }}>Loading...</div> : logs.length === 0 ? <div style={{ padding: 24, color: ADMIN.muted }}>No audit logs</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: ADMIN.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={cell}>Action</th>
                <th style={cell}>User</th>
                <th style={cell}>Resource</th>
                <th style={cell}>Details</th>
                <th style={cell}>IP</th>
                <th style={cell}>Date</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l: any, i: number) => (
                <tr key={i} style={{ background: i % 2 === 0 ? ADMIN.card : ADMIN.bgSub, transition: 'background 0.15s' }}>
                  <td style={{ ...cell, fontWeight: 600, color: actionColors[l.action] || ADMIN.text }}>{l.action}</td>
                  <td style={cell}>{l.userId?.email || l.userId || '—'}</td>
                  <td style={{ ...cell, color: ADMIN.primary }}>{l.resource}{l.resourceId ? ` #${l.resourceId.slice(-6)}` : ''}</td>
                  <td style={{ ...cell, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(l.details || '')}</td>
                  <td style={{ ...cell, color: ADMIN.muted }}>{l.ip || '—'}</td>
                  <td style={cell}>{new Date(l.createdAt).toLocaleString()}</td>
                </tr>
              ))}
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