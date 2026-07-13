import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      margin: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: "var(--font-poppins), 'Poppins', 'Segoe UI', system-ui, -apple-system, sans-serif",
      background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      color: '#0f172a',
    }}>
      <div style={{ textAlign: 'center', padding: '32px', maxWidth: 480 }}>
        <div style={{
          fontSize: '7rem',
          fontWeight: 900,
          lineHeight: 1,
          background: 'linear-gradient(135deg, #AC3B61 0%, #C05070 50%, #D47890 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          marginBottom: 8,
        }}>
          404
        </div>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 8px', color: '#0f172a' }}>
          Page not found
        </h1>
        <p style={{ color: '#64748b', marginBottom: 28, fontSize: '0.95rem', lineHeight: 1.5 }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Let&apos;s get you back on track.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/" style={{
            padding: '12px 28px',
            background: 'linear-gradient(135deg, #AC3B61 0%, #C05070 100%)',
            color: '#fff',
            borderRadius: 12,
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-block',
            boxShadow: '0 4px 14px rgba(37,99,235,0.25)',
          }}>
            🏠 Go Home
          </Link>
          <Link href="/agrisocial" style={{
            padding: '12px 28px',
            background: '#fff',
            color: '#AC3B61',
            border: '1.5px solid #bfdbfe',
            borderRadius: 12,
            fontWeight: 700,
            textDecoration: 'none',
            display: 'inline-block',
          }}>
            📱 AgriSocial
          </Link>
        </div>
      </div>
    </div>
  )
}
