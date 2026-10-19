'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SHARED } from '@/lib/styles'

type ActiveTab = 'home' | 'reels' | 'send' | 'search' | 'profile'

interface Props {
  active: ActiveTab
}

/**
 * AgriSocialBottomNav — Instagram-style bottom navigation bar.
 *
 * 5 icons in a row, white background, black line icons, no text labels.
 * The active icon gets a light-gray pill background behind it (like IG).
 * The Send (DM) icon shows an unread badge. The Profile tab is a circular
 * avatar with a ring when active.
 *
 * Pages that should NOT render this bar:
 *   - /agrisocial/clips  (full-screen immersive, has its own back button)
 *   - /agrisocial/create (full-screen creation flow)
 */
export default function AgriSocialBottomNav({ active }: Props) {
  const [unreadDMs, setUnreadDMs] = useState(0)
  const [profilePic, setProfilePic] = useState('')
  const [userId, setUserId] = useState('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    let cancelled = false
    const id = localStorage.getItem('userId') || ''
    setUserId(id)
    if (!id) return

    // Fetch viewer profile pic + unread DM count in parallel.
    // Reuses the same endpoints as the main feed's top nav so counts stay
    // consistent across the app.
    (async () => {
      try {
        const [profRes, convRes] = await Promise.all([
          authFetch('/api/social/profile'),
          authFetch('/api/social/dm/conversations'),
        ])
        if (cancelled) return
        if (profRes.ok) {
          const d = await profRes.json()
          const u = d.user || d.data?.user
          if (u?.profilePic) setProfilePic(u.profilePic)
        }
        if (convRes.ok) {
          const d = await convRes.json()
          const convs = d.data?.conversations || d.conversations || []
          setUnreadDMs(convs.filter((c: any) => c.unread).length)
        }
      } catch {}
    })()

    // Refresh unread count every 60s so the badge stays fresh while the
    // user lingers on a page.
    const i = setInterval(async () => {
      try {
        const r = await authFetch('/api/social/dm/conversations')
        if (cancelled || !r.ok) return
        const d = await r.json()
        const convs = d.data?.conversations || d.conversations || []
        setUnreadDMs(convs.filter((c: any) => c.unread).length)
      } catch {}
    }, 60_000)

    return () => { cancelled = true; clearInterval(i) }
  }, [])

  const items: Array<{
    key: ActiveTab
    href: string
    render: (isActive: boolean) => React.ReactNode
    badge?: number
  }> = [
    {
      key: 'home',
      href: '/agrisocial',
      render: (isActive) => <HomeIcon filled={isActive} />,
    },
    {
      key: 'reels',
      href: '/agrisocial/clips',
      render: (isActive) => <ReelsIcon filled={isActive} />,
    },
    {
      key: 'send',
      href: '/agrisocial/dm',
      render: (isActive) => <SendIcon filled={isActive} />,
      badge: unreadDMs,
    },
    {
      key: 'search',
      href: '/agrisocial/search',
      render: (isActive) => <SearchIcon filled={isActive} />,
    },
    {
      key: 'profile',
      href: userId ? `/agrisocial/profile/${userId}` : '/auth/login',
      render: (isActive) => <ProfileAvatarIcon profilePic={profilePic} active={isActive} />,
    },
  ]

  return (
    <>
      {/* Spacer so content above isn't hidden behind the fixed bar */}
      <div style={{ height: 56 }} aria-hidden />
      <nav
        className="agrisocial-bottom-nav"
        style={{
          position: 'fixed',
          bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid #E8E4D6',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0 calc(8px + env(safe-area-inset-bottom))',
          zIndex: 1000,
          fontFamily: SHARED.font,
          boxShadow: '0 -2px 12px rgba(49,55,43,0.06)',
          maxWidth: '600px',
          margin: '0 auto',
        }}
      >
        {items.map((item) => {
          const isActive = active === item.key
          return (
            <Link
              key={item.key}
              href={item.href}
              aria-label={item.key}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textDecoration: 'none',
                position: 'relative',
                padding: '6px 0',
              }}
            >
              {/* Pill background on the active icon — Instagram-style */}
              <div style={{
                padding: '7px 11px',
                borderRadius: 14,
                background: isActive ? '#EFEFEF' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.15s ease',
                position: 'relative',
              }}>
                {item.render(isActive)}
                {item.badge ? (
                  <span style={{
                    position: 'absolute',
                    top: -2, right: -6,
                    background: '#E98074',
                    color: '#fff',
                    fontSize: '0.6rem',
                    fontWeight: 800,
                    borderRadius: 100,
                    padding: '1px 5px',
                    minWidth: 16,
                    height: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                    lineHeight: 1,
                  }}>
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                ) : null}
              </div>
            </Link>
          )
        })}
      </nav>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Icons — Instagram-style line icons (24x24, stroke = currentColor)   */
/* ------------------------------------------------------------------ */

function HomeIcon({ filled }: { filled: boolean }) {
  // Filled house when active, outline house when not — exactly like IG
  if (filled) {
    return (
      <svg width="27" height="27" viewBox="0 0 24 24" fill="#000" stroke="#000" strokeWidth="1.5" strokeLinejoin="round">
        <path d="M22 23h-6.001a1 1 0 0 1-1-1v-5.455a2.997 2.997 0 1 0-5.993 0V22a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V11.543a1.002 1.002 0 0 1 .31-.724l10-9.543a1.001 1.001 0 0 1 1.38 0l10 9.543a1.002 1.002 0 0 1 .31.724V22a1 1 0 0 1-1 1Z" />
      </svg>
    )
  }
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 23h-6.001a1 1 0 0 1-1-1v-5.455a2.997 2.997 0 1 0-5.993 0V22a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V11.543a1.002 1.002 0 0 1 .31-.724l10-9.543a1.001 1.001 0 0 1 1.38 0l10 9.543a1.002 1.002 0 0 1 .31.724V22a1 1 0 0 1-1 1Z" />
    </svg>
  )
}

function ReelsIcon({ filled }: { filled: boolean }) {
  // Rounded rectangle with a play triangle — the IG Reels glyph
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill={filled ? '#000' : 'none'} stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M2 7h20M7 2l3 5M14 2l3 5" />
      <path d="M10 11l5 3-5 3z" fill={filled ? '#fff' : '#000'} stroke={filled ? '#fff' : '#000'} />
    </svg>
  )
}

function SendIcon({ filled }: { filled: boolean }) {
  // Paper-plane triangle — the IG Direct glyph. Filled when active.
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill={filled ? '#000' : 'none'} stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function SearchIcon({ filled }: { filled: boolean }) {
  // Magnifying glass — thick stroke when active
  return (
    <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth={filled ? 2.4 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function ProfileAvatarIcon({ profilePic, active }: { profilePic: string; active: boolean }) {
  // Circular avatar with a ring when active. Falls back to a person
  // silhouette when no profile pic is set.
  if (profilePic) {
    return (
      <div style={{
        width: 28, height: 28, borderRadius: '50%',
        overflow: 'hidden',
        border: active ? '2px solid #000' : '2px solid transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#EFEFEF',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={profilePic} alt="You" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      </div>
    )
  }
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill={active ? '#000' : 'none'} stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  )
}
