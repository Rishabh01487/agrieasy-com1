'use client'

import Link from 'next/link'
import { AGRI, SHARED, navStyle } from '@/lib/styles'

/**
 * EasyPay (formerly AgriPay) — Coming Soon landing page.
 *
 * The full wallet/payments/transfer feature set is not yet live. We show
 * a branded "Coming Soon" page that explains what's coming, rather than
 * letting users into half-built wallet flows (which were asking for
 * bank verification, Razorpay setup, etc. before the feature was ready).
 *
 * The route stays at /agripay so existing internal links + bookmarks
 * don't break. Only the user-facing brand name changes from "AgriPay"
 * to "EasyPay".
 */
export default function EasyPayComingSoon() {
    return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, fontFamily: SHARED.font, color: AGRI.text }}>
            {/* Nav */}
            <nav style={{ ...navStyle(AGRI), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', boxShadow: SHARED.shadowMd }}>
                <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: AGRI.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.1rem' }}>₹</div>
                        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: AGRI.textSecondary }}>EasyPay</span>
                        <span style={{ background: AGRI.primaryLight, color: AGRI.primary, border: `1px solid ${AGRI.border}`, borderRadius: '100px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700 }}>by AgriEasy</span>
                    </div>
                    <Link href="/" style={{ color: AGRI.muted, padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', textDecoration: 'none', background: AGRI.primaryLight, fontWeight: 600, transition: 'all 0.2s ease', cursor: 'pointer' }}>← Home</Link>
                </div>
            </nav>

            <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 24px', textAlign: 'center' }}>
                {/* Hero badge */}
                <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: '#fff', border: `1.5px solid ${AGRI.border}`,
                    borderRadius: 100, padding: '6px 16px', marginBottom: 24,
                    boxShadow: SHARED.shadowMd,
                }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: AGRI.primary, display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
                    <span style={{ color: AGRI.text, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                        Coming Soon
                    </span>
                </div>

                {/* Logo + headline */}
                <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
                    <div style={{
                        width: 96, height: 96, borderRadius: 24,
                        background: AGRI.gradient,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 16px 48px rgba(109,40,217,0.32)',
                        position: 'relative',
                    }}>
                        <span style={{ color: '#fff', fontSize: '3rem', fontWeight: 900 }}>₹</span>
                        <span style={{
                            position: 'absolute', top: -8, right: -8,
                            background: '#E98074', color: '#fff',
                            fontSize: '0.62rem', fontWeight: 800,
                            padding: '4px 10px', borderRadius: 100,
                            letterSpacing: '0.06em', textTransform: 'uppercase',
                            boxShadow: '0 4px 12px rgba(233,128,116,0.5)',
                            whiteSpace: 'nowrap',
                        }}>Soon</span>
                    </div>
                </div>

                <h1 style={{ fontSize: '2.4rem', fontWeight: 900, letterSpacing: '-0.02em', margin: '0 0 10px', color: AGRI.text }}>
                    EasyPay is on the way
                </h1>
                <p style={{ fontSize: '1rem', color: AGRI.muted, lineHeight: 1.6, margin: '0 auto 28px', maxWidth: 420 }}>
                    India&apos;s indigenous payments system for trading agricultural commodities — wallet, UPI, bank transfers, and PayLater credit, all in one place. We&apos;re putting the final touches on it.
                </p>

                {/* What's coming grid */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
                    background: AGRI.white, border: `1px solid ${AGRI.border}`,
                    borderRadius: 16, padding: 20, marginBottom: 28,
                    boxShadow: SHARED.shadowMd, textAlign: 'left',
                }}>
                    {[
                        { icon: '💳', title: 'Wallet', desc: 'Load & spend from your balance' },
                        { icon: '↗', title: 'Send Money', desc: 'Transfer to anyone via UPI/NEFT' },
                        { icon: '⚡', title: 'Pay Bills', desc: 'Fuel, salary, recharge, etc.' },
                        { icon: '💰', title: 'PayLater', desc: 'Credit up to ₹50,000 at 0.099%/day' },
                        { icon: '📷', title: 'Scan & Pay', desc: 'QR payments in one tap' },
                        { icon: '📋', title: 'History', desc: 'Track every transaction' },
                    ].map(f => (
                        <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '6px 0' }}>
                            <span style={{ fontSize: '1.3rem', flexShrink: 0, lineHeight: 1.4 }}>{f.icon}</span>
                            <div>
                                <p style={{ margin: 0, color: AGRI.text, fontWeight: 700, fontSize: '0.88rem' }}>{f.title}</p>
                                <p style={{ margin: '2px 0 0', color: AGRI.muted, fontSize: '0.74rem', lineHeight: 1.4 }}>{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* CTA buttons */}
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
                    <Link href="/" style={{
                        background: AGRI.gradient, color: '#fff',
                        padding: '13px 28px', borderRadius: 100,
                        textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                        boxShadow: '0 8px 24px rgba(109,40,217,0.3)',
                    }}>← Back to AgriEasy</Link>
                    <Link href="/ledger/bill-calculator" style={{
                        background: AGRI.white, color: AGRI.text,
                        border: `1.5px solid ${AGRI.border}`,
                        padding: '13px 28px', borderRadius: 100,
                        textDecoration: 'none', fontWeight: 700, fontSize: '0.9rem',
                        cursor: 'pointer', transition: 'all 0.2s ease',
                    }}>Try Bill Calculator →</Link>
                </div>

                {/* Footer */}
                <p style={{ color: AGRI.muted, fontSize: '0.78rem', margin: '0 auto 8px', maxWidth: 360, lineHeight: 1.5, fontStyle: 'italic' }}>
                    EasyPay by AgriEasy — India&apos;s indigenous payments system for trading agricultural commodities and more.
                </p>
                <p style={{ color: AGRI.border, fontSize: '0.7rem', margin: 0, fontWeight: 600 }}>
                    🔒 Secured by AgriEasy • Made in India 🇮🇳
                </p>
            </div>

            <style>{`@keyframes pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.4); opacity: 0.6; } }`}</style>
        </div>
    )
}
