'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function EasyPayComingSoonRedirect() {
    const router = useRouter()
    useEffect(() => { router.replace('/agripay') }, [router])
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAF7EE', fontFamily: 'var(--font-poppins), system-ui, sans-serif', color: '#31372B' }}>
            <div style={{ textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #31372B 0%, #4A5240 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1.8rem', marginBottom: 14 }}>₹</div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>EasyPay is coming soon — redirecting…</p>
            </div>
        </div>
    )
}
