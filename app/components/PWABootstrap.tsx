'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { usePathname } from 'next/navigation'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

// Pages where the PWA install prompt is too disruptive — it covers
// the main content on these immersive pages, so we skip showing it there.
// (User can still install from any other page.)
const HIDE_ON_PREFIXES = ['/agrisocial/clips', '/agripay', '/auth/']

// Delay before showing the install prompt — show immediately (was 30s,
// reverted to 0 per user request: "make sure it pops up immediately")
const INSTALL_PROMPT_DELAY_MS = 0

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
 * double-line convention). Rendered with an SVG <pattern> so it tiles
 * horizontally across the full card width. */
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

/* Madhubani sun-mandala — 8 gold triangular rays radiating around a
 * navy circle, with a dotted gold ring (creeping-vine motif) and a
 * cream play triangle (the PWA install symbol) in the center. */
function MadhubaniSunMandala({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ flexShrink: 0 }}
    >
      {/* 8 triangular sun rays */}
      <g fill={MH.gold} stroke={MH.navy} strokeWidth="0.5" strokeLinejoin="round">
        <polygon points="22,2 19.5,11 24.5,11" />
        <polygon points="22,2 19.5,11 24.5,11" transform="rotate(45 22 22)" />
        <polygon points="22,2 19.5,11 24.5,11" transform="rotate(90 22 22)" />
        <polygon points="22,2 19.5,11 24.5,11" transform="rotate(135 22 22)" />
        <polygon points="22,2 19.5,11 24.5,11" transform="rotate(180 22 22)" />
        <polygon points="22,2 19.5,11 24.5,11" transform="rotate(225 22 22)" />
        <polygon points="22,2 19.5,11 24.5,11" transform="rotate(270 22 22)" />
        <polygon points="22,2 19.5,11 24.5,11" transform="rotate(315 22 22)" />
      </g>
      {/* Dotted gold ring — creeping vine motif */}
      <circle cx="22" cy="22" r="13" fill="none" stroke={MH.gold} strokeWidth="0.6" strokeDasharray="1.2 1.2" />
      {/* Navy center circle with pink border */}
      <circle cx="22" cy="22" r="11" fill={MH.navy} stroke={MH.pink} strokeWidth="1" />
      {/* Cream play triangle — PWA install symbol */}
      <polygon points="19,15 19,29 30,22" fill={MH.cream} />
      {/* Gold accent dots at the 4 cardinal points */}
      <g fill={MH.gold}>
        <circle cx="22" cy="11" r="0.8" />
        <circle cx="22" cy="33" r="0.8" />
        <circle cx="11" cy="22" r="0.8" />
        <circle cx="33" cy="22" r="0.8" />
      </g>
    </svg>
  )
}

export default function PWABootstrap() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [installed, setInstalled] = useState(false)
  const pathname = usePathname() || ''
  const isHiddenPage = HIDE_ON_PREFIXES.some(p => pathname.startsWith(p))

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setInstalled(true)
      return
    }

    // Register service worker (always, regardless of page)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err)
      })
    }

    // Don't show install prompts on immersive pages
    if (isHiddenPage) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Delay showing the install banner so user sees content first
      setTimeout(() => setShowInstall(true), INSTALL_PROMPT_DELAY_MS)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      const t = setTimeout(() => setShowIOSHint(true), INSTALL_PROMPT_DELAY_MS)
      return () => {
        clearTimeout(t)
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    const installedHandler = () => {
      setInstalled(true)
      setShowInstall(false)
      setShowIOSHint(false)
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [isHiddenPage])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
    }
    setShowInstall(false)
    setDeferredPrompt(null)
  }

  if (installed) return null

  // Don't render any install UI on hidden pages
  if (isHiddenPage) return null

  // Madhubani card — cream bg + gold double-line border (outer border +
  // inset box-shadow line) + 22px top padding so the 6px Madhubani strip
  // sits above the content without overlap.
  const madhubaniCardStyle: CSSProperties = {
    position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 480, margin: '0 auto',
    background: MH.cream, borderRadius: 16, padding: '22px 16px 16px',
    boxShadow: `0 10px 30px rgba(26,26,62,0.20), inset 0 0 0 2px ${MH.cream}, inset 0 0 0 3px ${MH.gold}`,
    border: `1.5px solid ${MH.gold}`,
    zIndex: 9999, fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
    overflow: 'hidden',
  }

  const dismissBtnStyle: CSSProperties = {
    background: 'none', border: 'none', color: MH.gold,
    cursor: 'pointer', fontSize: '1.2rem', padding: 4, lineHeight: 1,
  }

  return (
    <>
      {/* Chrome/Edge/Android install banner */}
      {showInstall && (
        <div style={madhubaniCardStyle}>
          <MadhubaniStrip patternId="pwa-strip-install" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <MadhubaniSunMandala size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: MH.navy }}>Install AgriEasy</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: MH.pinkGray }}>Add to home screen for quick access — works offline.</p>
            </div>
            <button
              onClick={handleInstall}
              style={{
                padding: '8px 16px',
                background: `linear-gradient(135deg, ${MH.navy}, ${MH.pink})`,
                color: MH.cream, border: `1px solid ${MH.gold}`,
                borderRadius: 8, fontSize: '0.84rem', fontWeight: 700,
                cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
              }}
            >Install</button>
            <button onClick={() => setShowInstall(false)} aria-label="Dismiss" style={dismissBtnStyle}>✕</button>
          </div>
        </div>
      )}

      {/* iOS Safari install instructions */}
      {showIOSHint && (
        <div style={madhubaniCardStyle}>
          <MadhubaniStrip patternId="pwa-strip-ios" />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <MadhubaniSunMandala size={44} />
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: MH.navy }}>Install AgriEasy on iPhone</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: MH.pinkGray }}>Tap the steps below to add it to your home screen.</p>
            </div>
            <button onClick={() => setShowIOSHint(false)} aria-label="Dismiss" style={dismissBtnStyle}>✕</button>
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: MH.navy, lineHeight: 1.7 }}>
            <li>Tap the <strong>Share</strong> button <span style={{ fontSize: '1.1rem' }}>⎋</span> in Safari&apos;s bottom toolbar</li>
            <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
            <li>Tap <strong>&quot;Add&quot;</strong> — AgriEasy will appear as an app on your home screen</li>
          </ol>
        </div>
      )}
    </>
  )
}
