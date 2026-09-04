'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { getUserInfo } from '@/lib/auth-fetch'
import { SHARED } from '@/lib/styles'
import { TabIcon } from './CardIcons'

interface TabItem {
  icon: string
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

// Tabs that are not yet live — show "SOON" badge + Coming Soon notice
// when tapped, instead of navigating to the underlying route.
const COMING_SOON_HREFS = new Set(['/agripay'])

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
  const [comingSoonMsg, setComingSoonMsg] = useState<string | null>(null)

  useEffect(() => {
    const { userRole } = getUserInfo()
    setRole(userRole)
  }, [])

  // Auto-hide the Coming Soon notice after 3s
  useEffect(() => {
    if (!comingSoonMsg) return
    const t = setTimeout(() => setComingSoonMsg(null), 3000)
    return () => clearTimeout(t)
  }, [comingSoonMsg])

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
          borderTop: '1px solid #E8E4D6',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'stretch',
          padding: '6px 0 calc(8px + env(safe-area-inset-bottom))',
          zIndex: 1000,
          fontFamily: SHARED.font,
          boxShadow: '0 -2px 16px rgba(49,55,43,0.08)',
        }}
      >
        {tabs.map(tab => {
          const active = isActive(tab)
          const iconColor = active ? '#31372B' : '#A8A695'
          const isComingSoon = COMING_SOON_HREFS.has(tab.href)
          const handleTap = (e: React.MouseEvent) => {
            if (!isComingSoon) return
            e.preventDefault()
            setComingSoonMsg(`${tab.label} is coming soon — stay tuned! 🚀`)
          }
          return (
            <Link
              key={tab.label}
              href={isComingSoon ? '#' : tab.href}
              onClick={handleTap}
              aria-disabled={isComingSoon}
              style={{
                flex: 1,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '4px 2px',
                textDecoration: 'none',
                color: active ? '#31372B' : '#8E8D8A',
                transition: 'color 0.15s ease',
                position: 'relative',
                opacity: isComingSoon ? 0.7 : 1,
              }}
            >
              {active && (
                <span style={{
                  position: 'absolute', top: 0,
                  width: 32, height: 3, borderRadius: 0,
                  background: '#31372B',
                }} />
              )}
              <div style={{ position: 'relative' }}>
                <TabIcon name={tab.icon} size={26} color={iconColor} />
                {isComingSoon && (
                  <span style={{
                    position: 'absolute', top: -6, right: -10,
                    background: '#E98074', color: '#fff',
                    fontSize: '0.5rem', fontWeight: 800,
                    padding: '1px 4px', borderRadius: 100,
                    letterSpacing: '0.04em', textTransform: 'uppercase',
                    boxShadow: '0 1px 4px rgba(233,128,116,0.5)',
                    lineHeight: 1.2,
                  }}>SOON</span>
                )}
              </div>
              <span style={{
                fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.02em',
                color: active ? '#31372B' : '#8E8D8A',
              }}>{tab.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Coming Soon toast — appears above the tab bar */}
      {comingSoonMsg && (
        <div
          role="status"
          style={{
            position: 'fixed',
            bottom: 'calc(80px + env(safe-area-inset-bottom))',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#31372B',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: 100,
            fontSize: '0.82rem',
            fontWeight: 700,
            fontFamily: SHARED.font,
            boxShadow: '0 8px 24px rgba(49,55,43,0.35)',
            zIndex: 1100,
            maxWidth: 'calc(100vw - 32px)',
            textAlign: 'center',
            animation: 'slideUpFade 0.25s ease-out',
          }}
        >
          {comingSoonMsg}
        </div>
      )}

      <style>{`@keyframes slideUpFade { from { opacity: 0; transform: translate(-50%, 8px); } to { opacity: 1; transform: translate(-50%, 0); } }`}</style>
    </>
  )
}
