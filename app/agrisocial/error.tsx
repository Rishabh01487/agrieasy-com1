'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function AgriSocialError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('AgriSocial error:', error) }, [error])

  return (
    <div style={{ minHeight: '100vh', background: '#fffbf5', fontFamily: '"Inter","Segoe UI",sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '12px' }}>🌾</div>
        <h2 style={{ color: '#9a3412', fontWeight: 800, margin: '0 0 8px' }}>Something went wrong</h2>
        <p style={{ color: '#78716c', fontSize: '0.9rem', margin: '0 0 8px' }}>AgriSocial experienced an error loading the feed.</p>
        <p style={{ color: '#78716c', fontSize: '0.8rem', margin: '0 0 20px', fontFamily: 'monospace', wordBreak: 'break-word' }}>{error.message}</p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={reset} style={{ padding: '10px 22px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}>Try Again</button>
          <Link href="/agrisocial/explore" style={{ padding: '10px 22px', background: '#fff7ed', color: '#9a3412', border: '1.5px solid #fed7aa', borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }}>Explore Posts</Link>
          <Link href="/" style={{ padding: '10px 22px', background: '#fff7ed', color: '#9a3412', border: '1.5px solid #fed7aa', borderRadius: '10px', fontWeight: 700, textDecoration: 'none' }}>Go Home</Link>
        </div>
      </div>
    </div>
  )
}