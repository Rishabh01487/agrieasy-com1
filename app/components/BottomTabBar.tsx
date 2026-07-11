'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getUserInfo } from '@/lib/auth-fetch'
import { SHARED } from '@/lib/styles'

interface TabItem {
  icon: string
  label: string
  href: string
  // Pattern to match against the current path to mark this tab as active
  match: string[]
}

// Role-specific tab configurations. Each role gets 5 tabs — the standard
// native-app pattern (home, search, primary action, notifications/activity, profile).
const TABS: Record<string, TabItem[]> = {
  farmer: [
    { icon: '🏠', label: 'Home', href: '/farmer/dashboard', match: ['/farmer/dashboard'] },
    { icon: '🔍', label: 'Buyers', href: '/farmer/search-buyers', match: ['/farmer/search-buyers', '/farmer/buyer/'] },
    { icon: '🚚', label: 'Bookings', href: '/farmer/my-bookings', match: ['/farmer/my-bookings', '/farmer/book-vehicle', '/farmer/tracking'] },
    { icon: '📍', label: 'Location', href: '/farmer/setup-location', match: ['/farmer/setup-location'] },
    { icon: '💳', label: 'Wallet', href: '/agripay', match: ['/agripay'] },
  ],
  buyer: [
    { icon: '🏠', label: 'Home', href: '/buyer/dashboard', match: ['/buyer/dashboard'] },
    { icon: '📝', label: 'Commodities', href: '/buyer/create-listing', match: ['/buyer/create-listing', '/buyer/listing/'] },
    { icon: '📅', label: 'Bookings', href: '/buyer/bookings', match: ['/buyer/bookings'] },
    { icon: '🚚', label: 'Vehicles', href: '/buyer/my-vehicles', match: ['/buyer/my-vehicles', '/buyer/profile'] },
    { icon: '💳', label: 'Wallet', href: '/agripay', match: ['/agripay'] },
  ],
  transporter: [
    { icon: '🏠', label: 'Home', href: '/transporter/dashboard', match: ['/transporter/dashboard'] },
    { icon: '🚛', label: 'Fleet', href: '/transporter/my-vehicles', match: ['/transporter/my-vehicles', '/transporter/add-vehicle'] },
    { icon: '📅', label: 'Bookings', href: '/transporter/bookings', match: ['/transporter/bookings', '/transporter/tracking'] },
    { icon: '📱', label: 'Social', href: '/agrisocial', match: ['/agrisocial'] },
    { icon: '💳', label: 'Wallet', href: '/agripay', match: ['/agripay'] },
  ],
}

/**
 * Mobile-only bottom tab bar — the standard native-app navigation pattern.
 * Hidden on desktop (>= 641px) via CSS. Sits above the iPhone home indicator
 * using env(safe-area-inset-bottom).
 */
export default function BottomTabBar() {
  const pathname = usePathname() || ''
  const router = useRouter()
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const { userRole } = getUserInfo()
    setRole(userRole)
  }, [])

  // Don't render on auth pages, admin, or if no role
  if (!role || !TABS[role]) return null
  if (pathname.startsWith('/auth/') || pathname.startsWith('/admin')) return null

  const tabs = TABS[role]

  const isActive = (tab: TabItem) => tab.match.some(m => pathname.startsWith(m) || pathname === tab.href)

  return (
    <>
      {/* Spacer so content doesn't hide behind the tab bar */}
      <div style={{ height: 64 }} aria-hidden />
      <nav
        className="bottom-tab-bar"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'stretch',
          padding: '6px 0 calc(6px + env(safe-area-inset-bottom))',
          zIndex: 1000,
          fontFamily: SHARED.font,
          boxShadow: '0 -2px 12px rgba(15,23,42,0.06)',
        }}
      >
        {tabs.map(tab => {
          const active = isActive(tab)
          return (
            <Link
              key={tab.label}
              href={tab.href}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 2, padding: '4px 2px',
                textDecoration: 'none',
                color: active ? '#2563eb' : '#64748b',
                transition: 'color 0.15s ease',
              }}
            >
              <span style={{ fontSize: '1.4rem', lineHeight: 1, filter: active ? 'none' : 'grayscale(0.3)' }}>{tab.icon}</span>
              <span style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.02em' }}>{tab.label}</span>
              {active && (
                <span style={{
                  position: 'absolute', top: 0,
                  width: 28, height: 3, borderRadius: 0,
                  background: '#2563eb',
                }} />
              )}
            </Link>
          )
        })}
      </nav>
    </>
  )
}
