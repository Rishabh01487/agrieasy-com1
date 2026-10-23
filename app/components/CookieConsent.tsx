'use client'

import { useState, useEffect } from 'react'
import type { CSSProperties } from 'react'
import { usePathname } from 'next/navigation'
import { SHARED } from '@/lib/styles'

const COOKIE_KEY = 'cookie_consent_v1'

// Pages where the cookie consent banner is too disruptive — it covers
// the main content on these immersive pages, so we skip showing it there.
// The user will still see it on home, dashboards, etc.
const HIDE_ON_PREFIXES = ['/agrisocial', '/agripay']

// Madhubani painting palette (reference image — navy → pink → gold on cream)
const MH = {
  navy: '#1A1A3E',
  pink: '#D45D7E',
  gold: '#D4A574',
  cream: '#FFF8F0',
  deepPink: '#B83A5C',
  pinkGray: '#8B6B7A',
}

/* Madhubani top decorative strip — sun-ray chevron motif (alternating
 * navy + pink triangles between two thin gold lines, the kohbar
 * double-line convention). Same pattern as PWABootstrap. */
function MadhubaniStrip({ patternId }: { patternId: string }) {
  return (
    <svg
      width="100%"
      height={6}
      aria-hidden="true"
      style={{ display: 'block', position: 'absolute', top: 0, left: 0, right: 0 }}
    >
      <defs>
        <pattern id={patternId} patternUnits="userSpaceOnUse" width="4" height="6">
          <rect width="4" height="6" fill={MH.cream} />
          <rect width="4" height="0.5" fill={MH.gold} />
          <rect y="5.5" width="4" height="0.5" fill={MH.gold} />
          <polygon points="0,5.5 1,0.5 2,5.5" fill={MH.navy} />
          <polygon points="2,0.5 3,5.5 4,0.5" fill={MH.pink} />
        </pattern>
      </defs>
      <rect width="100%" height="6" fill={`url(#${patternId})`} />
    </svg>
  )
}

/* Madhubani sun-motif cookie icon — replaces the 🍪 emoji. 8 gold
 * sun rays around a navy circle, with a gold center "chip" and pink
 * accent dots evoking Madhubani sun paintings. */
function MadhubaniCookieIcon({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* 8 triangular sun rays */}
      <g fill={MH.gold} stroke={MH.navy} strokeWidth="0.5" strokeLinejoin="round">
        <polygon points="16,2 14,8 18,8" />
        <polygon points="16,2 14,8 18,8" transform="rotate(45 16 16)" />
        <polygon points="16,2 14,8 18,8" transform="rotate(90 16 16)" />
        <polygon points="16,2 14,8 18,8" transform="rotate(135 16 16)" />
        <polygon points="16,2 14,8 18,8" transform="rotate(180 16 16)" />
        <polygon points="16,2 14,8 18,8" transform="rotate(225 16 16)" />
        <polygon points="16,2 14,8 18,8" transform="rotate(270 16 16)" />
        <polygon points="16,2 14,8 18,8" transform="rotate(315 16 16)" />
      </g>
      {/* Navy center circle (the "cookie" body) */}
      <circle cx="16" cy="16" r="8" fill={MH.navy} stroke={MH.gold} strokeWidth="0.8" />
      {/* Gold center "chip" */}
      <circle cx="16" cy="16" r="2.5" fill={MH.gold} />
      {/* Pink accent dots at the 4 cardinal points */}
      <g fill={MH.pink}>
        <circle cx="16" cy="9" r="0.7" />
        <circle cx="16" cy="23" r="0.7" />
        <circle cx="9" cy="16" r="0.7" />
        <circle cx="23" cy="16" r="0.7" />
      </g>
    </svg>
  )
}

/* Hand-drawn checkmark SVG — replaces the ✅ emoji on the Accept button. */
function GoldCheckSvg({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: '-2px', marginRight: 4 }}
    >
      <path
        d="M5 13l4 4L19 7"
        stroke={MH.cream}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

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

  const cardStyle: CSSProperties = {
    position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 420, margin: '0 auto',
    background: MH.cream, borderRadius: 14, padding: '22px 16px 16px',
    boxShadow: `0 10px 30px rgba(26,26,62,0.18), inset 0 0 0 2px ${MH.cream}, inset 0 0 0 3px ${MH.gold}`,
    border: `1.5px solid ${MH.gold}`,
    zIndex: 9998, fontFamily: SHARED.font, overflow: 'hidden',
  }

  return (
    <div className="cookie-consent" style={cardStyle}>
      <MadhubaniStrip patternId="cookie-strip" />
      <button
        onClick={quickDismiss}
        aria-label="Dismiss cookie notice"
        style={{
          position: 'absolute', top: 14, right: 8, background: 'none', border: 'none',
          color: MH.gold, fontSize: '1.1rem', cursor: 'pointer', padding: 4, lineHeight: 1, zIndex: 2,
        }}
      >
        ✕
      </button>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12, paddingRight: 24 }}>
        <MadhubaniCookieIcon size={32} />
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.9rem', color: MH.navy }}>We use cookies</p>
          <p style={{ margin: '3px 0 0', fontSize: '0.76rem', color: MH.pinkGray, lineHeight: 1.4 }}>
            To keep you logged in + remember your preferences. By using AgriEasy you agree to our use of cookies.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => dismiss(true)}
          style={{
            flex: 1, padding: '9px 14px',
            background: `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`,
            color: MH.cream, border: `1px solid ${MH.gold}`,
            borderRadius: 8, fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          <GoldCheckSvg size={14} />Accept
        </button>
        <button
          onClick={() => dismiss(false)}
          style={{
            padding: '9px 14px', background: MH.cream, color: MH.navy,
            border: `1px solid ${MH.gold}`, borderRadius: 8,
            fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}
