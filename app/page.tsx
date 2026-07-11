import Link from 'next/link'
import type { CSSProperties } from 'react'

type Card = {
  href: string
  emoji: string
  title: string
  sub: string
  featured?: boolean
}

const CARDS: Card[] = [
  { href: '/auth/login?role=farmer', emoji: '🌾', title: 'Farmer', sub: 'Sell your produce' },
  { href: '/auth/login?role=buyer', emoji: '🛒', title: 'Buyer', sub: 'Source fresh crops' },
  { href: '/auth/login?role=transporter', emoji: '🚛', title: 'Transporter', sub: 'Deliver goods' },
  { href: '/agripay', emoji: '₹', title: 'AgriPay', sub: 'Pay & transfer', featured: true },
  { href: '/agrisocial', emoji: '📱', title: 'AgriSocial', sub: 'Feed & reels' },
  { href: '/ledger', emoji: '📒', title: 'Ledger', sub: 'Bills & earnings' },
]

const FEATURES = ['Zero middlemen', 'Instant UPI payments', 'Real-time tracking']

export default function Home() {
  return (
    <main style={pageStyle}>
      {/* ── Animated gradient blobs ─────────────────────────────── */}
      <div aria-hidden style={{ ...blobStyle, top: '-15%', right: '-8%', width: 560, height: 560, background: 'radial-gradient(circle, rgba(59,130,246,0.45) 0%, rgba(37,99,235,0.15) 40%, transparent 70%)', animation: 'float1 14s ease-in-out infinite' }} />
      <div aria-hidden style={{ ...blobStyle, bottom: '-18%', left: '-10%', width: 520, height: 520, background: 'radial-gradient(circle, rgba(96,165,250,0.40) 0%, rgba(59,130,246,0.12) 40%, transparent 70%)', animation: 'float2 18s ease-in-out infinite' }} />
      <div aria-hidden style={{ ...blobStyle, top: '38%', left: '50%', width: 380, height: 380, background: 'radial-gradient(circle, rgba(147,197,253,0.28) 0%, transparent 65%)', animation: 'float3 22s ease-in-out infinite' }} />

      {/* ── Subtle dotted grid texture (Linear-style) ───────────── */}
      <div aria-hidden className="bg-grid" />

      {/* ── Top vignette for depth ──────────────────────────────── */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1, background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(37,99,235,0.18), transparent 70%)' }} />

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="fade-up" style={contentStyle}>
        {/* Logo — glass circle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <div style={logoWrapStyle}>
            <img
              src="/icons/icon-192.png"
              alt="AgriEasy logo"
              width={54}
              height={54}
              style={{ borderRadius: 14 }}
            />
          </div>
        </div>

        {/* Badge — glass pill */}
        <div style={badgeStyle}>
          <span className="pulse-dot" style={dotStyle} />
          <span style={badgeTextStyle}>India&apos;s Agricultural Marketplace</span>
        </div>

        {/* Hero title — gradient shimmer */}
        <h1
          className="hero-title"
          style={{
            fontSize: 'clamp(3rem, 9vw, 5.5rem)',
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '-0.04em',
            margin: '0 0 22px',
            background: 'linear-gradient(110deg, #ffffff 18%, #dbeafe 38%, #93c5fd 50%, #dbeafe 62%, #ffffff 82%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
            textShadow: '0 0 90px rgba(96,165,250,0.35)',
          }}
        >
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

        {/* Glass cards grid */}
        <div className="cards-grid" style={{ marginBottom: 38 }}>
          {CARDS.map((c, i) => (
            <Link
              key={c.title}
              href={c.href}
              className="glass-card fade-up"
              style={{
                ...cardStyle(c.featured),
                animationDelay: `${0.15 + i * 0.07}s`,
              }}
            >
              <span className="card-arrow" style={arrowStyle}>↗</span>
              <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <span className="card-icon" style={iconCircleStyle}>{c.emoji}</span>
                <span style={cardTitleStyle}>{c.title}</span>
                <span style={cardSubStyle}>{c.sub}</span>
              </div>
            </Link>
          ))}
        </div>

        {/* Jai Kisan — glass box with gold gradient text */}
        <div className="fade-up" style={{ ...quoteBoxStyle, animationDelay: '0.75s' }}>
          <p
            className="gold-text"
            style={{
              fontSize: 'clamp(1.05rem, 3vw, 1.45rem)',
              fontWeight: 800,
              letterSpacing: '0.12em',
              margin: 0,
              textTransform: 'uppercase',
              background: 'linear-gradient(90deg, #fcd34d, #fbbf24, #f59e0b, #fbbf24, #fcd34d)',
              backgroundSize: '200% auto',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            &ldquo;Jai Jawan, Jai Kisan&rdquo;
          </p>
          <p style={quoteAuthorStyle}>— Lal Bahadur Shastri, 2nd Prime Minister of India</p>
        </div>

        {/* Register CTA — glass pill */}
        <Link href="/auth/register" className="cta-pill fade-up" style={{ ...ctaStyle, animationDelay: '0.9s' }}>
          New here? <span style={{ fontWeight: 800 }}>Create an account</span> <span aria-hidden>→</span>
        </Link>

        {/* Footer note */}
        <p className="fade-up" style={{ ...footerStyle, animationDelay: '1s' }}>
          Trusted by farmers, buyers &amp; transporters across India 🇮🇳
        </p>
      </div>

      {/* ── Animations & hover ──────────────────────────────────── */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(-40px, 35px) scale(1.12); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50%      { transform: translate(45px, -30px) scale(1.15); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50%      { transform: translate(-50%, -40px) scale(0.88); }
        }
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 0 rgba(96,165,250,0.55); }
          50%      { opacity: 0.65; box-shadow: 0 0 0 7px rgba(96,165,250,0); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes shine {
          0%   { transform: translateX(-160%) skewX(-20deg); }
          100% { transform: translateX(280%) skewX(-20deg); }
        }

        .bg-grid {
          position: fixed; inset: 0; pointer-events: none; z-index: 1;
          background-image: radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px);
          background-size: 34px 34px;
          -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 38%, black 20%, transparent 75%);
          mask-image: radial-gradient(ellipse 70% 60% at 50% 38%, black 20%, transparent 75%);
        }

        .hero-title { animation: shimmer 7s linear infinite; }
        .gold-text  { animation: shimmer 5s linear infinite; }
        .pulse-dot  { animation: pulse-dot 2.2s ease-in-out infinite; }

        .fade-up { animation: fadeUp 0.8s cubic-bezier(.2,.8,.2,1) both; }

        /* Responsive grid: 2 / 3 / 6 columns */
        .cards-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }
        @media (min-width: 640px) {
          .cards-grid { grid-template-columns: repeat(3, 1fr); gap: 14px; }
        }
        @media (min-width: 1024px) {
          .cards-grid { grid-template-columns: repeat(6, 1fr); gap: 14px; }
        }

        /* Glass cards — gradient border + hover shine sweep */
        .glass-card {
          transition: transform .4s cubic-bezier(.2,.8,.2,1),
                      background .35s, box-shadow .4s, border-color .35s;
          will-change: transform;
        }
        .glass-card::before {
          content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.45), rgba(255,255,255,0.04) 45%, rgba(147,197,253,0.2));
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
                  mask-composite: exclude;
          pointer-events: none; z-index: 3;
        }
        .glass-card::after {
          content: ''; position: absolute; top: 0; left: 0; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent);
          transform: translateX(-160%) skewX(-20deg);
          pointer-events: none; z-index: 1;
        }
        .glass-card:hover {
          transform: translateY(-7px);
          background: rgba(255,255,255,0.14) !important;
          border-color: rgba(147,197,253,0.45) !important;
          box-shadow: 0 22px 55px rgba(2,6,23,0.5),
                      0 0 50px rgba(59,130,246,0.3),
                      inset 0 1px 0 rgba(255,255,255,0.25) !important;
        }
        .glass-card:hover::after { animation: shine 0.95s ease-out; }
        .glass-card:hover .card-icon { transform: scale(1.1) rotate(-3deg); }
        .glass-card:hover .card-arrow { opacity: 1; transform: translate(2px, -2px); }

        .card-icon  { transition: transform .4s cubic-bezier(.2,.8,.2,1); }
        .card-arrow { opacity: 0; transition: all .4s cubic-bezier(.2,.8,.2,1); }

        /* Register CTA — distinct hover */
        .cta-pill { transition: transform .3s ease, box-shadow .3s ease, background .3s ease; }
        .cta-pill:hover {
          transform: translateY(-3px);
          background: linear-gradient(135deg, rgba(59,130,246,0.55), rgba(37,99,235,0.42)) !important;
          box-shadow: 0 14px 38px rgba(37,99,235,0.55),
                      inset 0 1px 0 rgba(255,255,255,0.3) !important;
        }

        /* Respect reduced-motion preferences */
        @media (prefers-reduced-motion: reduce) {
          .hero-title, .gold-text, .pulse-dot, .fade-up { animation: none !important; }
          .glass-card, .card-icon, .card-arrow, .cta-pill { transition: none !important; }
        }
      `}</style>
    </main>
  )
}

/* ── Style objects ──────────────────────────────────────────────── */

const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background:
    'radial-gradient(ellipse 100% 70% at 50% 0%, rgba(37,99,235,0.35) 0%, transparent 60%), linear-gradient(160deg, #020617 0%, #0b1227 38%, #0f1e4d 72%, #1e3a8a 100%)',
  fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '52px 20px',
  position: 'relative',
  overflow: 'hidden',
}

const blobStyle: CSSProperties = {
  position: 'fixed',
  borderRadius: '50%',
  filter: 'blur(70px)',
  pointerEvents: 'none',
  zIndex: 0,
}

const contentStyle: CSSProperties = {
  position: 'relative',
  zIndex: 2,
  textAlign: 'center',
  maxWidth: 780,
  width: '100%',
}

const logoWrapStyle: CSSProperties = {
  width: 86,
  height: 86,
  borderRadius: 24,
  background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.06))',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.28)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow:
    '0 14px 44px rgba(2,6,23,0.45), inset 0 1px 0 rgba(255,255,255,0.35), 0 0 70px rgba(59,130,246,0.3)',
}

const badgeStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  background: 'rgba(255,255,255,0.07)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 100,
  padding: '8px 22px',
  marginBottom: 24,
  boxShadow: '0 4px 20px rgba(2,6,23,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
}

const dotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: '#60a5fa',
  display: 'inline-block',
}

const badgeTextStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.92)',
  fontSize: '0.74rem',
  fontWeight: 600,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
}

const taglineStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.88)',
  fontSize: 'clamp(1.05rem, 2.4vw, 1.3rem)',
  margin: '0 0 6px',
  fontWeight: 400,
}

const subTaglineStyle: CSSProperties = {
  color: 'rgba(147,197,253,0.85)',
  fontSize: '0.9rem',
  marginBottom: 30,
  fontWeight: 500,
  letterSpacing: '0.01em',
}

const featureRowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  justifyContent: 'center',
  gap: 8,
  marginBottom: 38,
}

const featurePillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '6px 14px',
  borderRadius: 100,
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  backdropFilter: 'blur(12px)',
  WebkitBackdropFilter: 'blur(12px)',
  color: 'rgba(255,255,255,0.78)',
  fontSize: '0.74rem',
  fontWeight: 500,
}

const cardStyle = (featured?: boolean): CSSProperties => ({
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '26px 14px',
  textDecoration: 'none',
  background: featured ? 'rgba(37,99,235,0.22)' : 'rgba(255,255,255,0.06)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: featured ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(255,255,255,0.1)',
  borderRadius: 20,
  boxShadow: featured
    ? '0 12px 36px rgba(37,99,235,0.32), inset 0 1px 0 rgba(255,255,255,0.22)'
    : '0 8px 28px rgba(2,6,23,0.28), inset 0 1px 0 rgba(255,255,255,0.12)',
})

const iconCircleStyle: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 16,
  background: 'linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0.05))',
  border: '1px solid rgba(255,255,255,0.2)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '1.6rem',
  fontWeight: 800,
  color: '#fff',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.28)',
}

const cardTitleStyle: CSSProperties = {
  color: '#fff',
  fontWeight: 700,
  fontSize: '0.92rem',
  letterSpacing: '0.01em',
}

const cardSubStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.58)',
  fontSize: '0.72rem',
}

const arrowStyle: CSSProperties = {
  position: 'absolute',
  top: 14,
  right: 16,
  color: 'rgba(147,197,253,0.95)',
  fontSize: '0.9rem',
  fontWeight: 700,
  zIndex: 2,
}

const quoteBoxStyle: CSSProperties = {
  margin: '0 auto 26px',
  padding: '22px 32px',
  maxWidth: 520,
  background: 'rgba(255,255,255,0.05)',
  backdropFilter: 'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  boxShadow: '0 12px 40px rgba(2,6,23,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
  textAlign: 'center',
}

const quoteAuthorStyle: CSSProperties = {
  color: 'rgba(255,255,255,0.45)',
  fontSize: '0.74rem',
  marginTop: 8,
  letterSpacing: '0.03em',
}

const ctaStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '14px 30px',
  background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(37,99,235,0.3))',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid rgba(147,197,253,0.35)',
  borderRadius: 100,
  textDecoration: 'none',
  color: '#fff',
  fontSize: '0.95rem',
  fontWeight: 600,
  letterSpacing: '0.01em',
  boxShadow: '0 8px 28px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
}

const footerStyle: CSSProperties = {
  marginTop: 30,
  color: 'rgba(255,255,255,0.38)',
  fontSize: '0.72rem',
  letterSpacing: '0.05em',
}
