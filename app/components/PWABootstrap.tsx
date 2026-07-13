'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PWABootstrap() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setInstalled(true)
      return
    }

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((err) => {
        console.warn('SW registration failed:', err)
      })
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent)
    if (isIOS && isSafari) {
      const t = setTimeout(() => setShowIOSHint(true), 3000)
      return () => {
        clearTimeout(t)
        window.removeEventListener('beforeinstallprompt', handler)
      }
    }

    // Detect appinstalled event
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
  }, [])

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
          <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #AC3B61 0%, #C05070 50%, #D47890 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>🌾</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '0.92rem', color: '#0f172a' }}>Install AgriEasy</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: '#64748b' }}>Add to home screen for quick access — works offline.</p>
          </div>
          <button onClick={handleInstall} style={{ padding: '8px 16px', background: '#AC3B61', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.84rem', fontWeight: 700, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}>Install</button>
          <button onClick={() => setShowInstall(false)} aria-label="Dismiss" style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '1.2rem', padding: 4, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
      )}

      {/* iOS Safari install instructions */}
      {showIOSHint && (
        <div style={{
          position: 'fixed', bottom: 16, left: 16, right: 16, maxWidth: 480, margin: '0 auto',
          background: '#fff', borderRadius: 16, padding: 16, boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          border: '1.5px solid #AC3B61', zIndex: 9999, fontFamily: "var(--font-poppins), 'Poppins', sans-serif",
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: 'linear-gradient(135deg, #AC3B61 0%, #C05070 50%, #D47890 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', flexShrink: 0 }}>🌾</div>
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
