'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { ADMIN, SHARED } from '@/lib/styles'

const roleColors: Record<string, string> = { farmer: ADMIN.green, buyer: ADMIN.blue, transporter: ADMIN.yellow, driver: ADMIN.primary }

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
    authFetch(`/api/admin/users?${params}`)
      .then(r => r.json())
      .then(d => { setUsers(d.users || []); setTotal(d.total || 0) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [page, search, roleFilter])

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
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, letterSpacing: '0.02em' }}>Users</h1>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input placeholder="Search email, phone, name..." value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: `1px solid ${ADMIN.border}`, background: ADMIN.card, color: ADMIN.text, fontSize: 13, outline: 'none', fontFamily: SHARED.font, transition: 'border-color 0.2s, box-shadow 0.2s' }} />
        <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}
          style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${ADMIN.border}`, background: ADMIN.card, color: ADMIN.text, fontSize: 13, outline: 'none', fontFamily: SHARED.font }}>
          <option value="">All roles</option>
          <option value="farmer">Farmer</option>
          <option value="buyer">Buyer</option>
          <option value="transporter">Transporter</option>
          <option value="driver">Driver</option>
        </select>
      </div>
      <div style={{ background: ADMIN.card, border: `1px solid ${ADMIN.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 24, color: ADMIN.muted }}>Loading...</div> : users.length === 0 ? <div style={{ padding: 24, color: ADMIN.muted }}>No users found</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ color: ADMIN.muted, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                <th style={cell}>Email</th>
                <th style={cell}>Phone</th>
                <th style={cell}>Role</th>
                <th style={cell}>Name</th>
                <th style={cell}>Created</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: any, i: number) => (
                <tr key={u._id} style={{ color: ADMIN.text, background: i % 2 === 0 ? ADMIN.card : ADMIN.bgSub, transition: 'background 0.15s' }}>
                  <td style={cell}>{u.email}</td>
                  <td style={cell}>{u.phone}</td>
                  <td style={cell}><span style={{ color: roleColors[u.role] || ADMIN.muted, fontWeight: 600 }}>{u.role}</span></td>
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
          style={{ ...btnBase, cursor: page <= 1 ? 'not-allowed' : 'pointer', opacity: page <= 1 ? 0.5 : 1 }}>Prev</button>
        <span style={{ padding: '6px 14px', color: ADMIN.muted, fontSize: 13 }}>Page {page} of {Math.ceil(total / 20)}</span>
        <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage(p => p + 1)}
          style={{ ...btnBase, cursor: page >= Math.ceil(total / 20) ? 'not-allowed' : 'pointer', opacity: page >= Math.ceil(total / 20) ? 0.5 : 1 }}>Next</button>
      </div>
    </div>
  )
}