'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { SHARED } from '@/lib/styles'

const COOKIE_KEY = 'cookie_consent_v1'

// Pages where the cookie consent banner is too disruptive — it covers
// the main content on these immersive pages, so we skip showing it there.
// The user will still see it on home, dashboards, etc.
const HIDE_ON_PREFIXES = ['/agrisocial', '/agripay']

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const pathname = usePathname() || ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Don't show on immersive pages (agrisocial feed/clips, agripay)
    if (HIDE_ON_PREFIXES.some(p => pathname.startsWith(p))) return
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [pathname])

  const dismiss = (accepted: boolean) => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ accepted, date: new Date().toISOString() }))
    setVisible(false)
  }

  // Quick dismiss via the X button — equivalent to "decline" but doesn't
  // store an explicit "false" (lets the banner re-show next visit if the
  // user wants to revisit the decision).
  const quickDismiss = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="cookie-consent"
      style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 420, margin: '0 auto',
        background: '#fff', borderRadius: 14, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
        border: '1px solid #e2e8f0', zIndex: 9998, fontFamily: SHARED.font,
      }}
    >
      <button
        onClick={quickDismiss}
        aria-label="Dismiss cookie notice"
        style={{
          position: 'absolute', top: 8, right: 8, background: 'none', border: 'none',
          color: '#94a3b8', fontSize: '1.1rem', cursor: 'pointer', padding: 4, lineHeight: 1,
        }}
      >
        ✕
      </button>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, paddingRight: 24 }}>
        <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>🍪</span>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>We use cookies</p>
          <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: '#64748b', lineHeight: 1.4 }}>
            To keep you logged in + remember your preferences. By using AgriEasy you agree to our use of cookies.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => dismiss(true)}
          style={{
            flex: 1, padding: '9px 14px', background: '#31372B', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          ✅ Accept
        </button>
        <button
          onClick={() => dismiss(false)}
          style={{
            padding: '9px 14px', background: '#f1f5f9', color: '#64748b',
            border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}
