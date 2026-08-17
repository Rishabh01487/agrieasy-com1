'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Generate a stable anonymous device ID so we don't double-count
 * re-installs from the same device. Hashed from userAgent + screen +
 * timezone — NOT personally identifiable.
 */
function getDeviceId(): string {
  if (typeof window === 'undefined') return ''
  const parts = [
    navigator.userAgent,
    `${window.screen.width}x${window.screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    navigator.language || '',
  ].join('|')
  // Simple FNV-1a hash (no crypto needed — this is just for dedup)
  let hash = 0
  for (let i = 0; i < parts.length; i++) {
    hash = ((hash << 5) - hash) + parts.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

/**
 * Detect the user's platform for analytics.
 * Returns one of: 'android' | 'ios' | 'desktop-chrome' | 'desktop-edge' |
 * 'desktop-firefox' | 'desktop-safari' | 'other'
 */
function getPlatform(): string {
  if (typeof window === 'undefined') return 'unknown'
  const ua = navigator.userAgent
  if (/Android/i.test(ua)) return 'android'
  if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) return 'ios'
  const isDesktop = !/Mobi|Android/i.test(ua)
  if (isDesktop) {
    if (/Edg\//.test(ua)) return 'desktop-edge'
    if (/Chrome\//.test(ua) && !/Edg|OPR/.test(ua)) return 'desktop-chrome'
    if (/Firefox\//.test(ua)) return 'desktop-firefox'
    if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'desktop-safari'
    return 'desktop-other'
  }
  return 'other'
}

/** Fire-and-forget POST to record the install on the server. */
function recordInstall() {
  try {
    const deviceId = getDeviceId()
    const platform = getPlatform()
    const language = (navigator.language || '').slice(0, 16)
    const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : ''
    fetch('/api/analytics/pwa-install', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId, platform, language, userId: userId || undefined }),
      keepalive: true,  // ensures the request completes even if page unmounts
    }).catch(() => {})  // silent fail — don't bother the user
  } catch {
    // ignore — analytics should never break the UX
  }
}

export default function PWABootstrap() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstall, setShowInstall] = useState(false)
  const [showIOSHint, setShowIOSHint] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [recordedInstall, setRecordedInstall] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setInstalled(true)
      // If launched as installed PWA, record the install once (in case the
      // appinstalled event was missed — e.g. iOS Safari installs)
      if (!recordedInstall) {
        recordInstall()
        setRecordedInstall(true)
      }
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

    // Detect appinstalled event — this fires on Android/Chrome/Edge
    // when the user actually taps "Install" on the browser prompt.
    const installedHandler = () => {
      setInstalled(true)
      setShowInstall(false)
      setShowIOSHint(false)
      if (!recordedInstall) {
        recordInstall()
        setRecordedInstall(true)
      }
    }
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [recordedInstall])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setInstalled(true)
      // Record on accepted — backup for the appinstalled event,
      // which sometimes doesn't fire on certain Android devices.
      if (!recordedInstall) {
        recordInstall()
        setRecordedInstall(true)
      }
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
          border: '1.5px solid #31372B', zIndex: 9999, display: 'flex', alignItems: 'center', gap: 12,
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
