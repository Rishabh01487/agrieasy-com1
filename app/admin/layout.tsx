'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = {
  bg: '#0f0f1a',
  card: '#1a1a2e',
  accent: '#6d28d9',
  accentHover: '#7c3aed',
  text: '#e2e8f0',
  muted: '#94a3b8',
  border: '#2d2d44',
  red: '#ef4444',
  green: '#22c55e',
}

const sidebarLink = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 16px',
  borderRadius: 8,
  background: active ? C.accent : 'transparent',
  color: active ? '#fff' : C.muted,
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: active ? 600 : 400,
  marginBottom: 4,
})

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null)
  const [path, setPath] = useState('')

  useEffect(() => {
    setPath(window.location.pathname)
    const token = localStorage.getItem('token')
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        if (payload.role !== 'admin') { router.push('/'); return }
        setUser(payload)
      } catch { router.push('/') }
    } else {
      router.push('/')
    }
  }, [router])

  if (!user) return null

  const links = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/users', label: 'Users' },
    { href: '/admin/transactions', label: 'Transactions' },
    { href: '/admin/posts', label: 'Posts' },
    { href: '/admin/logs', label: 'Audit Logs' },
  ]

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    background: C.bg,
    color: C.text,
  }

  const sidebarStyle: React.CSSProperties = {
    width: 240,
    background: C.card,
    borderRight: `1px solid ${C.border}`,
    padding: '24px 12px',
    display: 'flex',
    flexDirection: 'column',
  }

  const mainStyle: React.CSSProperties = {
    flex: 1,
    padding: 32,
    overflowY: 'auto',
  }

  return (
    <div style={containerStyle}>
      <div style={sidebarStyle}>
        <div style={{ fontSize: 20, fontWeight: 700, color: C.accent, marginBottom: 32, paddingLeft: 4 }}>
          Admin
        </div>
        <nav>
          {links.map(l => (
            <Link key={l.href} href={l.href} style={sidebarLink(path === l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <Link href="/" style={{ ...sidebarLink(false), color: C.red }}>← Exit Admin</Link>
        </div>
      </div>
      <div style={mainStyle}>{children}</div>
    </div>
  )
}
