'use client'

import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const C = {
    bg: '#fffbf5', white: '#ffffff', orange: '#ea580c', orLight: '#fff7ed',
    orMid: '#fed7aa', orDark: '#9a3412', text: '#1c1917', muted: '#78716c', border: '#fed7aa',
    red: '#ef4444', green: '#16a34a',
}

const CATEGORIES = ['farming', 'agritrading', 'technique', 'equipment', 'weather', 'livestock', 'organic', 'general']

const FILTERS = [
    { name: 'Normal', style: 'none' },
    { name: 'Vivid', style: 'saturate(1.8) contrast(1.1)' },
    { name: 'Warm', style: 'sepia(0.4) saturate(1.3) brightness(1.05)' },
    { name: 'Cool', style: 'hue-rotate(20deg) saturate(1.2) brightness(1.05)' },
    { name: 'B&W', style: 'grayscale(1) contrast(1.2)' },
    { name: 'Fade', style: 'opacity(0.85) contrast(0.9) brightness(1.1)' },
    { name: 'Golden', style: 'sepia(0.6) saturate(1.5) hue-rotate(-10deg)' },
    { name: 'Crisp', style: 'contrast(1.3) brightness(0.95) saturate(1.1)' },
]

type Mode = 'choose' | 'camera' | 'recording' | 'preview' | 'details'
type MediaFile = { url: string; type: 'image' | 'video'; blob?: Blob }

function CreateContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const defaultPostType = searchParams.get('type') === 'krishiclip' ? 'krishiclip' : 'post'

    const [postType, setPostType] = useState<'post' | 'krishiclip'>(defaultPostType as 'post' | 'krishiclip')
    const [mode, setMode] = useState<Mode>('choose')
    const [mediaFile, setMediaFile] = useState<MediaFile | null>(null)
    const [selectedFilter, setSelectedFilter] = useState(0)
    const [caption, setCaption] = useState('')
    const [category, setCategory] = useState('farming')
    const [location, setLocation] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [camError, setCamError] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [brightness, setBrightness] = useState(100)
    const [contrast, setContrast] = useState(100)

    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const fileInputRef = useRef<HTMLInputElement>(null)
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const stopCamera = useCallback(() => {
        streamRef.current?.getTracks().forEach(t => t.stop())
        streamRef.current = null
    }, [])

    useEffect(() => () => { stopCamera(); if (timerRef.current) clearInterval(timerRef.current) }, [stopCamera])

    const startCamera = async () => {
        setCamError('')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: postType === 'krishiclip' })
            streamRef.current = stream
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
            setMode('camera')
        } catch (e) {
            console.error(e)
            setCamError('Camera access denied. Please allow camera permission in your browser settings, or use "Upload from Gallery" instead.')
        }
    }

    const capturePhoto = () => {
        if (!videoRef.current) return
        const canvas = document.createElement('canvas')
        canvas.width = videoRef.current.videoWidth || 1280
        canvas.height = videoRef.current.videoHeight || 720
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.filter = buildFilterString()
        ctx.drawImage(videoRef.current, 0, 0)
        canvas.toBlob(blob => {
            if (!blob) return
            const url = URL.createObjectURL(blob)
            setMediaFile({ url, type: 'image', blob })
            stopCamera()
            setMode('preview')
        }, 'image/jpeg', 0.92)
    }

    const startRecording = () => {
        if (!streamRef.current) return
        chunksRef.current = []
        const mr = new MediaRecorder(streamRef.current, { mimeType: 'video/webm;codecs=vp9,opus' })
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        mr.onstop = () => {
            const blob = new Blob(chunksRef.current, { type: 'video/webm' })
            const url = URL.createObjectURL(blob)
            setMediaFile({ url, type: 'video', blob })
            stopCamera()
            setMode('preview')
            setIsRecording(false)
            if (timerRef.current) clearInterval(timerRef.current)
        }
        mr.start(100)
        mediaRecorderRef.current = mr
        setIsRecording(true)
        setRecordingTime(0)
        timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000)
    }

    const stopRecording = () => { mediaRecorderRef.current?.stop() }

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        const url = URL.createObjectURL(file)
        const type = file.type.startsWith('video') ? 'video' : 'image'
        setMediaFile({ url, type, blob: file })
        setMode('preview')
    }

    const buildFilterString = () => {
        const base = FILTERS[selectedFilter].style !== 'none' ? FILTERS[selectedFilter].style : ''
        const adj = `brightness(${brightness}%) contrast(${contrast}%)`
        return base ? `${base} ${adj}` : adj
    }

    const getFilterStyle = () => ({ filter: buildFilterString() })

    const handlePost = async () => {
        if (!caption.trim() && !mediaFile) { setError('Add a caption or media'); return }
        const userId = localStorage.getItem('userId')
        if (!userId) { router.push('/auth/login'); return }
        setSubmitting(true); setError('')

        let mediaUrl = ''
        let mediaType = 'text'

        if (mediaFile?.blob) {
            // Upload file via FormData
            const form = new FormData()
            form.append('file', mediaFile.blob, `upload.${mediaFile.type === 'video' ? 'webm' : 'jpg'}`)
            form.append('userId', userId)
            try {
                const res = await fetch('/api/social/upload', { method: 'POST', body: form })
                const d = await res.json()
                if (res.ok) { mediaUrl = d.url; mediaType = mediaFile.type }
                else { setError('Upload failed: ' + (d.error || 'Unknown')); setSubmitting(false); return }
            } catch {
                setError('Upload failed. Try using a URL instead.'); setSubmitting(false); return
            }
        }

        const res = await fetch('/api/social/posts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, type: postType, caption, mediaUrl, mediaType, category, location }),
        })
        const d = await res.json()
        if (!res.ok) { setError(d.error || 'Failed'); setSubmitting(false); return }
        router.push(postType === 'krishiclip' ? '/agrisocial/clips' : '/agrisocial')
    }

    const inp: React.CSSProperties = { width: '100%', padding: '11px 14px', background: C.orLight, border: `1.5px solid ${C.border}`, borderRadius: '10px', color: C.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }

    return (
        <div style={{ minHeight: '100vh', background: C.bg, fontFamily: '"Inter","Segoe UI",sans-serif' }}>
            {/* Nav */}
            <nav style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 1px 6px rgba(234,88,12,0.06)' }}>
                <button onClick={() => { if (mode === 'choose') router.push('/agrisocial'); else if (mode === 'preview' || mode === 'camera') { stopCamera(); setMode('choose'); setMediaFile(null) } else if (mode === 'details') setMode('preview') }}
                    style={{ background: 'none', border: 'none', color: C.orange, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>← Back</button>
                <span style={{ flex: 1, fontWeight: 800, color: C.orDark, fontSize: '1rem' }}>
                    {mode === 'choose' ? 'New Post' : mode === 'camera' ? (isRecording ? '🔴 Recording' : '📷 Camera') : mode === 'preview' ? '✨ Filters' : '📝 Details'}
                </span>
                {mode === 'preview' && <button onClick={() => setMode('details')} style={{ background: C.orange, border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Next →</button>}
                {mode === 'details' && <button onClick={handlePost} disabled={submitting} style={{ background: C.green, border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>{submitting ? 'Posting…' : '✓ Share'}</button>}
            </nav>

            {/* ── CHOOSE MODE ── */}
            {mode === 'choose' && (
                <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px 16px' }}>
                    {/* Post/KrishiClip toggle */}
                    <div style={{ display: 'flex', background: C.orLight, borderRadius: '14px', padding: '5px', gap: '4px', marginBottom: '24px', border: `1px solid ${C.border}` }}>
                        {(['post', 'krishiclip'] as const).map(t => (
                            <button key={t} onClick={() => setPostType(t)}
                                style={{ flex: 1, padding: '12px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: postType === t ? C.white : 'transparent', color: postType === t ? C.orDark : C.muted, fontWeight: 800, fontSize: '0.9rem', boxShadow: postType === t ? '0 1px 6px rgba(234,88,12,0.12)' : 'none' }}>
                                {t === 'post' ? '📷 Post' : '🎬 KrishiClip'}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Camera */}
                        <button onClick={startCamera}
                            style={{ background: `linear-gradient(135deg, ${C.orange}, ${C.orDark})`, border: 'none', borderRadius: '16px', padding: '28px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 4px 16px rgba(234,88,12,0.35)' }}>
                            <span style={{ fontSize: '2.8rem' }}>{postType === 'krishiclip' ? '🎥' : '📸'}</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{postType === 'krishiclip' ? 'Record a KrishiClip' : 'Open Camera'}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '2px' }}>Take a {postType === 'krishiclip' ? 'video' : 'photo'} using your camera</div>
                            </div>
                        </button>

                        {/* Upload */}
                        <button onClick={() => fileInputRef.current?.click()}
                            style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '22px', color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: '0 2px 8px rgba(234,88,12,0.07)' }}>
                            <span style={{ fontSize: '2.8rem' }}>🖼️</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: C.orDark }}>Upload from Gallery</div>
                                <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: '2px' }}>Choose a photo or video from your device</div>
                            </div>
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileUpload} />

                        {/* Text post */}
                        <button onClick={() => setMode('details')}
                            style={{ background: C.white, border: `1.5px solid ${C.border}`, borderRadius: '16px', padding: '22px', color: C.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ fontSize: '2.8rem' }}>✍️</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: C.orDark }}>Text / Caption Only</div>
                                <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: '2px' }}>Share tips, prices, news — no media needed</div>
                            </div>
                        </button>
                    </div>

                    {camError && <div style={{ marginTop: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '12px 16px', color: C.red, fontSize: '0.85rem' }}>⚠️ {camError}</div>}
                </div>
            )}

            {/* ── CAMERA MODE ── */}
            {mode === 'camera' && (
                <div style={{ position: 'relative', background: '#000', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', flex: 1, objectFit: 'cover', filter: buildFilterString() }} />

                    {/* Recording timer */}
                    {isRecording && (
                        <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(239,68,68,0.9)', borderRadius: '100px', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
                            <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>
                                {Math.floor(recordingTime / 60).toString().padStart(2, '0')}:{(recordingTime % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    )}

                    {/* Filter row */}
                    <div style={{ position: 'absolute', bottom: '110px', left: 0, right: 0, display: 'flex', gap: '8px', padding: '0 12px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                        {FILTERS.map((f, i) => (
                            <button key={f.name} onClick={() => setSelectedFilter(i)}
                                style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'linear-gradient(135deg, #6b7280, #374151)', border: `2px solid ${selectedFilter === i ? C.orange : 'rgba(255,255,255,0.3)'}`, filter: f.style === 'none' ? 'none' : f.style }} />
                                <span style={{ color: selectedFilter === i ? C.orMid : 'rgba(255,255,255,0.7)', fontSize: '0.65rem', fontWeight: 700 }}>{f.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Capture controls */}
                    <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
                        <button onClick={() => fileInputRef.current?.click()}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}>
                            🖼️
                        </button>
                        {postType === 'post' ? (
                            <button onClick={capturePhoto}
                                style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.4)', cursor: 'pointer', boxShadow: '0 0 0 3px rgba(234,88,12,0.7)' }} />
                        ) : (
                            <button onClick={isRecording ? stopRecording : startRecording}
                                style={{ width: '72px', height: '72px', borderRadius: '50%', background: isRecording ? C.red : '#fff', border: `4px solid ${isRecording ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.4)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px ${isRecording ? 'rgba(239,68,68,0.7)' : 'rgba(234,88,12,0.7)'}` }}>
                                {isRecording ? <span style={{ display: 'block', width: '22px', height: '22px', borderRadius: '4px', background: '#fff' }} /> : null}
                            </button>
                        )}
                        <div style={{ width: '44px', height: '44px' }} />
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileUpload} />
                    <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
                </div>
            )}

            {/* ── PREVIEW + FILTERS ── */}
            {mode === 'preview' && mediaFile && (
                <div style={{ background: '#000', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
                    {/* Media preview */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '55vh', overflow: 'hidden' }}>
                        {mediaFile.type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mediaFile.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain', ...getFilterStyle() }} />
                        ) : (
                            <video src={mediaFile.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain', ...getFilterStyle() }} />
                        )}
                    </div>

                    {/* Filter row */}
                    <div style={{ background: '#111', padding: '12px 0' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Filters</p>
                        <div style={{ display: 'flex', gap: '10px', padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                            {FILTERS.map((f, i) => (
                                <button key={f.name} onClick={() => setSelectedFilter(i)}
                                    style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', border: `2px solid ${selectedFilter === i ? C.orange : 'rgba(255,255,255,0.15)'}` }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={mediaFile.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.style === 'none' ? 'none' : f.style }} />
                                    </div>
                                    <span style={{ color: selectedFilter === i ? C.orMid : 'rgba(255,255,255,0.55)', fontSize: '0.62rem', fontWeight: 700 }}>{f.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Adjustments */}
                    <div style={{ background: '#1a1a1a', padding: '12px 20px' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 10px' }}>Adjust</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>☀️ Bright</span>
                                <input type="range" min={50} max={150} value={brightness} onChange={e => setBrightness(+e.target.value)} style={{ flex: 1, accentColor: C.orange }} />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{brightness}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>◉ Contrast</span>
                                <input type="range" min={50} max={150} value={contrast} onChange={e => setContrast(+e.target.value)} style={{ flex: 1, accentColor: C.orange }} />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{contrast}%</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── DETAILS MODE ── */}
            {mode === 'details' && (
                <div style={{ maxWidth: '560px', margin: '0 auto', padding: '20px 16px 60px' }}>
                    {/* Preview thumbnail */}
                    {mediaFile && (
                        <div style={{ borderRadius: '14px', overflow: 'hidden', marginBottom: '16px', maxHeight: '260px', background: '#000', display: 'flex' }}>
                            {mediaFile.type === 'image' ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={mediaFile.url} alt="preview" style={{ width: '100%', objectFit: 'cover', maxHeight: '260px', ...getFilterStyle() }} />
                            ) : (
                                <video src={mediaFile.url} style={{ width: '100%', maxHeight: '260px', objectFit: 'cover', ...getFilterStyle() }} muted />
                            )}
                        </div>
                    )}

                    <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Caption */}
                        <div>
                            <label style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caption</label>
                            <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder={postType === 'krishiclip' ? 'Tell people about this KrishiClip… #farming' : 'What\'s happening on your farm today? #farming'} rows={3}
                                style={{ ...inp, resize: 'vertical', lineHeight: 1.5, fontFamily: 'inherit' }} />
                            <p style={{ color: C.muted, fontSize: '0.7rem', margin: '3px 0 0', textAlign: 'right' }}>{caption.length}/2200</p>
                        </div>

                        {/* Category */}
                        <div>
                            <label style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {CATEGORIES.map(c => (
                                    <button key={c} onClick={() => setCategory(c)}
                                        style={{ padding: '5px 12px', borderRadius: '100px', border: `1.5px solid ${category === c ? C.orange : C.border}`, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: category === c ? C.orange : C.white, color: category === c ? '#fff' : C.muted }}>
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label style={{ color: C.muted, fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📍 Location (optional)</label>
                            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Nashik, Maharashtra" style={inp} />
                        </div>

                        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', color: C.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <div style={{ background: C.orLight, border: `1px solid ${C.border}`, borderRadius: '10px', padding: '10px 14px', fontSize: '0.78rem', color: C.muted }}>
                            💡 Media uploaded from camera or gallery will be stored locally for demo purposes. Connect cloud storage (Cloudinary etc.) for production.
                        </div>

                        <button onClick={handlePost} disabled={submitting}
                            style={{ width: '100%', padding: '14px', background: C.orange, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                            {submitting ? '⏳ Sharing…' : postType === 'krishiclip' ? '🎬 Share KrishiClip' : '📢 Share Post'}
                        </button>
                    </div>

                    {/* Bottom nav link */}
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <Link href="/agrisocial" style={{ color: C.muted, fontSize: '0.85rem', textDecoration: 'none' }}>← Cancel &amp; go back to feed</Link>
                    </div>
                </div>
            )}

            <style>{`
        input[type=range] { height: 4px; border-radius: 2px; }
        textarea:focus, input[type=text]:focus { border-color: ${C.orange} !important; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
        </div>
    )
}

export default function CreatePost() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: '#fffbf5', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ea580c', fontWeight: 700 }}>Loading…</div>}>
            <CreateContent />
        </Suspense>
    )
}
