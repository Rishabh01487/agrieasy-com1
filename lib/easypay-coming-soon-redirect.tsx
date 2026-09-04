'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Replaces the body of any page that should be hidden while EasyPay is
 * "Coming Soon". Renders a brief loading spinner, then redirects the
 * user to /agripay (the EasyPay Coming Soon landing page).
 *
 * Usage (drop-in replacement for the default export of a page):
 *
 *   // app/agripay/send/page.tsx
 *   import EasyPayComingSoonRedirect from '@/app/agripay/_coming-soon-redirect'
 *   export default EasyPayComingSoonRedirect
 *
 * We keep the original page files (with their original logic) so they can
 * be re-enabled later by swapping the export back. Only the visible
 * behaviour is suppressed.
 */
export default function EasyPayComingSoonRedirect() {
    const router = useRouter()
    useEffect(() => {
        // Use replace so the user can't hit back to land on the hidden page
        router.replace('/agripay')
    }, [router])

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#FAF7EE',
            fontFamily: 'var(--font-poppins), system-ui, sans-serif',
            color: '#31372B',
        }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{
                    width: 56, height: 56, borderRadius: 16,
                    background: 'linear-gradient(135deg, #31372B 0%, #4A5240 100%)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 900, fontSize: '1.8rem',
                    marginBottom: 14,
                }}>₹</div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>
                    EasyPay is coming soon — redirecting…
                </p>
            </div>
        </div>
    )
}
