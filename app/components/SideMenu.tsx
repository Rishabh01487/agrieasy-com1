'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { getUserInfo, logout } from '@/lib/auth-fetch'
import { SHARED } from '@/lib/styles'

interface SideMenuItem {
  icon: string
  label: string
  href: string
  badge?: number
}

interface SideMenuProps {
  /** Items to show in the drawer (beyond the standard ones) */
  items?: SideMenuItem[]
  /** Optional header content (e.g. user name + avatar) */
  header?: React.ReactNode
}

export default function SideMenu({ items = [], header }: SideMenuProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const [role, setRole] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    const { userRole, userEmail } = getUserInfo()
    setRole(userRole)
    setUserEmail(userEmail || '')
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = '' }
    }
  }, [open])

  const standardItems: SideMenuItem[] = role === 'farmer' ? [
    { icon: '🏠', label: 'Dashboard', href: '/farmer/dashboard' },
    { icon: '🔍', label: 'Search Buyers', href: '/farmer/search-buyers' },
    { icon: '🚚', label: 'My Bookings', href: '/farmer/my-bookings' },
    { icon: '📍', label: 'My Location', href: '/farmer/setup-location' },
    { icon: '📒', label: 'Ledger', href: '/ledger' },
  ] : role === 'buyer' ? [
    { icon: '🏠', label: 'Dashboard', href: '/buyer/dashboard' },
    { icon: '📝', label: 'Add Commodity', href: '/buyer/create-listing' },
    { icon: '📅', label: 'Bookings', href: '/buyer/bookings' },
    { icon: '👤', label: 'My Profile', href: '/buyer/profile' },
    { icon: '🚚', label: 'My Vehicles', href: '/buyer/my-vehicles' },
    { icon: '🧾', label: 'Billing', href: '/buyer/billing' },
    { icon: '📒', label: 'Ledger', href: '/ledger' },
  ] : role === 'transporter' ? [
    { icon: '🏠', label: 'Dashboard', href: '/transporter/dashboard' },
    { icon: '🚛', label: 'My Fleet', href: '/transporter/my-vehicles' },
    { icon: '➕', label: 'Add Vehicle', href: '/transporter/add-vehicle' },
    { icon: '📅', label: 'Bookings', href: '/transporter/bookings' },
    { icon: '📒', label: 'Ledger', href: '/ledger' },
  ] : []

  const allItems = [...standardItems, ...items]

  const sharedItems: SideMenuItem[] = [
    { icon: '📱', label: 'AgriSocial', href: '/agrisocial' },
    { icon: '💳', label: 'AgriPay Wallet', href: '/agripay' },
  ]

  return (
    <>
      {/* ☰ trigger — only visible on mobile (CSS class hides on desktop) */}
      <button
        className="side-menu-trigger"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '1.5rem', padding: '4px 8px', color: '#0f172a',
          display: 'none',  // shown via CSS on mobile
        }}
      >
        ☰
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(15,23,42,0.5)',
            zIndex: 2000,
            animation: 'fadeIn 0.2s ease-out',
          }}
        />
      )}

      {/* Drawer */}
      <aside
        className="side-menu-drawer"
        style={{
          position: 'fixed', top: 0, bottom: 0, left: 0,
          width: 'min(320px, 85vw)',
          background: '#fff',
          zIndex: 2001,
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease-out',
          boxShadow: open ? '4px 0 24px rgba(0,0,0,0.15)' : 'none',
          display: 'flex', flexDirection: 'column',
          fontFamily: SHARED.font,
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
          color: '#fff',
          padding: '20px 18px calc(20px + env(safe-area-inset-top))',
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', flexShrink: 0,
          }}>🌾</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1rem' }}>AgriEasy</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.74rem', opacity: 0.85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {userEmail || 'Welcome'}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: '1.1rem',
            }}
          >✕</button>
        </div>

        {header && <div style={{ padding: 14 }}>{header}</div>}

        {/* Standard items */}
        <nav style={{ flex: 1, padding: '8px 0' }}>
          {allItems.map(item => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px',
                  textDecoration: 'none',
                  color: active ? '#2563eb' : '#1e293b',
                  background: active ? '#eff6ff' : 'transparent',
                  fontWeight: active ? 700 : 600,
                  fontSize: '0.9rem',
                  borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '1.2rem', width: 24, textAlign: 'center' }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {item.badge != null && item.badge > 0 && (
                  <span style={{
                    background: '#dc2626', color: '#fff',
                    fontSize: '0.7rem', fontWeight: 800,
                    padding: '2px 7px', borderRadius: 100,
                    minWidth: 20, textAlign: 'center',
                  }}>{item.badge}</span>
                )}
              </Link>
            )
          })}

          {/* Divider */}
          <div style={{ height: 1, background: '#e2e8f0', margin: '8px 18px' }} />

          {/* Shared items */}
          {sharedItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 18px',
                  textDecoration: 'none',
                  color: active ? '#2563eb' : '#1e293b',
                  background: active ? '#eff6ff' : 'transparent',
                  fontWeight: active ? 700 : 600,
                  fontSize: '0.9rem',
                  borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
                }}
              >
                <span style={{ fontSize: '1.2rem', width: 24, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Footer — logout */}
        <div style={{ borderTop: '1px solid #e2e8f0', padding: 12 }}>
          <button
            onClick={() => { void logout() }}
            style={{
              width: '100%', padding: '11px 16px',
              background: '#fee2e2', color: '#dc2626',
              border: '1px solid #fca5a5', borderRadius: 10,
              fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <span>🚪</span> Logout
          </button>
        </div>
      </aside>

      <style>{`@keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }`}</style>
    </>
  )
}
