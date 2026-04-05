'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const C = {
    bg: '#faf7ff', white: '#ffffff', brinjal: '#6d28d9', brLight: '#ede9fe',
    brMid: '#c4b5fd', brDark: '#4c1d95', text: '#1e1b4b', muted: '#6b7280',
    border: '#ddd6fe', green: '#059669', red: '#dc2626',
}

export default function ScanToPay() {
    const [agripayId, setAgripayId] = useState('')
    const [userName, setUserName] = useState('')
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'my-qr' | 'scan'>('my-qr')
    const [scanInput, setScanInput] = useState('')
    const [copied, setCopied] = useState(false)

    useEffect(() => {
        const load = async () => {
            const userId = localStorage.getItem('userId')
            const role = localStorage.getItem('userRole') || ''
            if (!userId) { setLoading(false); return }
            try {
                const res = await fetch(`/api/agripay/wallet?userId=${userId}`)
                const d = await res.json()
                if (d.wallet?.agripayId) setAgripayId(d.wallet.agripayId)
                // Try to get user name from role
                const label = role === 'farmer' ? 'Farmer' : role === 'buyer' ? 'Buyer' : role === 'transporter' ? 'Transporter' : 'User'
                setUserName(label)
            } catch (e) { console.error(e) } finally { setLoading(false) }
        }
        void load()
    }, [])

    const qrUrl = agripayId
        ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`agripay:${agripayId}`)}&color=4c1d95&bgcolor=ede9fe&margin=10`
        : ''

    const handleCopy = () => {
        if (!agripayId) return
        navigator.clipboard.writeText(agripayId)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif', color: C.text }}>
            {/* Nav */}
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 24px', boxShadow: '0 1px 6px rgba(109,40,217,0.08)' }}>
                <div style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: C.brinjal, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem' }}>← AgriPay</Link>
                    <span style={{ color: C.muted }}>›</span>
                    <span style={{ color: C.text, fontWeight: 600, fontSize: '0.875rem' }}>Scan & Pay</span>
                </div>
            </nav>

            <div style={{ maxWidth: '480px', margin: '32px auto', padding: '0 24px 48px' }}>

                {/* Tab switcher */}
                <div style={{ background: C.brLight, borderRadius: '12px', padding: '4px', display: 'flex', gap: '4px', marginBottom: '24px', border: `1px solid ${C.brMid}` }}>
                    {[['my-qr', '📲 My QR Code'], ['scan', '📷 Enter ID to Pay']].map(([k, l]) => (
                        <button key={k} onClick={() => setTab(k as 'my-qr' | 'scan')}
                            style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: tab === k ? C.white : 'transparent', color: tab === k ? C.brinjal : C.muted, boxShadow: tab === k ? '0 1px 4px rgba(109,40,217,0.12)' : 'none' }}>
                            {l}
                        </button>
                    ))}
                </div>

                {/* My QR Code tab */}
                {tab === 'my-qr' && (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '28px', textAlign: 'center', boxShadow: '0 2px 16px rgba(109,40,217,0.08)' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: C.brDark, margin: '0 0 6px' }}>Your AgriPay QR Code</h2>
                        <p style={{ color: C.muted, fontSize: '0.85rem', margin: '0 0 24px' }}>Show this QR code to anyone who wants to pay you</p>

                        {loading ? (
                            <div style={{ width: '220px', height: '220px', borderRadius: '16px', background: C.brLight, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted }}>
                                Loading…
                            </div>
                        ) : !agripayId ? (
                            <div style={{ width: '220px', height: '220px', borderRadius: '16px', background: C.brLight, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '2rem' }}>🔐</span>
                                <p style={{ color: C.muted, fontSize: '0.8rem', margin: 0 }}>Log in to see your QR</p>
                            </div>
                        ) : (
                            <>
                                {/* QR Code frame */}
                                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                                    <div style={{ background: C.brLight, borderRadius: '20px', padding: '16px', border: `2px solid ${C.brMid}`, display: 'inline-block' }}>
                                        {/* AgriPay logo on QR */}
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={qrUrl}
                                            alt="AgriPay QR Code"
                                            width={220} height={220}
                                            style={{ display: 'block', borderRadius: '10px' }}
                                        />
                                    </div>
                                    {/* Center badge */}
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '36px', height: '36px', borderRadius: '8px', background: `linear-gradient(135deg, ${C.brDark}, ${C.brinjal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1rem', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(109,40,217,0.4)' }}>
                                        ₹
                                    </div>
                                </div>

                                {/* Name + ID */}
                                <div style={{ marginBottom: '20px' }}>
                                    <p style={{ color: C.brDark, fontWeight: 800, fontSize: '1rem', margin: '0 0 4px' }}>{userName}</p>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: C.brLight, borderRadius: '100px', padding: '5px 14px', border: `1px solid ${C.brMid}` }}>
                                        <span style={{ color: C.brinjal, fontWeight: 700, fontSize: '0.875rem' }}>{agripayId}</span>
                                    </div>
                                </div>

                                {/* Copy button */}
                                <button onClick={handleCopy}
                                    style={{ width: '100%', padding: '12px', background: copied ? C.green : C.brinjal, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                                    {copied ? '✅ Copied to Clipboard!' : '📋 Copy AgriPay ID'}
                                </button>
                            </>
                        )}

                        {/* Info */}
                        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', marginTop: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '0.9rem' }}>ℹ️</span>
                            <span style={{ color: C.muted, fontSize: '0.78rem' }}>Anyone can scan this QR with their camera or an AgriPay user can search your ID to send you money instantly.</span>
                        </div>
                    </div>
                )}

                {/* Enter ID tab (for sending money by scanning) */}
                {tab === 'scan' && (
                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '20px', padding: '28px', boxShadow: '0 2px 16px rgba(109,40,217,0.08)' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: C.brDark, margin: '0 0 6px' }}>Pay by AgriPay ID</h2>
                        <p style={{ color: C.muted, fontSize: '0.85rem', margin: '0 0 24px' }}>Enter the AgriPay ID of the person you want to pay</p>

                        {/* Illustration */}
                        <div style={{ background: C.brLight, borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px', border: `1px solid ${C.brMid}` }}>
                            <div style={{ fontSize: '4rem', marginBottom: '8px' }}>📲</div>
                            <p style={{ color: C.brDark, fontWeight: 700, fontSize: '0.9rem', margin: '0 0 4px' }}>Scan or Enter AgriPay ID</p>
                            <p style={{ color: C.muted, fontSize: '0.8rem', margin: 0 }}>Ask them to show their QR code, or enter their ID directly</p>
                        </div>

                        <label style={{ color: C.muted, fontSize: '0.75rem', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>AgriPay ID / Phone Number</label>
                        <input type="text" value={scanInput} onChange={e => setScanInput(e.target.value)}
                            placeholder="e.g., 9876543210@agripay or 9876543210"
                            style={{ width: '100%', padding: '13px 14px', background: C.bg, border: `1.5px solid ${C.border}`, borderRadius: '10px', color: C.text, fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', marginBottom: '16px' }}
                            autoFocus
                        />

                        <Link href={scanInput.trim() ? `/agripay/send?to=${encodeURIComponent(scanInput.trim())}` : '#'}
                            style={{ display: 'block', width: '100%', padding: '14px', background: scanInput.trim() ? C.brinjal : C.brMid, borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', textAlign: 'center', textDecoration: 'none', pointerEvents: scanInput.trim() ? 'auto' : 'none', boxSizing: 'border-box' }}>
                            Pay Now →
                        </Link>

                        <div style={{ background: C.bg, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', marginTop: '14px' }}>
                            <p style={{ color: C.muted, fontSize: '0.78rem', margin: 0 }}>💡 <strong>Tip:</strong> AgriPay IDs look like <span style={{ color: C.brinjal, fontWeight: 600 }}>9876543210@agripay</span> — ask the recipient to share their ID from the QR Code page.</p>
                        </div>
                    </div>
                )}
            </div>
            <style>{`input:focus { border-color: ${C.brinjal} !important; }`}</style>
        </div>
    )
}
