export default function Loading() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      fontFamily: "'Inter','Segoe UI',system-ui,-apple-system,sans-serif",
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.8rem',
        animation: 'pulseScale 1.2s ease-in-out infinite',
      }}>
        🌾
      </div>
      <div style={{
        width: 120, height: 3, borderRadius: 2,
        background: '#e2e8f0', overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, height: '100%',
          width: '40%', borderRadius: 2,
          background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
          animation: 'loadingBar 1s ease-in-out infinite',
        }} />
      </div>
      <style>{`
        @keyframes pulseScale {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.08); opacity: 0.85; }
        }
        @keyframes loadingBar {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  )
}
