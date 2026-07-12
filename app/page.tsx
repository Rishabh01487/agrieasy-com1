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
      {/* Animated background blobs */}
      <div aria-hidden style={{ ...blobStyle, top: '-15%', right: '-8%', width: 560, height: 560, background: 'radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 70%)', animation: 'float1 14s ease-in-out infinite' }} />
      <div aria-hidden style={{ ...blobStyle, bottom: '-18%', left: '-10%', width: 520, height: 520, background: 'radial-gradient(circle, rgba(96,165,250,0.25) 0%, transparent 70%)', animation: 'float2 18s ease-in-out infinite' }} />

      {/* Dotted grid */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, backgroundImage: 'radial-gradient(rgba(255,255,255,0.04) 1px, transparent 1px)', backgroundSize: '34px 34px', maskImage: 'radial-gradient(ellipse 70% 60% at 50% 38%, black 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 60% at 50% 38%, black 20%, transparent 75%)' }} />

      <div className="fade-up" style={contentStyle}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <div style={logoWrapStyle}>
            <img src="/icons/icon-192.png" alt="AgriEasy logo" width={54} height={54} style={{ borderRadius: 14 }} />
          </div>
        </div>

        {/* Badge */}
        <div style={badgeStyle}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#60a5fa', display: 'inline-block', animation: 'pulse-dot 2.2s ease-in-out infinite' }} />
          <span style={badgeTextStyle}>India&apos;s Agricultural Marketplace</span>
        </div>

        {/* Hero title */}
        <h1 className="hero-title" style={{
          fontSize: 'clamp(2.8rem, 9vw, 5rem)',
          fontWeight: 800, lineHeight: 1, letterSpacing: '-0.04em', margin: '0 0 18px',
          background: 'linear-gradient(110deg, #ffffff 18%, #dbeafe 38%, #93c5fd 50%, #dbeafe 62%, #ffffff 82%)',
          backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text',
          WebkitTextFillColor: 'transparent', color: 'transparent',
          textShadow: '0 0 90px rgba(96,165,250,0.3)',
          animation: 'shimmer 7s linear infinite',
        }}>
          AgriEasy
        </h1>

        {/* Taglines */}
        <p style={taglineStyle}>Connecting farmers directly with buyers</p>
        <p style={subTaglineStyle}>End-to-end agricultural trade · Social network · Wallet · Logistics</p>

        {/* Feature pills */}
        <div style={featureRowStyle}>
          {FEATURES.map((f) => (
            <span key={f} style={featurePillStyle}>
              <span style={{ color: '#60a5fa', fontWeight: 700 }}>✓</span> {f}
            </span>
          ))}
        </div>

        {/* Role cards — primary CTAs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16, maxWidth: 600, width: '100%' }}>
          {ROLE_CARDS.map((c, i) => (
            <Link key={c.title} href={c.href} className="role-card fade-up" style={{ ...roleCardStyle(c.color), animationDelay: `${0.15 + i * 0.08}s` }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>{c.emoji}</div>
              <p style={{ color: '#fff', fontWeight: 800, fontSize: '1rem', margin: 0 }}>{c.title}</p>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.74rem', margin: '4px 0 0' }}>{c.sub}</p>
            </Link>
          ))}
        </div>

        {/* Feature cards — secondary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 32, maxWidth: 600, width: '100%' }}>
          {FEATURE_CARDS.map((c, i) => (
            <Link key={c.title} href={c.href} className="feature-card fade-up" style={{ ...featureCardStyle(c.color), animationDelay: `${0.35 + i * 0.08}s` }}>
              <div style={{ fontSize: '1.5rem', marginBottom: 4 }}>{c.emoji}</div>
              <p style={{ color: '#fff', fontWeight: 700, fontSize: '0.86rem', margin: 0 }}>{c.title}</p>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.68rem', margin: '2px 0 0' }}>{c.sub}</p>
            </Link>
          ))}
        </div>

        {/* Quote */}
        <div className="fade-up" style={{ ...quoteBoxStyle, animationDelay: '0.6s' }}>
          <p style={{
            fontSize: 'clamp(1rem, 3vw, 1.35rem)', fontWeight: 800, letterSpacing: '0.12em',
            margin: 0, textTransform: 'uppercase',
            background: 'linear-gradient(90deg, #fcd34d, #fbbf24, #f59e0b, #fbbf24, #fcd34d)',
            backgroundSize: '200% auto', WebkitBackgroundClip: 'text', backgroundClip: 'text',
            WebkitTextFillColor: 'transparent', color: 'transparent',
            animation: 'shimmer 5s linear infinite',
          }}>
            &ldquo;Jai Jawan, Jai Kisan&rdquo;
          </p>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.78rem', marginTop: 8, letterSpacing: '0.03em' }}>
            — Lal Bahadur Shastri, 2nd Prime Minister of India
          </p>
        </div>

        {/* CTA */}
        <Link href="/auth/register" className="cta-pill fade-up" style={{ ...ctaStyle, animationDelay: '0.75s' }}>
          New here? <span style={{ fontWeight: 800 }}>Create an account</span> →
        </Link>

        {/* Footer */}
        <p className="fade-up" style={{ ...footerStyle, animationDelay: '0.85s' }}>
          Trusted by farmers, buyers &amp; transporters across India 🇮🇳
        </p>
      </div>

      <style>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-40px,35px) scale(1.12); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(45px,-30px) scale(1.15); } }
        @keyframes pulse-dot { 0%,100% { opacity: 1; box-shadow: 0 0 0 0 rgba(96,165,250,0.55); } 50% { opacity: 0.65; box-shadow: 0 0 0 7px rgba(96,165,250,0); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes shine { 0% { transform: translateX(-160%) skewX(-20deg); } 100% { transform: translateX(280%) skewX(-20deg); } }
        .fade-up { animation: fadeUp 0.8s cubic-bezier(.2,.8,.2,1) both; }

        .role-card {
          transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s, border-color .3s;
          will-change: transform; position: relative; overflow: hidden;
          text-decoration: none; display: flex; flex-direction: column; align-items: center;
          padding: 24px 12px; border-radius: 18px; text-align: center;
        }
        .role-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 20px 50px rgba(2,6,23,0.4), 0 0 40px var(--card-glow, rgba(59,130,246,0.3));
        }
        .role-card::after {
          content: ''; position: absolute; top: 0; left: 0; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
          transform: translateX(-160%) skewX(-20deg); pointer-events: none;
        }
        .role-card:hover::after { animation: shine 0.9s ease-out; }

        .feature-card {
          transition: transform .3s, background .25s;
          text-decoration: none; display: flex; flex-direction: column; align-items: center;
          padding: 16px 10px; border-radius: 14px; text-align: center;
        }
        .feature-card:hover { transform: translateY(-4px); background: rgba(255,255,255,0.12) !important; }

        .cta-pill { transition: transform .3s ease, box-shadow .3s ease; }
        .cta-pill:hover {
          transform: translateY(-3px);
          background: linear-gradient(135deg, rgba(59,130,246,0.55), rgba(37,99,235,0.42)) !important;
          box-shadow: 0 14px 38px rgba(37,99,235,0.55) !important;
        }

        @media (max-width: 480px) {
          .role-card { padding: 18px 8px !important; }
          .feature-card { padding: 12px 6px !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .hero-title, .fade-up { animation: none !important; }
          .role-card, .feature-card, .cta-pill { transition: none !important; }
        }
      `}</style>
    </main>
  )
}

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: 'radial-gradient(ellipse 100% 70% at 50% 0%, rgba(37,99,235,0.3) 0%, transparent 60%), linear-gradient(160deg, #020617 0%, #0b1227 38%, #0f1e4d 72%, #1e3a8a 100%)',
  fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
  padding: '48px 20px', position: 'relative', overflow: 'hidden',
}

const blobStyle: CSSProperties = {
  position: 'fixed', borderRadius: '50%', filter: 'blur(70px)', pointerEvents: 'none', zIndex: 0,
}

const contentStyle: CSSProperties = {
  position: 'relative', zIndex: 2, textAlign: 'center', maxWidth: 780, width: '100%',
  display: 'flex', flexDirection: 'column', alignItems: 'center',
}

const logoWrapStyle: CSSProperties = {
  width: 86, height: 86, borderRadius: 24,
  background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06))',
  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.28)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  boxShadow: '0 14px 44px rgba(2,6,23,0.45), inset 0 1px 0 rgba(255,255,255,0.35), 0 0 70px rgba(59,130,246,0.3)',
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 10,
  background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.15)', borderRadius: 100, padding: '8px 22px', marginBottom: 24,
  boxShadow: '0 4px 20px rgba(2,6,23,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
}

const badgeTextStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.92)', fontSize: '0.74rem', fontWeight: 600,
  letterSpacing: '0.12em', textTransform: 'uppercase',
}

const taglineStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.88)', fontSize: 'clamp(1.05rem, 2.4vw, 1.3rem)', margin: '0 0 6px', fontWeight: 400,
}

const subTaglineStyle: CSSProperties = {
  color: 'rgba(147,197,253,0.85)', fontSize: '0.9rem', marginBottom: 28, fontWeight: 500,
}

const featureRowStyle: CSSProperties = {
  display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginBottom: 32,
}

const featurePillStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 100,
  background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
  color: 'rgba(255,255,255,0.78)', fontSize: '0.74rem', fontWeight: 500,
}

const roleCardStyle = (color: string): CSSProperties => ({
  background: `linear-gradient(135deg, ${color}22, ${color}08)`,
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${color}40`,
  boxShadow: `0 10px 30px rgba(2,6,23,0.3), inset 0 1px 0 rgba(255,255,255,0.15)`,
})

function featureCardStyle(color: string): CSSProperties {
  return {
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 6px 20px rgba(2,6,23,0.2)',
  }
}

const quoteBoxStyle: CSSProperties = {
  margin: '0 auto 24px', padding: '20px 30px', maxWidth: 480,
  background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16,
  boxShadow: '0 12px 40px rgba(2,6,23,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
  textAlign: 'center',
}

const ctaStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 30px',
  background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(37,99,235,0.3))',
  backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(147,197,253,0.35)', borderRadius: 100,
  textDecoration: 'none', color: '#fff', fontSize: '0.95rem', fontWeight: 600,
  boxShadow: '0 8px 28px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
}

const footerStyle: CSSProperties = {
  marginTop: 28, color: 'rgba(255,255,255,0.38)', fontSize: '0.72rem', letterSpacing: '0.05em',
}
