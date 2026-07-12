import Link from 'next/link'
import type { CSSProperties } from 'react'

type Card = {
  href: string
  emoji: string
  title: string
  sub: string
  color: string
}

const ROLE_CARDS: Card[] = [
  { href: '/auth/login?role=farmer', emoji: '🌾', title: 'Farmer', sub: 'Sell your produce', color: '#10b981' },
  { href: '/auth/login?role=buyer', emoji: '🛒', title: 'Buyer', sub: 'Source fresh crops', color: '#3b82f6' },
  { href: '/auth/login?role=transporter', emoji: '🚛', title: 'Transporter', sub: 'Deliver goods', color: '#f59e0b' },
]

const FEATURE_CARDS: Card[] = [
  { href: '/agripay', emoji: '💳', title: 'AgriPay', sub: 'Pay & transfer', color: '#8b5cf6' },
  { href: '/agrisocial', emoji: '📱', title: 'AgriSocial', sub: 'Feed & reels', color: '#ec4899' },
  { href: '/ledger', emoji: '📒', title: 'Ledger', sub: 'Bills & earnings', color: '#06b6d4' },
]

const FEATURES = ['Zero middlemen', 'Instant UPI payments', 'Real-time tracking', 'Live GPS tracking']

export default function Home() {
  return (
    <main style={pageStyle}>
      {/* Background blobs */}
      <div aria-hidden style={{ position: 'fixed', top: '-15%', right: '-8%', width: 560, height: 560, borderRadius: '50%', filter: 'blur(70px)', background: 'radial-gradient(circle, rgba(59,130,246,0.3) 0%, transparent 70%)', animation: 'float1 14s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />
      <div aria-hidden style={{ position: 'fixed', bottom: '-18%', left: '-10%', width: 520, height: 520, borderRadius: '50%', filter: 'blur(70px)', background: 'radial-gradient(circle, rgba(96,165,250,0.2) 0%, transparent 70%)', animation: 'float2 18s ease-in-out infinite', pointerEvents: 'none', zIndex: 0 }} />

      {/* Dotted grid */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '34px 34px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 38%, black 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 38%, black 20%, transparent 75%)' }} />

      <div className="fade-up" style={contentStyle}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
          <div style={{
            width: 80, height: 80, borderRadius: 22,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.04))',
            backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 12px 40px rgba(2,6,23,0.4), 0 0 50px rgba(59,130,246,0.2)',
          }}>
            <img src="/icons/icon-192.png" alt="AgriEasy" width={48} height={48} style={{ borderRadius: 12 }} />
          </div>
        </div>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 100, padding: '6px 18px', marginBottom: 20,
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.7rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            India&apos;s Agricultural Marketplace
          </span>
        </div>

        {/* Title */}
        <h1 className="hero-title" style={{
          fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
          fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', margin: '0 0 14px',
          background: 'linear-gradient(110deg, #ffffff 18%, #dbeafe 38%, #93c5fd 50%, #dbeafe 62%, #ffffff 82%)',
          backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text',
          WebkitTextFillColor: 'transparent', color: 'transparent',
          animation: 'shimmer 7s linear infinite',
        }}>
          AgriEasy
        </h1>

        {/* Taglines */}
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 'clamp(1rem, 2.2vw, 1.2rem)', margin: '0 0 4px', fontWeight: 400 }}>
          Connecting farmers directly with buyers
        </p>
        <p style={{ color: 'rgba(147,197,253,0.7)', fontSize: '0.85rem', margin: '0 0 24px', fontWeight: 500 }}>
          End-to-end agricultural trade · Social network · Wallet · Logistics
        </p>

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
          {FEATURES.map((f) => (
            <span key={f} style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 100,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)', fontSize: '0.72rem', fontWeight: 500,
            }}>
              <span style={{ color: '#60a5fa' }}>✓</span> {f}
            </span>
          ))}
        </div>

        {/* Role cards — primary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 10, maxWidth: 560, width: '100%' }}>
          {ROLE_CARDS.map((c, i) => (
            <Link key={c.title} href={c.href} className="home-card fade-up" style={{
              background: 'rgba(255,255,255,0.05)',
              backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 16, padding: '20px 10px', textAlign: 'center',
              textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center',
              transition: 'transform .3s, background .25s, border-color .25s',
              animationDelay: `${0.1 + i * 0.06}s`,
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 12, marginBottom: 8,
                background: `${c.color}18`, border: `1px solid ${c.color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem',
              }}>{c.emoji}</div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '0.92rem', margin: 0 }}>{c.title}</p>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.7rem', margin: '3px 0 0' }}>{c.sub}</p>
            </Link>
          ))}
        </div>

        {/* Feature cards — secondary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 28, maxWidth: 560, width: '100%' }}>
          {FEATURE_CARDS.map((c, i) => (
            <Link key={c.title} href={c.href} className="home-card-sm fade-up" style={{
              background: 'rgba(255,255,255,0.025)',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 12, padding: '14px 8px', textAlign: 'center',
              textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center',
              transition: 'transform .3s, background .2s',
              animationDelay: `${0.28 + i * 0.06}s`,
            }}>
              <div style={{ fontSize: '1.2rem', marginBottom: 4 }}>{c.emoji}</div>
              <p style={{ color: 'rgba(255,255,255,0.85)', fontWeight: 700, fontSize: '0.78rem', margin: 0 }}>{c.title}</p>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.64rem', margin: '2px 0 0' }}>{c.sub}</p>
            </Link>
          ))}
        </div>

        {/* Quote */}
        <div className="fade-up" style={{
          margin: '0 auto 22px', padding: '16px 28px', maxWidth: 440,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 14, textAlign: 'center', animationDelay: '0.45s',
        }}>
          <p style={{
            fontSize: 'clamp(0.95rem, 2.5vw, 1.2rem)', fontWeight: 800, letterSpacing: '0.1em',
            margin: 0, textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #fcd34d, #fbbf24, #f59e0b, #fbbf24, #fcd34d)',
            backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent', color: 'transparent',
            animation: 'shimmer 5s linear infinite',
          }}>
            &ldquo;Jai Jawan, Jai Kisan&rdquo;
          </p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', margin: '6px 0 0' }}>
            — Lal Bahadur Shastri, 2nd Prime Minister of India
          </p>
        </div>

        {/* CTA */}
        <Link href="/auth/register" className="home-cta fade-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.35), rgba(37,99,235,0.25))',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(147,197,253,0.25)', borderRadius: 100,
          textDecoration: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 600,
          boxShadow: '0 6px 24px rgba(37,99,235,0.3)',
          transition: 'transform .3s, box-shadow .3s',
          animationDelay: '0.55s',
        }}>
          New here? <span style={{ fontWeight: 800 }}>Create an account</span> →
        </Link>

        {/* Footer */}
        <p className="fade-up" style={{ marginTop: 22, color: 'rgba(255,255,255,0.3)', fontSize: '0.7rem', animationDelay: '0.65s' }}>
          Trusted by farmers, buyers &amp; transporters across India 🇮🇳
        </p>
      </div>

      <style>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,25px) scale(1.1); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(35px,-25px) scale(1.12); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shine { 0% { transform: translateX(-160%) skewX(-20deg); } 100% { transform: translateX(280%) skewX(-20deg); } }
        .fade-up { animation: fadeUp 0.7s cubic-bezier(.2,.8,.2,1) both; }

        .home-card::after {
          content: ''; position: absolute; top: 0; left: 0; width: 50%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
          transform: translateX(-160%) skewX(-20deg); pointer-events: none;
        }
        .home-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.1) !important;
          border-color: rgba(147,197,253,0.3) !important;
          box-shadow: 0 16px 40px rgba(2,6,23,0.35) !important;
        }
        .home-card:hover::after { animation: shine 0.8s ease-out; }

        .home-card-sm:hover {
          transform: translateY(-3px);
          background: rgba(255,255,255,0.07) !important;
        }

        .home-cta:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(37,99,235,0.45) !important;
        }

        @media (max-width: 480px) {
          .home-card { padding: 16px 6px !important; }
          .home-card-sm { padding: 10px 4px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-title, .fade-up { animation: none !important; }
          .home-card, .home-card-sm, .home-cta { transition: none !important; }
        }
      `}</style>
    </main>
  )
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse 100% 60% at 50% 0%, rgba(37,99,235,0.25) 0%, transparent 60%), linear-gradient(160deg, #020617 0%, #0b1227 35%, #0f1e4d 65%, #1e3a8a 100%)',
  fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '40px 16px', position: 'relative', overflow: 'hidden',
}

const contentStyle: CSSProperties = {
  position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 720, width: '100%',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
}
