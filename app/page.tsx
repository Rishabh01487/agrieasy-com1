import Link from 'next/link'

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 30%, #2563eb 60%, #3b82f6 100%)',
      fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '32px 24px', position: 'relative', overflow: 'hidden',
    }}>
      {/* Animated gradient blobs */}
      <div style={{
        position: 'fixed', top: '-10%', right: '-5%', width: '500px', height: '500px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none', animation: 'float1 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', bottom: '-10%', left: '-5%', width: '450px', height: '450px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(96,165,250,0.35) 0%, transparent 70%)',
        filter: 'blur(60px)', pointerEvents: 'none', animation: 'float2 10s ease-in-out infinite',
      }} />
      <div style={{
        position: 'fixed', top: '40%', left: '50%', width: '300px', height: '300px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(147,197,253,0.2) 0%, transparent 70%)',
        filter: 'blur(40px)', pointerEvents: 'none', animation: 'float3 12s ease-in-out infinite',
      }} />

      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: '720px', width: '100%' }}>
        {/* Logo — glassmorphism circle */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px', marginBottom: '24px',
        }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: 'rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
          }}>
            <img src="/icons/icon-192.png" alt="AgriEasy" style={{ width: '48px', height: '48px', borderRadius: '12px' }} />
          </div>
        </div>

        {/* Badge — glass pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.08)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '100px', padding: '7px 20px', marginBottom: '20px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        }}>
          <span style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#60a5fa', display: 'inline-block',
            boxShadow: '0 0 8px #60a5fa',
          }} />
          <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            India&apos;s Agricultural Marketplace
          </span>
        </div>

        {/* Title — gradient text on glass */}
        <h1 style={{
          fontSize: 'clamp(2.6rem, 8vw, 4.2rem)', fontWeight: 900, lineHeight: 1.05,
          margin: '0 0 16px',
          background: 'linear-gradient(135deg, #ffffff 0%, #bfdbfe 50%, #93c5fd 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          textShadow: '0 0 40px rgba(147,197,253,0.3)',
        }}>
          Agri<span style={{ background: 'linear-gradient(135deg, #60a5fa, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Easy</span>
        </h1>

        {/* Taglines */}
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: '4px', fontWeight: 400 }}>
          Connecting Farmers Directly with Buyers
        </p>
        <p style={{ color: 'rgba(147,197,253,0.9)', fontSize: '0.92rem', marginBottom: '36px', fontWeight: 500 }}>
          End-to-end agricultural trade · Social network · Wallet · Logistics
        </p>

        {/* Glass cards grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px', marginBottom: '28px', maxWidth: '680px', margin: '0 auto 28px',
        }}>
          {/* Farmer */}
          <Link href="/auth/login?role=farmer" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            padding: '22px 16px', textDecoration: 'none',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            transition: 'transform 0.25s, background 0.25s, box-shadow 0.25s',
          }}>
            <span style={{ fontSize: '2rem' }}>🌾</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Farmer</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>Sell your produce</span>
          </Link>

          {/* Buyer */}
          <Link href="/auth/login?role=buyer" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            padding: '22px 16px', textDecoration: 'none',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            transition: 'transform 0.25s, background 0.25s, box-shadow 0.25s',
          }}>
            <span style={{ fontSize: '2rem' }}>🛒</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Buyer</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>Source fresh crops</span>
          </Link>

          {/* Transporter */}
          <Link href="/auth/login?role=transporter" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            padding: '22px 16px', textDecoration: 'none',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            transition: 'transform 0.25s, background 0.25s, box-shadow 0.25s',
          }}>
            <span style={{ fontSize: '2rem' }}>🚛</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Transporter</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>Deliver goods</span>
          </Link>

          {/* AgriPay */}
          <Link href="/agripay" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            padding: '22px 16px', textDecoration: 'none',
            background: 'rgba(37,99,235,0.25)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(96,165,250,0.3)',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(37,99,235,0.2)',
            transition: 'transform 0.25s, background 0.25s, box-shadow 0.25s',
          }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 900 }}>₹</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>AgriPay</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>Pay & Transfer</span>
          </Link>

          {/* AgriSocial */}
          <Link href="/agrisocial" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            padding: '22px 16px', textDecoration: 'none',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            transition: 'transform 0.25s, background 0.25s, box-shadow 0.25s',
          }}>
            <span style={{ fontSize: '2rem' }}>📱</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>AgriSocial</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>Feed & Reels</span>
          </Link>

          {/* Ledger */}
          <Link href="/ledger" style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
            padding: '22px 16px', textDecoration: 'none',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '18px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            transition: 'transform 0.25s, background 0.25s, box-shadow 0.25s',
          }}>
            <span style={{ fontSize: '2rem' }}>📒</span>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.9rem' }}>Ledger</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem' }}>Bills & Earnings</span>
          </Link>
        </div>

        {/* Jai Kisan — glass box */}
        <div style={{
          margin: '0 auto 20px', padding: '18px 28px', maxWidth: '480px',
          background: 'rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          textAlign: 'center',
        }}>
          <p style={{
            fontSize: 'clamp(1rem, 3vw, 1.4rem)', fontWeight: 900, letterSpacing: '0.14em',
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #d97706)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
            margin: 0, textTransform: 'uppercase',
          }}>
            &quot;JAI JAWAN, JAI KISAN&quot;
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.76rem', marginTop: '6px', letterSpacing: '0.03em' }}>
            — Lal Bahadur Shastri, 2nd Prime Minister of India
          </p>
        </div>

        {/* Register link */}
        <Link href="/auth/register" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          padding: '10px 24px',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '100px', textDecoration: 'none',
          color: 'rgba(255,255,255,0.8)', fontSize: '0.88rem', fontWeight: 600,
          transition: 'background 0.25s, transform 0.25s',
        }}>
          New here? <span style={{ color: '#93c5fd', fontWeight: 700 }}>Create an account →</span>
        </Link>
      </div>

      {/* CSS animations for floating blobs */}
      <style>{`
        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-20px, 20px) scale(1.1); }
        }
        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(30px, -15px) scale(1.15); }
        }
        @keyframes float3 {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-50%, -30px) scale(0.9); }
        }
        a:hover {
          transform: translateY(-4px) !important;
          background: rgba(255,255,255,0.15) !important;
          box-shadow: 0 12px 36px rgba(0,0,0,0.2) !important;
        }
      `}</style>
    </div>
  )
}
