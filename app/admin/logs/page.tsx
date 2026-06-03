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
  blue: '#3b82f6',
  yellow: '#eab308',
}

const actionColors: Record<string, string> = {
  CREATE: C.green,
  UPDATE: C.blue,
  DELETE: C.red,
  LOGIN: C.yellow,
  VIOLATION: C.red,
}

const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: `1px solid ${C.border}` }

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
    fetch(`/api/admin/audit-logs?${params}`)
      .then(r => r.json())
      .then(d => { setLogs(d.logs || []); setTotal(d.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, actionFilter])

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Audit Logs</h1>
      <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1) }}
        style={{ marginBottom: 20, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, outline: 'none' }}>
        <option value="">All actions</option>
        <option value="CREATE">CREATE</option>
        <option value="UPDATE">UPDATE</option>
        <option value="DELETE">DELETE</option>
        <option value="LOGIN">LOGIN</option>
        <option value="VIOLATION">VIOLATION</option>
      </select>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 24, color: C.muted }}>Loading...</div> : logs.length === 0 ? <div style={{ padding: 24, color: C.muted }}>No audit logs</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
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
                <tr key={i}>
                  <td style={{ ...cell, fontWeight: 600, color: actionColors[l.action] || C.text }}>{l.action}</td>
                  <td style={cell}>{l.userId?.email || l.userId || '—'}</td>
                  <td style={{ ...cell, color: C.accent }}>{l.resource}{l.resourceId ? ` #${l.resourceId.slice(-6)}` : ''}</td>
                  <td style={{ ...cell, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{JSON.stringify(l.details || '')}</td>
                  <td style={{ ...cell, color: C.muted }}>{l.ip || '—'}</td>
                  <td style={cell}>{new Date(l.createdAt).toLocaleString()}</td>
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
