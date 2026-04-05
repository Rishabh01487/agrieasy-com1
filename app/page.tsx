import Link from 'next/link'

const C = {
  bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
  brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280', border: '#ddd6fe',
}

export default function Home() {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
      {/* Decorative blobs */}
      <div style={{ position: 'fixed', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(109,40,217,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-80px', left: '-80px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(196,181,253,0.2) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '680px', width: '100%' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '28px' }}>
          <img src="/icons/icon-192.png" alt="AgriEasy Logo" style={{ width: '64px', height: '64px', borderRadius: '16px', boxShadow: '0 4px 16px rgba(109,40,217,0.2)' }} />
        </div>

        {/* Badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: C.brLight, border: `1px solid ${C.brMid}`, borderRadius: '100px', padding: '6px 18px', marginBottom: '20px' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.brinjal, display: 'inline-block' }} />
          <span style={{ color: C.brinjal, fontSize: '0.82rem', fontWeight: 700, letterSpacing: '0.04em' }}>India&apos;s Agricultural Marketplace</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 'clamp(2.4rem, 7vw, 3.8rem)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 16px', color: C.brDark }}>
          Agri<span style={{ color: C.brinjal }}>Easy</span><span style={{ color: C.brMid }}>.com</span>
        </h1>

        {/* Taglines */}
        <p style={{ color: C.text, fontSize: '1.05rem', marginBottom: '6px', fontWeight: 500 }}>
          Connecting Farmers Directly with Buyers for seamless agricultural trade
        </p>
        <p style={{ color: C.brinjal, fontSize: '0.95rem', marginBottom: '40px', fontWeight: 600 }}>
          End-to-end connectivity for seamless agricultural trade
        </p>

        {/* Role Cards */}
        <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '28px' }}>
          {[
            { href: '/auth/login?role=farmer', icon: '🌾', label: 'Farmer Login', sub: 'Sell your produce', border: C.brinjal, bg: C.brLight, dark: false },
            { href: '/auth/login?role=buyer', icon: '🛒', label: 'Buyer Login', sub: 'Source fresh crops', border: C.brMid, bg: '#f5f3ff', dark: false },
            { href: '/auth/login?role=transporter', icon: '🚛', label: 'Transporter', sub: 'Deliver goods', border: '#a78bfa', bg: '#f5f3ff', dark: false },
          ].map(c => (
            <Link key={c.label} href={c.href} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
              background: c.bg, border: `1.5px solid ${c.border}`,
              borderRadius: '16px', padding: '20px 28px', color: C.text, textDecoration: 'none',
              minWidth: '155px', boxShadow: '0 2px 8px rgba(109,40,217,0.08)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}>
              <span style={{ fontSize: '2rem' }}>{c.icon}</span>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: C.brDark }}>{c.label}</span>
              <span style={{ fontSize: '0.78rem', color: C.muted }}>{c.sub}</span>
            </Link>
          ))}
          {/* AgriPay Card */}
          <Link href="/agripay" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            background: 'linear-gradient(135deg, #4c1d95, #7c3aed)',
            border: '1.5px solid #7c3aed',
            borderRadius: '16px', padding: '20px 28px', color: '#fff', textDecoration: 'none',
            minWidth: '155px', boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 900, lineHeight: 1, background: 'linear-gradient(135deg, #fde68a, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>₹</span>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#fff' }}>AgriPay</span>
            <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)' }}>Pay & Transfer</span>
          </Link>
          {/* AgriSocial Card */}
          <Link href="/agrisocial" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            background: '#fff', border: '1.5px solid #fed7aa',
            borderRadius: '16px', padding: '20px 28px', color: '#1c1917', textDecoration: 'none',
            minWidth: '155px', boxShadow: '0 4px 20px rgba(234,88,12,0.14)',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}>
            <span style={{ fontSize: '2rem' }}>📱</span>
            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#9a3412' }}>AgriSocial</span>
            <span style={{ fontSize: '0.78rem', color: '#78716c' }}>Feed & KrishiClips</span>
          </Link>
        </div>

        {/* JAI JAWAN JAI KISAN */}
        <div style={{ margin: '24px 0 20px', padding: '18px 24px', background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '14px', textAlign: 'center', boxShadow: '0 1px 6px rgba(109,40,217,0.06)' }}>
          <p style={{
            fontSize: 'clamp(1.1rem, 3vw, 1.55rem)', fontWeight: 900, letterSpacing: '0.12em',
            background: 'linear-gradient(90deg, #f59e0b, #d97706)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            margin: 0, textTransform: 'uppercase',
          }}>
            &quot;JAI JAWAN, JAI KISAN&quot;
          </p>
          <p style={{ color: C.muted, fontSize: '0.8rem', marginTop: '6px', letterSpacing: '0.03em' }}>
            — <span style={{ color: C.text, fontWeight: 700 }}>Lal Bahadur Shastri</span>, 2nd Prime Minister of India
          </p>
        </div>

        {/* Register link */}
        <Link href="/auth/register" style={{ color: C.muted, fontSize: '0.9rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          New here?{' '}
          <span style={{ color: C.brinjal, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: '3px' }}>Create an account →</span>
        </Link>
      </div>
    </div >
  )
}
