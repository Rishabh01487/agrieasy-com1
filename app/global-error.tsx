'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Global error boundary caught:', error)
  }, [error])

  return (
    <html>
      <body style={{
        margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: 'system-ui, sans-serif', background: '#faf7ff',
        color: '#1e1b4b'
      }}>
        <div style={{ textAlign: 'center', padding: '32px', maxWidth: '480px' }}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', background: '#fef2f2',
            border: '2px solid #fca5a5', margin: '0 auto 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem'
          }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', color: '#4c1d95' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#6b7280', marginBottom: '24px', lineHeight: 1.6 }}>
            An unexpected error occurred. Our team has been notified.
            Please try again.
          </p>
          <button
            onClick={reset}
            style={{
              padding: '12px 32px', background: '#6d28d9', color: '#fff',
              border: 'none', borderRadius: '12px', fontSize: '1rem',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  )
}