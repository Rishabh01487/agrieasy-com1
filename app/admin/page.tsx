'use client'

import { useState, useEffect } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import { ADMIN, SHARED } from '@/lib/styles'

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    authFetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setStats(d.stats); setLogs(d.recentLogs || []) })
      .catch(console.error)
  }, [])

  const rows = stats ? [
    { label: 'Total Users', value: stats.totalUsers, color: ADMIN.primary },
    { label: 'Farmers', value: stats.farmers, color: ADMIN.green },
    { label: 'Buyers', value: stats.buyers, color: ADMIN.blue },
    { label: 'Transporters', value: stats.transporters, color: ADMIN.yellow },
    { label: 'Posts', value: stats.totalPosts, color: ADMIN.primary },
    { label: 'Clips', value: stats.totalClips, color: ADMIN.red },
    { label: 'Transactions', value: stats.totalTransactions, color: ADMIN.green },
    { label: 'Wallets', value: stats.totalWallets, color: ADMIN.blue },
  ] : []

  return (
    <div style={{ fontFamily: SHARED.font }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24, letterSpacing: '0.02em' }}>Dashboard</h1>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        {rows.map(r => (
          <div key={r.label} style={{
            background: ADMIN.card,
            border: `1px solid ${ADMIN.border}`,
            borderRadius: 12,
            padding: '20px 24px',
            minWidth: 180,
            borderLeft: `4px solid ${r.color}`,
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'default',
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: r.color }}>{r.value ?? '—'}</div>
            <div style={{ fontSize: 13, color: ADMIN.muted, marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{r.label}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, letterSpacing: '0.02em' }}>Recent Activity</h2>
      <div style={{ background: ADMIN.card, border: `1px solid ${ADMIN.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {logs.length === 0 && <div style={{ padding: 24, color: ADMIN.muted, fontFamily: SHARED.font }}>No recent activity</div>}
        {logs.map((log: any, i: number) => (
          <div key={i} style={{
            padding: '12px 16px',
            borderBottom: i < logs.length - 1 ? `1px solid ${ADMIN.border}` : 'none',
            fontSize: 13,
            display: 'flex',
            justifyContent: 'space-between',
            background: i % 2 === 0 ? ADMIN.card : ADMIN.bgSub,
            transition: 'background 0.15s',
          }}>
            <span><span style={{ color: ADMIN.primary, fontWeight: 600 }}>{log.action}</span> on {log.resource}{log.resourceId ? ` #${log.resourceId.slice(-6)}` : ''}</span>
            <span style={{ color: ADMIN.muted }}>{new Date(log.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}