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

const statCard: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  padding: '20px 24px',
  minWidth: 180,
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(r => r.json())
      .then(d => { setStats(d.stats); setLogs(d.recentLogs || []) })
      .catch(console.error)
  }, [])

  const rows = stats ? [
    { label: 'Total Users', value: stats.totalUsers, color: C.accent },
    { label: 'Farmers', value: stats.farmers, color: C.green },
    { label: 'Buyers', value: stats.buyers, color: C.blue },
    { label: 'Transporters', value: stats.transporters, color: C.yellow },
    { label: 'Posts', value: stats.totalPosts, color: C.accent },
    { label: 'Clips', value: stats.totalClips, color: C.red },
    { label: 'Transactions', value: stats.totalTransactions, color: C.green },
    { label: 'Wallets', value: stats.totalWallets, color: C.blue },
  ] : []

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 24 }}>Dashboard</h1>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        {rows.map(r => (
          <div key={r.label} style={statCard}>
            <div style={{ fontSize: 28, fontWeight: 700, color: r.color }}>{r.value ?? '—'}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{r.label}</div>
          </div>
        ))}
      </div>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>Recent Activity</h2>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, overflow: 'hidden' }}>
        {logs.length === 0 && <div style={{ padding: 24, color: C.muted }}>No recent activity</div>}
        {logs.map((log: any, i: number) => (
          <div key={i} style={{ padding: '12px 16px', borderBottom: i < logs.length - 1 ? `1px solid ${C.border}` : 'none', fontSize: 13, display: 'flex', justifyContent: 'space-between' }}>
            <span><span style={{ color: C.accent, fontWeight: 600 }}>{log.action}</span> on {log.resource}{log.resourceId ? ` #${log.resourceId.slice(-6)}` : ''}</span>
            <span style={{ color: C.muted }}>{new Date(log.createdAt).toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
