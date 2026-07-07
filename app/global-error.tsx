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
        margin: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
        background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
        color: '#0f172a',
      }}>
        <div style={{ textAlign: 'center', padding: '32px', maxWidth: 480 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: '#fef2f2',
            border: '2px solid #fca5a5',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.5rem',
          }}>⚠️</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0 0 8px', color: '#0f172a' }}>
            Something went wrong
          </h1>
          <p style={{ color: '#64748b', marginBottom: 24, lineHeight: 1.6, fontSize: '0.92rem' }}>
            An unexpected error occurred. Please try again — if the problem
            persists, check your connection or refresh the page.
          </p>
          {error.digest && (
            <p style={{ color: '#94a3b8', fontSize: '0.74rem', fontFamily: 'monospace', marginBottom: 16 }}>
              Error ID: {error.digest}
            </p>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
              }}
            >
              Try Again
            </button>
            <a
              href="/"
              style={{
                padding: '12px 28px',
                background: '#fff',
                color: '#2563eb',
                border: '1.5px solid #bfdbfe',
                borderRadius: 12,
                fontSize: '0.95rem',
                fontWeight: 700,
                textDecoration: 'none',
                display: 'inline-block',
              }}
            >
              Go Home
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}
