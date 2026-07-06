'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { AGRI, SHARED, navStyle, inputStyle } from '@/lib/styles'

export default function ScanToPay() {
    const [agripayId, setAgripayId] = useState('')
    const [userName, setUserName] = useState('')
    const [loading, setLoading] = useState(true)
    const [tab, setTab] = useState<'my-qr' | 'camera'>('camera')
    const [scanInput, setScanInput] = useState('')
    const [copied, setCopied] = useState(false)
    const [cameraActive, setCameraActive] = useState(false)
    const [scannedId, setScannedId] = useState('')
    const [cameraError, setCameraError] = useState('')

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
        const load = async () => {
            const userId = localStorage.getItem('userId')
            const role = localStorage.getItem('userRole') || ''
            if (!userId) { setLoading(false); return }
            try {
                const res = await authFetch('/api/agripay/wallet')
                const d = await res.json()
                if (d.wallet?.agripayId) setAgripayId(d.wallet.agripayId)
                const label = role === 'farmer' ? 'Farmer' : role === 'buyer' ? 'Buyer' : role === 'transporter' ? 'Transporter' : 'User'
                setUserName(label)
            } catch (e) { console.error(e) } finally { setLoading(false) }
        }
        void load()
        return () => stopCamera()
    }, [])

    const startCamera = async () => {
        setCameraError('')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                await videoRef.current.play()
            }
            setCameraActive(true)
            startScanLoop()
        } catch (err: any) {
            setCameraError('Camera access denied. Please allow camera permissions or enter ID manually.')
            console.error('Camera error:', err)
        }
    }

    const stopCamera = () => {
        if (scanTimerRef.current) clearInterval(scanTimerRef.current)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        setCameraActive(false)
    }

    const startScanLoop = () => {
        scanTimerRef.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current) return
            const video = videoRef.current
            const canvas = canvasRef.current
            if (video.readyState !== video.HAVE_ENOUGH_DATA) return

            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            const ctx = canvas.getContext('2d')
            if (!ctx) return
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

            try {
                const formData = new FormData()
                canvas.toBlob(async (blob) => {
                    if (!blob) return
                    formData.append('file', blob, 'capture.jpg')
                    try {
                        const response = await fetch('https://api.qrserver.com/v1/read-qr-code/', { method: 'POST', body: formData })
                        const data = await response.json()
                        if (data?.[0]?.symbol?.[0]?.data) {
                            const qrData = data[0].symbol[0].data
                            const match = qrData.match(/agripay:(.+)/) || qrData.match(/^(.+@agripay)$/)
                            const id = match ? match[1] : qrData
                            setScannedId(id)
                            stopCamera()
                        }
                    } catch { }
                }, 'image/jpeg', 0.5)
            } catch { }
        }, 1500)
    }

    const handleTabChange = (newTab: 'my-qr' | 'camera') => {
        setTab(newTab)
        if (newTab === 'camera' && !cameraActive) {
            startCamera()
        } else if (newTab !== 'camera') {
            stopCamera()
        }
    }

    const qrUrl = agripayId
        ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(`agripay:${agripayId}`)}&color=4c1d95&bgcolor=ede9fe&margin=10`
        : ''

    const handleCopy = async () => {
        if (!agripayId) return
        try {
            await navigator.clipboard.writeText(agripayId)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch { }
    }

    return (
        <div style={{ minHeight: '100vh', background: AGRI.bg, fontFamily: SHARED.font, color: AGRI.text }}>
            <nav style={{ ...navStyle(AGRI), background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <div style={{ maxWidth: '540px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Link href="/agripay" style={{ color: AGRI.primary, textDecoration: 'none', fontWeight: 700, fontSize: '0.875rem', transition: 'all 0.2s ease' }}>← AgriPay</Link>
                    <span style={{ color: AGRI.muted }}>›</span>
                    <span style={{ color: AGRI.text, fontWeight: 600, fontSize: '0.875rem' }}>Scan & Pay</span>
                </div>
            </nav>

            <div style={{ maxWidth: '480px', margin: '32px auto', padding: '0 24px 48px' }}>
                <div style={{ background: AGRI.primaryLight, borderRadius: '12px', padding: '4px', display: 'flex', gap: '4px', marginBottom: '24px', border: `1px solid ${AGRI.border}` }}>
                    {[['my-qr', '📲 My QR'], ['camera', '📷 Scan to Pay']].map(([k, l]) => (
                        <button key={k} onClick={() => handleTabChange(k as 'my-qr' | 'camera')}
                            style={{ flex: 1, padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.85rem', background: tab === k ? AGRI.white : 'transparent', color: tab === k ? AGRI.primary : AGRI.muted, boxShadow: tab === k ? SHARED.shadow : 'none', transition: 'all 0.2s ease' }}>
                            {l}
                        </button>
                    ))}
                </div>

                {tab === 'my-qr' && (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '28px', textAlign: 'center', boxShadow: SHARED.shadowLg, transition: 'all 0.2s ease' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: AGRI.textSecondary, margin: '0 0 6px' }}>Your AgriPay QR Code</h2>
                        <p style={{ color: AGRI.muted, fontSize: '0.85rem', margin: '0 0 24px' }}>Show this to anyone who wants to pay you</p>
                        {loading ? (
                            <div style={{ width: '220px', height: '220px', borderRadius: '16px', background: AGRI.primaryLight, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: AGRI.muted }}>Loading…</div>
                        ) : !agripayId ? (
                            <div style={{ width: '220px', height: '220px', borderRadius: '16px', background: AGRI.primaryLight, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
                                <span style={{ fontSize: '2rem' }}>🔐</span>
                                <p style={{ color: AGRI.muted, fontSize: '0.8rem', margin: 0 }}>Log in to see your QR</p>
                            </div>
                        ) : (
                            <>
                                <div style={{ position: 'relative', display: 'inline-block', marginBottom: '16px' }}>
                                    <div style={{ background: AGRI.primaryLight, borderRadius: '20px', padding: '16px', border: `2px solid ${AGRI.border}`, display: 'inline-block' }}>
                                        <img src={qrUrl} alt="AgriPay QR Code" width={220} height={220} style={{ display: 'block', borderRadius: '10px' }} />
                                    </div>
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '36px', height: '36px', borderRadius: '8px', background: AGRI.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: '1rem', border: '2px solid #fff', boxShadow: '0 2px 8px rgba(109,40,217,0.4)' }}>₹</div>
                                </div>
                                <div style={{ marginBottom: '20px' }}>
                                    <p style={{ color: AGRI.textSecondary, fontWeight: 800, fontSize: '1rem', margin: '0 0 4px' }}>{userName}</p>
                                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: AGRI.primaryLight, borderRadius: '100px', padding: '5px 14px', border: `1px solid ${AGRI.border}` }}>
                                        <span style={{ color: AGRI.primary, fontWeight: 700, fontSize: '0.875rem' }}>{agripayId}</span>
                                    </div>
                                </div>
                                <button onClick={handleCopy} style={{ width: '100%', padding: '12px', background: copied ? AGRI.green : AGRI.primary, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                                    {copied ? '✅ Copied!' : '📋 Copy AgriPay ID'}
                                </button>
                            </>
                        )}
                    </div>
                )}

                {tab === 'camera' && (
                    <div style={{ background: AGRI.white, border: `1px solid ${AGRI.border}`, borderRadius: SHARED.radiusLg, padding: '24px', boxShadow: SHARED.shadowLg, transition: 'all 0.2s ease' }}>
                        <h2 style={{ fontWeight: 800, fontSize: '1.2rem', color: AGRI.textSecondary, margin: '0 0 6px' }}>📷 Scan QR Code</h2>
                        <p style={{ color: AGRI.muted, fontSize: '0.85rem', margin: '0 0 20px' }}>Point your camera at an AgriPay QR code to pay</p>

                        {/* Camera view */}
                        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', background: '#000', marginBottom: '16px', aspectRatio: '4/3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {!cameraActive && !scannedId && (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📷</div>
                                    <p style={{ margin: '0 0 16px', fontSize: '0.9rem', opacity: 0.8 }}>Camera preview will appear here</p>
                                    <button onClick={startCamera} style={{ padding: '12px 28px', background: AGRI.primary, border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                                        📸 Open Camera
                                    </button>
                                </div>
                            )}
                            {cameraActive && (
                                <>
                                    <video ref={videoRef} autoPlay playsInline muted
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    {/* Scanner frame overlay */}
                                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '200px', height: '200px', border: '3px solid rgba(109,40,217,0.8)', borderRadius: '16px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.3)' }}>
                                        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: '2px', background: 'rgba(109,40,217,0.6)', animation: 'scanline 2s ease-in-out infinite' }} />
                                    </div>
                                    <style>{`@keyframes scanline { 0%,100% { top: 20%; } 50% { top: 80%; } }`}</style>
                                    <button onClick={stopCamera} style={{ position: 'absolute', bottom: '12px', left: '12px', padding: '8px 16px', background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '8px', color: '#fff', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                                        ⏹ Stop Camera
                                    </button>
                                </>
                            )}
                            {scannedId && (
                                <div style={{ textAlign: 'center', padding: '40px', color: '#fff' }}>
                                    <div style={{ fontSize: '3rem', marginBottom: '8px' }}>✅</div>
                                    <p style={{ fontWeight: 700, margin: '0 0 4px' }}>QR Scanned!</p>
                                    <p style={{ fontSize: '0.85rem', opacity: 0.8, margin: 0 }}>{scannedId}</p>
                                </div>
                            )}
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                        </div>

                        {cameraError && <div style={{ background: AGRI.redLight, border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', marginBottom: '16px', color: AGRI.red, fontSize: '0.85rem', fontWeight: 600 }}>{cameraError}</div>}

                        {/* Manual entry fallback */}
                        {!scannedId ? (
                            <>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                                    <div style={{ flex: 1, height: '1px', background: AGRI.border }} />
                                    <span style={{ color: AGRI.muted, fontSize: '0.78rem', fontWeight: 600 }}>OR ENTER MANUALLY</span>
                                    <div style={{ flex: 1, height: '1px', background: AGRI.border }} />
                                </div>
                                <input type="text" value={scanInput} onChange={e => setScanInput(e.target.value)}
                                    placeholder="Enter AgriPay ID or phone number"
                                    style={{ ...inputStyle(AGRI), marginBottom: '12px' }} />
                                <Link href={scanInput.trim() ? `/agripay/send?to=${encodeURIComponent(scanInput.trim())}` : '#'}
                                    style={{ display: 'block', width: '100%', padding: '14px', background: scanInput.trim() ? AGRI.primary : AGRI.border, borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', textAlign: 'center', textDecoration: 'none', pointerEvents: scanInput.trim() ? 'auto' : 'none', boxSizing: 'border-box', transition: 'all 0.2s ease' }}>
                                    Pay Now →
                                </Link>
                            </>
                        ) : (
                            <Link href={`/agripay/send?to=${encodeURIComponent(scannedId)}`}
                                style={{ display: 'block', width: '100%', padding: '14px', background: AGRI.green, borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box', transition: 'all 0.2s ease' }}>
                                Pay {scannedId} → View Send Page
                            </Link>
                        )}
                    </div>
                )}
            </div>
            <style>{`input:focus { border-color: ${AGRI.primary} !important; }`}</style>
        </div>
    )
}