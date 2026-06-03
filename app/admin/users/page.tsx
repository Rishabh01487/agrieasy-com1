'use client'

import { useState, useEffect } from 'react'

const C = {
  bg: '#0f0f1a',
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

const roleColors: Record<string, string> = { farmer: C.green, buyer: C.blue, transporter: C.yellow, driver: C.accent }

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (search) params.set('search', search)
    if (roleFilter) params.set('role', roleFilter)
    fetch(`/api/admin/users?${params}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setTotal(d.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, search, roleFilter])

  const cell: React.CSSProperties = { padding: '10px 12px', fontSize: 13, borderBottom: `1px solid ${C.border}` }

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Users</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input placeholder="Search email, phone, name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, outline: 'none' }} />
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
          style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: 13, outline: 'none' }}>
          <option value="">All roles</option>
          <option value="farmer">Farmer</option>
          <option value="buyer">Buyer</option>
          <option value="transporter">Transporter</option>
          <option value="driver">Driver</option>
        </select>
      </div>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 24, color: C.muted }}>Loading...</div> : users.length === 0 ? <div style={{ padding: 24, color: C.muted }}>No users found</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: C.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>
                <th style={cell}>Email</th>
                <th style={cell}>Phone</th>
                <th style={cell}>Role</th>
                <th style={cell}>Name</th>
                <th style={cell}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u._id} style={{ color: C.text }}>
                  <td style={cell}>{u.email}</td>
                  <td style={cell}>{u.phone}</td>
                  <td style={cell}><span style={{ color: roleColors[u.role] || C.muted, fontWeight: 600 }}>{u.role}</span></td>
                  <td style={cell}>{u.farmerName || u.firmName || u.transporterCompanyName || '—'}</td>
                  <td style={cell}>{new Date(u.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
          style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>Prev</button>
        <span style={{ padding: '6px 14px', color: C.muted, fontSize: 13 }}>Page {page} of {Math.ceil(total / 20)}</span>
        <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
          style={{ padding: '6px 14px', borderRadius: 6, border: `1px solid ${C.border}`, background: C.card, color: C.text, cursor: page >= Math.ceil(total / 20) ? 'not-allowed' : 'pointer', opacity: page >= Math.ceil(total / 20) ? 0.5 : 1 }}>Next</button>
      </div>
    </div>
  )
}
