import { SHARED } from '@/lib/styles'

export const metadata = { title: 'Terms of Service — AgriEasy' }

export default function TermsOfService() {
  return (
    <main style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: SHARED.font, padding: '40px 16px' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, color: '#0f172a' }}>Terms of Service</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem', marginBottom: 32 }}>Last updated: August 2026</p>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>1. Acceptance of Terms</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            By creating an account on AgriEasy, you agree to these Terms of Service. If you do not agree, please do not use the platform.
            AgriEasy is an agricultural marketplace connecting farmers, buyers, and transporters across India.
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>2. User Responsibilities</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            As a user, you agree to:
            <br />• Provide accurate information during registration
            <br />• Not impersonate another person or business
            <br />• Not post misleading commodity prices or fake listings
            <br />• Not harass, abuse, or threaten other users on AgriSocial
            <br />• Not upload illegal, offensive, or copyrighted content
            <br />• Not attempt to hack, scrape, or disrupt the platform
            <br />• Complete transactions in good faith
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>3. Marketplace Role</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            AgriEasy is a platform that connects buyers and sellers. We are NOT a party to any transaction between users.
            We do not guarantee the quality, quantity, or delivery of any commodity. Disputes between users should be
            resolved between the parties involved. AgriEasy is not liable for any financial loss resulting from
            transactions made through the platform.
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>4. Payments (AgriPay)</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            Payments are processed through Razorpay, a PCI-DSS compliant payment gateway. AgriEasy does not store
            your card number, CVV, or net banking credentials. Wallet balances are maintained in our database.
            Refunds, if applicable, are processed within 7-10 business days.
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>5. AgriSocial Content</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            You retain ownership of content you post on AgriSocial (photos, videos, captions). By posting, you grant
            AgriEasy a non-exclusive license to display your content on the platform. We reserve the right to remove
            content that violates these terms. Repeated violations may result in account suspension.
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>6. Account Termination</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            You can delete your account at any time via Settings. We may suspend or terminate accounts that violate
            these Terms of Service, engage in fraudulent activity, or disrupt the platform.
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>7. Limitation of Liability</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            AgriEasy is provided "as is" without warranties of any kind. We are not liable for:
            <br />• Loss of profit, revenue, or business opportunity
            <br />• Delays or failures in delivery
            <br />• Quality disputes between buyers and farmers
            <br />• Third-party service outages (Razorpay, Cloudinary, MongoDB)
            <br />• Data loss due to server failure (we recommend exporting your ledger regularly)
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>8. Changes to Terms</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            We may update these Terms of Service at any time. Continued use of AgriEasy after changes constitutes
            acceptance of the new terms. Major changes will be communicated via email or in-app notification.
          </p>
        </section>

        <section style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: 12 }}>9. Contact</h2>
          <p style={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.7, margin: 0 }}>
            For questions about these Terms, contact: <strong>rishabhgupta999175@gmail.com</strong>
          </p>
        </section>
      </div>
    </main>
  )
}
