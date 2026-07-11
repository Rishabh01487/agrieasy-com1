'use client'

import { useState, useEffect } from 'react'
import { SHARED } from '@/lib/styles'

const COOKIE_KEY = 'cookie_consent_v1'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const consent = localStorage.getItem(COOKIE_KEY)
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500)
      return () => clearTimeout(timer)
    }
  }, [])

  const accept = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ accepted: true, date: new Date().toISOString() }))
    setVisible(false)
  }

  const decline = () => {
    localStorage.setItem(COOKIE_KEY, JSON.stringify({ accepted: false, date: new Date().toISOString() }))
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="cookie-consent"
      style={{
        position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 480, margin: '0 auto',
        background: '#fff', borderRadius: 16, padding: 20, boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
        border: '1px solid #e2e8f0', zIndex: 9998, fontFamily: SHARED.font,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🍪</span>
        <div>
          <p style={{ margin: 0, fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>We use cookies</p>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5 }}>
            AgriEasy uses cookies to keep you logged in, remember your preferences, and improve the app. By using this site, you agree to our use of cookies.
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={accept}
          style={{
            flex: 1, padding: '10px 16px', background: '#2563eb', color: '#fff',
            border: 'none', borderRadius: 10, fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          ✅ Accept
        </button>
        <button
          onClick={decline}
          style={{
            padding: '10px 16px', background: '#f1f5f9', color: '#64748b',
            border: '1px solid #e2e8f0', borderRadius: 10, fontSize: '0.86rem', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Decline
        </button>
      </div>
    </div>
  )
}
