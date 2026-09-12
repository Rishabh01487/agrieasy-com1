'use client'

import { useEffect, useState } from 'react'
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

  return (
    <>
      {/* Chrome/Edge/Android install banner */}
      {showInstall && (
        <div style={{
          position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 480, margin: '0 auto',
          background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          border: '1.5px solid #AC3B61', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
          fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
        }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #31372B 0%, #31372B 50%, #4A5240 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>🌾</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Install AgriEasy</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Add to home screen for quick access — works offline.</p>
          </div>
          <button onClick={handleInstall} style={{ padding: '8px 16px', background: '#31372B', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>Install</button>
          <button onClick={() => setShowInstall(false)} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: 4, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* iOS Safari install instructions */}
      {showIOSHint && (
        <div style={{
          position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 480, margin: '0 auto',
          background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          border: '1.5px solid #31372B', zIndex: 9999, fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #31372B 0%, #31372B 50%, #4A5240 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>🌾</div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Install AgriEasy on iPhone</p>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Tap the steps below to add it to your home screen.</p>
            </div>
            <button onClick={() => setShowIOSHint(false)} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: 4, lineHeight: 1 }}>✕</button>
          </div>
          <ol style={{ margin: 0, paddingLeft: 18, fontSize: '0.82rem', color: '#1e293b', lineHeight: 1.7 }}>
            <li>Tap the <strong>Share</strong> button <span style={{ fontSize: '1.1rem' }}>⎋</span> in Safari&apos;s bottom toolbar</li>
            <li>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></li>
            <li>Tap <strong>&quot;Add&quot;</strong> — AgriEasy will appear as an app on your home screen</li>
          </ol>
        </div>
      )}
    </>
  )
}
