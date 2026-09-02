import { SHARED } from '@/lib/styles'

export const metadata = { title: 'Privacy Policy — AgriEasy' }

export default function PrivacyPolicy() {
  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: SHARED.font, padding: '40px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Privacy Policy</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 32 }}>Last updated: August 2026</p>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>1. Information We Collect</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            AgriEasy collects the following information when you create an account:
            <br />• <strong>Name:</strong> Your full name as provided during registration.
            <br />• <strong>Email:</strong> Used for login and account recovery.
            <br />• <strong>Phone number:</strong> Used for authentication and OTP verification.
            <br />• <strong>Location:</strong> Used to find nearby buyers, farmers, and transporters (with your consent).
            <br />• <strong>Profile photo:</strong> Optional, used for your AgriSocial profile.
            <br />• <strong>Media uploads:</strong> Photos and videos you post on AgriSocial, stored via Cloudinary.
            <br />• <strong>Payment data:</strong> Transaction records via Razorpay (we do not store card/bank details).
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>2. How We Use Your Information</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            Your information is used to:
            <br />• Provide core marketplace features (finding buyers, booking transporters, tracking deliveries)
            <br />• Process payments through AgriPay
            <br />• Display your profile and posts on AgriSocial
            <br />• Send PWA install notifications and email alerts
            <br />• Improve our services through aggregated analytics
            <br />• Comply with legal obligations
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>3. Google Sign-In</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            When you sign in with Google, we request access to your basic profile information (name, email, and profile picture).
            We use this to create or link your AgriEasy account. We do not access your Gmail, Google Drive, or any other Google services.
            Your Google credentials are never stored on our servers — authentication is handled via OAuth 2.0 tokens.
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>4. Data Sharing</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            We do not sell your data. We share data with third-party services only as needed:
            <br />• <strong>Cloudinary:</strong> Stores uploaded photos and videos
            <br />• <strong>Razorpay:</strong> Processes payments (PCI-DSS compliant)
            <br />• <strong>MongoDB Atlas:</strong> Hosts our database with encryption at rest
            <br />• <strong>Google:</strong> OAuth authentication only
            <br />All third-party services have their own privacy policies.
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>5. Data Security</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            We protect your data with:
            <br />• Passwords hashed with bcrypt (never stored in plaintext)
            <br />• JWT tokens with 7-day expiry
            <br />• HTTPS encryption for all communications
            <br />• AES-256 encryption for sensitive fields (bank details, Aadhaar)
            <br />• Rate limiting to prevent brute-force attacks
            <br />• Content Security Policy (CSP) headers
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>6. Your Rights</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            You have the right to:
            <br />• Access your data (export via Settings)
            <br />• Delete your account (Settings → Delete Account)
            <br />• Opt out of email notifications
            <br />• Revoke Google access at any time (Google Account → Security → Third-party apps)
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>7. Contact</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            For privacy concerns, contact: <strong>agrieasy.site@gmail.com</strong>
          </p>
        </section>
      </div>
    </main>
  )
}
