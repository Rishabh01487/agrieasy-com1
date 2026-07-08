'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AgriSocialError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('AgriSocial error:', error) }, [error])

  return (
    <div style={{ minHeight: '100vh', background: '#fafbfc', fontFamily: "'Inter','Segoe UI',sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 420 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/agrisocial-logo.png" alt="AgriSocial" style={{ width: 64, height: 64, borderRadius: 16, objectFit: 'cover', margin: '0 auto 12px', display: 'block' }} />
        <h2 style={{ color: '#0f172a', fontWeight: 800, margin: '0 0 8px' }}>Something went wrong</h2>
        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '0 0 8px' }}>AgriSocial experienced an error loading the feed.</p>
        {error.message && (
          <p style={{ color: '#94a3b8', fontSize: '0.78rem', margin: '0 0 20px', fontFamily: 'monospace', wordBreak: 'break-word' }}>{error.message}</p>
        )}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} style={{ padding: '10px 22px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }}>Try Again</button>
          <Link href="/agrisocial/explore" style={{ padding: '10px 22px', background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.88rem' }}>Explore Posts</Link>
          <Link href="/" style={{ padding: '10px 22px', background: '#eff6ff', color: '#2563eb', border: '1.5px solid #bfdbfe', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.88rem' }}>Go Home</Link>
        </div>
      </div>
    </div>
  )
}
