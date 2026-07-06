'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ADMIN, SHARED } from '@/lib/styles'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const path = usePathname()
  const [user, setUser] = useState<{ id: string; email: string; role: string } | null>(null)

  useEffect(() => {
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
    background: ADMIN.bg,
    color: ADMIN.text,
    fontFamily: SHARED.font,
  }

  const sidebarStyle: React.CSSProperties = {
    width: 240,
    background: ADMIN.sidebar,
    borderRight: `1px solid ${ADMIN.border}`,
    padding: '24px 12px',
    display: 'flex',
    flexDirection: 'column',
  }

  const mainStyle: React.CSSProperties = {
    flex: 1,
    padding: 32,
    overflowY: 'auto',
    fontFamily: SHARED.font,
  }

  const getSidebarLinkStyle = (active: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    borderRadius: 8,
    background: active ? ADMIN.sidebarActive : 'transparent',
    color: active ? SHARED.white : ADMIN.muted,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: active ? 600 : 400,
    marginBottom: 4,
    fontFamily: SHARED.font,
    borderLeft: active ? `3px solid ${ADMIN.primary}` : '3px solid transparent',
    transition: 'background 0.2s, color 0.2s, border-color 0.2s',
    cursor: 'pointer',
  })

  return (
    <div style={containerStyle}>
      <div style={sidebarStyle}>
        <div style={{ fontSize: 20, fontWeight: 700, color: ADMIN.primary, marginBottom: 32, paddingLeft: 16, fontFamily: SHARED.font, letterSpacing: '0.02em' }}>
          Admin
        </div>
        <nav>
          {links.map(l => (
            <Link key={l.href} href={l.href} style={getSidebarLinkStyle(path === l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <Link href="/" style={{ ...getSidebarLinkStyle(false), color: ADMIN.red }}>← Exit Admin</Link>
        </div>
      </div>
      <div style={mainStyle}>{children}</div>
    </div>
  )
}