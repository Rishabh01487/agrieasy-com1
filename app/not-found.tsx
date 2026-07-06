import Link from 'next/link'

export default function NotFound() {
  return (
    <div style={{
      margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', fontFamily: 'system-ui, sans-serif', background: '#faf7ff',
      color: '#1e1b4b'
    }}>
      <div style={{ textAlign: 'center', padding: '32px' }}>
        <div style={{ fontSize: '6rem', fontWeight: 900, color: '#c4b5fd', lineHeight: 1 }}>404</div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '16px 0 8px', color: '#4c1d95' }}>
          Page Not Found
        </h1>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/" style={{
          padding: '12px 32px', background: '#6d28d9', color: '#fff',
          borderRadius: '12px', fontWeight: 700, textDecoration: 'none',
          display: 'inline-block',
        }}>
          Go Home
        </Link>
      </div>
    </div>
  )
}