'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { getUserInfo } from '@/lib/auth-fetch'
import { SHARED } from '@/lib/styles'
import { TabIcon } from './CardIcons'

interface TabItem {
  icon: string  // now a key for TabIcon instead of emoji
  label: string
  href: string
  match: string[]
}

const TABS: Record<string, TabItem[]> = {
  farmer: [
    { icon: 'home', label: 'Home', href: '/farmer/dashboard', match: ['/farmer/dashboard'] },
    { icon: 'search', label: 'Buyers', href: '/farmer/search-buyers', match: ['/farmer/search-buyers', '/farmer/buyer/'] },
    { icon: 'calendar', label: 'Bookings', href: '/farmer/my-bookings', match: ['/farmer/my-bookings', '/farmer/book-vehicle', '/farmer/tracking'] },
    { icon: 'location', label: 'Location', href: '/farmer/setup-location', match: ['/farmer/setup-location'] },
    { icon: 'wallet', label: 'Wallet', href: '/agripay', match: ['/agripay'] },
  ],
  buyer: [
    { icon: 'home', label: 'Home', href: '/buyer/dashboard', match: ['/buyer/dashboard'] },
    { icon: 'clipboard', label: 'Commodities', href: '/buyer/create-listing', match: ['/buyer/create-listing', '/buyer/listing/'] },
    { icon: 'calendar', label: 'Bookings', href: '/buyer/bookings', match: ['/buyer/bookings'] },
    { icon: 'truck', label: 'Vehicles', href: '/buyer/my-vehicles', match: ['/buyer/my-vehicles', '/buyer/profile'] },
    { icon: 'wallet', label: 'Wallet', href: '/agripay', match: ['/agripay'] },
  ],
  transporter: [
    { icon: 'home', label: 'Home', href: '/transporter/dashboard', match: ['/transporter/dashboard'] },
    { icon: 'truck', label: 'Fleet', href: '/transporter/my-vehicles', match: ['/transporter/my-vehicles', '/transporter/add-vehicle'] },
    { icon: 'calendar', label: 'Bookings', href: '/transporter/bookings', match: ['/transporter/bookings', '/transporter/tracking'] },
    { icon: 'social', label: 'Social', href: '/agrisocial', match: ['/agrisocial'] },
    { icon: 'wallet', label: 'Wallet', href: '/agripay', match: ['/agripay'] },
  ],
}

const HIDE_ON_PREFIXES = [
  '/auth/',
  '/admin',
  '/agrisocial',
  '/agripay',
  '/tracking',
  '/ledger',
]

export default function BottomTabBar() {
  const pathname = usePathname() || ''
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    const { userRole } = getUserInfo()
    setRole(userRole)
  }, [])

  if (!role || !TABS[role]) return null

  if (HIDE_ON_PREFIXES.some(prefix => pathname.startsWith(prefix))) return null

  const tabs = TABS[role]
  const isActive = (tab: TabItem) => tab.match.some(m => pathname.startsWith(m) || pathname === tab.href)

  return (
    <>
      <div style={{ height: 68 }} aria-hidden />
      <nav
        className="bottom-tab-bar"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid #EDC7B7',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'stretch',
          padding: '6px 0 calc(8px + env(safe-area-inset-bottom))',
          zIndex: 1000,
          fontFamily: SHARED.font,
          boxShadow: '0 -2px 16px rgba(172,59,97,0.08)',
        }}
      >
        {tabs.map(tab => {
          const active = isActive(tab)
          const iconColor = active ? '#AC3B61' : '#BAB2B5'
          return (
            <Link
              key={tab.label}
              href={tab.href}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '4px 2px',
                textDecoration: 'none',
                color: active ? '#AC3B61' : '#8E8D8A',
                transition: 'color 0.15s ease',
                position: 'relative',
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', top: 0,
                  width: 32, height: 3, borderRadius: 0,
                  background: '#AC3B61',
                }} />
              )}
              <TabIcon name={tab.icon} size={26} color={iconColor} />
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.02em',
                color: active ? '#AC3B61' : '#8E8D8A',
              }}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
