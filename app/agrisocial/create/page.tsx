'use client'

import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'

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
    const typeParam = searchParams.get('type')
    const defaultPostType: 'post' | 'krishiclip' | 'story' =
        typeParam === 'krishiclip' ? 'krishiclip' :
        typeParam === 'story' ? 'story' : 'post'

    const [postType, setPostType] = useState<'post' | 'krishiclip' | 'story'>(defaultPostType)
    const [mode, setMode] = useState<Mode>('choose')
    const [mediaFile, setMediaFile] = useState<MediaFile | null>(null)
    const [carouselFiles, setCarouselFiles] = useState<MediaFile[]>([])
    const [carouselIdx, setCarouselIdx] = useState(0)
    const [selectedFilter, setSelectedFilter] = useState(0)
    const [caption, setCaption] = useState('')
    const [category, setCategory] = useState('farming')
    const [location, setLocation] = useState('')
    const [allowDownload, setAllowDownload] = useState(true)
    const [audioUrl, setAudioUrl] = useState('')
    const [audioTitle, setAudioTitle] = useState('')
    const [audioArtist, setAudioArtist] = useState('')
    const [audioUploading, setAudioUploading] = useState(false)
    const audioInputRef = useRef<HTMLInputElement>(null)
    const [showMusicLibrary, setShowMusicLibrary] = useState(false)
    const [musicSearch, setMusicSearch] = useState('')

    // ── Built-in music library (royalty-free tracks hosted on Cloudinary) ──
    // Users can pick from these OR upload their own from device
    const MUSIC_LIBRARY = [
        { title: 'Kisan Geet', artist: 'Folk Mix', url: 'https://res.cloudinary.com/dbtebwhi9/video/upload/v1710000000/agrieasy/music/kisan-geet.mp3' },
        { title: 'Harvest Beat', artist: 'AgriBeats', url: 'https://res.cloudinary.com/dbtebwhi9/video/upload/v1710000000/agrieasy/music/harvest-beat.mp3' },
        { title: 'Rural Rhythm', artist: 'Desi LoFi', url: 'https://res.cloudinary.com/dbtebwhi9/video/upload/v1710000000/agrieasy/music/rural-rhythm.mp3' },
        { title: 'Mandi Vibes', artist: 'AgriBeats', url: 'https://res.cloudinary.com/dbtebwhi9/video/upload/v1710000000/agrieasy/music/mandi-vibes.mp3' },
        { title: 'Tractor Groove', artist: 'Folk Mix', url: 'https://res.cloudinary.com/dbtebwhi9/video/upload/v1710000000/agrieasy/music/tractor-groove.mp3' },
        { title: 'Field Ambient', artist: 'Nature Sounds', url: 'https://res.cloudinary.com/dbtebwhi9/video/upload/v1710000000/agrieasy/music/field-ambient.mp3' },
    ]

    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [camError, setCamError] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [brightness, setBrightness] = useState(100)
    const [contrast, setContrast] = useState(100)
    const [saturation, setSaturation] = useState(100)
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
    const [rotation, setRotation] = useState(0)

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

    useEffect(() => {
        if (mode === 'camera' && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current
            videoRef.current.play()
        }
    }, [mode])

    const startCamera = async () => {
        setCamError('')
        setMode('camera')
        await new Promise(r => setTimeout(r, 100))
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode } }, audio: postType === 'krishiclip' })
            streamRef.current = stream
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
        } catch (e) {
            console.error(e)
            stopCamera()
            setMode('choose')
            setCamError('Camera access denied. Please allow camera permission in your browser settings, or use "Upload from Gallery" instead.')
        }
    }

    const flipCamera = async () => {
        const newFacing = facingMode === 'user' ? 'environment' : 'user'
        setFacingMode(newFacing)
        stopCamera()
        await new Promise(r => setTimeout(r, 200))
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: newFacing } }, audio: postType === 'krishiclip' })
            streamRef.current = stream
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
        } catch (e) {
            console.error('Flip camera failed:', e)
            // Try the other facing mode as fallback
            try {
                const fallback = newFacing === 'user' ? 'environment' : 'user'
                const stream2 = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: fallback } }, audio: postType === 'krishiclip' })
                streamRef.current = stream2
                setFacingMode(fallback)
                if (videoRef.current) { videoRef.current.srcObject = stream2; videoRef.current.play() }
            } catch {
                setCamError('Could not switch camera. Your device may not support front camera.')
                startCamera()
            }
        }
    }

    const capturePhoto = async () => {
        if (!videoRef.current) return
        const vw = videoRef.current.videoWidth || 1280, vh = videoRef.current.videoHeight || 720
        let w = vw, h = vh
        if (w > 1920) { h = Math.round(h * 1920 / w); w = 1920 }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        // Front camera: un-mirror the captured photo (the live preview is
        // mirrored for natural UX, but the saved photo should NOT be mirrored)
        if (facingMode === 'user') {
            ctx.translate(w, 0)
            ctx.scale(-1, 1)
        }
        ctx.filter = buildFilterString()
        ctx.drawImage(videoRef.current, 0, 0, w, h)
        canvas.toBlob(blob => {
            if (!blob) return
            const url = URL.createObjectURL(blob)
            setMediaFile({ url, type: 'image', blob })
            stopCamera()
            setMode('preview')
        }, 'image/jpeg', 0.85)
    }

    const getSupportedMimeType = () => {
        const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=h264,opus', 'video/webm', 'video/mp4']
        return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
    }

    const startRecording = () => {
        if (!streamRef.current) return
        chunksRef.current = []
        const mimeType = getSupportedMimeType()
        const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType } : {})
        mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        mr.onstop = () => {
            const blobMime = mimeType || 'video/webm'
            const blob = new Blob(chunksRef.current, { type: blobMime })
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

    const compressImage = async (blob: Blob): Promise<Blob> => {
        const img = new Image()
        const url = URL.createObjectURL(blob)
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
        URL.revokeObjectURL(url)
        let w = img.width, h = img.height
        if (w > 1920) { h = Math.round(h * 1920 / w); w = 1920 }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        return new Promise(resolve => canvas.toBlob(b => resolve(b || blob), 'image/jpeg', 0.8) as unknown as void)
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files
        if (!files || files.length === 0) return

        if (postType === 'post' && files.length > 1) {
            const newFiles: MediaFile[] = []
            for (let i = 0; i < Math.min(files.length, 10); i++) {
                const file = files[i]
                let blob: Blob = file
                if (file.type.startsWith('image')) {
                    try { blob = await compressImage(file) } catch { blob = file }
                }
                const url = URL.createObjectURL(blob)
                newFiles.push({ url, type: file.type.startsWith('video') ? 'video' : 'image', blob })
            }
            setCarouselFiles(newFiles)
            setCarouselIdx(0)
            setMediaFile(newFiles[0])
            setMode('preview')
            return
        }

        const file = files[0]
        let blob: Blob = file
        if (file.type.startsWith('image')) {
            try { blob = await compressImage(file) } catch { blob = file }
        }
        const url = URL.createObjectURL(blob)
        const type = file.type.startsWith('video') ? 'video' : 'image'
        setMediaFile({ url, type, blob })
        setMode('preview')
    }

    const buildFilterString = () => {
        const base = FILTERS[selectedFilter].style !== 'none' ? FILTERS[selectedFilter].style : ''
        const adj = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
        return base ? `${base} ${adj}` : adj
    }

    const getFilterStyle = () => ({ filter: buildFilterString(), transform: `rotate(${rotation}deg)` })

    const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.size > 15 * 1024 * 1024) { setError('Audio file too large (max 15MB)'); return }
        setAudioUploading(true); setError('')
        try {
            const sigRes = await authFetch('/api/social/upload-signature?kind=video')
            const sig = await sigRes.json()
            if (!sig.available) { setError('Audio upload not configured'); return }
            const fd = new FormData()
            fd.append('file', file)
            fd.append('api_key', sig.apiKey)
            fd.append('timestamp', sig.timestamp.toString())
            fd.append('signature', sig.signature)
            fd.append('folder', sig.folder)
            fd.append('resource_type', 'auto')
            const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/auto/upload`, { method: 'POST', body: fd })
            const cld = await cldRes.json()
            if (cldRes.ok && cld.secure_url) {
                setAudioUrl(cld.secure_url)
                // Extract song name from filename (remove extension)
                const name = file.name.replace(/\.[^/.]+$/, '')
                setAudioTitle(name)
                setAudioArtist('')
            } else { setError('Audio upload failed') }
        } catch { setError('Audio upload failed') }
        finally { setAudioUploading(false) }
    }

    const handlePost = async () => {
        if (!caption.trim() && !mediaFile) { setError('Add a caption or media'); return }
        const userId = localStorage.getItem('userId')
        if (!userId) { router.push('/auth/login'); return }
        setSubmitting(true); setError('')

        let mediaUrl = ''
        let mediaType = 'text'
        let allMediaUrls: string[] = []

        const filesToUpload = carouselFiles.length > 0 ? carouselFiles : (mediaFile ? [mediaFile] : [])

        if (filesToUpload.length > 0 && filesToUpload.some(f => f.blob)) {
            try {
                const sigRes = await authFetch('/api/social/upload-signature')
                const sig = await sigRes.json()
                if (!sig.available) {
                    setError('Media upload requires Cloudinary configuration. Please contact admin.')
                    setSubmitting(false)
                    return
                }
                if (!sig.apiKey || !sig.cloudName || !sig.signature) {
                    setError('Upload signature incomplete — missing apiKey, cloudName, or signature. Check server env vars.')
                    setSubmitting(false)
                    return
                }

                for (const file of filesToUpload) {
                    if (!file.blob) continue
                    const resourceType = file.type === 'video' ? 'video' : 'image'
                    const fd = new FormData()
                    fd.append('file', file.blob)
                    fd.append('api_key', sig.apiKey)
                    fd.append('timestamp', sig.timestamp.toString())
                    fd.append('signature', sig.signature)
                    fd.append('folder', sig.folder)
                    const cldRes = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`, { method: 'POST', body: fd })
                    const cld = await cldRes.json()
                    if (cldRes.ok && cld.secure_url) {
                        allMediaUrls.push(cld.secure_url)
                    } else {
                        const cldMsg = cld?.error?.message || `Cloudinary HTTP ${cldRes.status}`
                        setError('Upload failed: ' + cldMsg)
                        setSubmitting(false)
                        return
                    }
                }
                if (allMediaUrls.length > 0) {
                    mediaUrl = allMediaUrls[0]
                    mediaType = filesToUpload[0].type
                }
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Unknown error'
                setError('Upload failed: ' + msg + '. If the file is large, try a smaller image or paste a direct URL instead.')
                setSubmitting(false)
                return
            }
        }

        if (postType === 'story') {
            if (!mediaUrl) {
                setError('Stories require a photo or video. Upload one to continue.')
                setSubmitting(false)
                return
            }
            try {
                const res = await authFetch('/api/social/stories', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mediaUrl,
                        mediaType: mediaType === 'video' ? 'video' : 'image',
                        caption: caption || '',
                        duration: 5,
                    }),
                })
                const d = await res.json()
                if (!res.ok) {
                    const apiMsg = d?.error?.message || d?.error || 'Failed to create story'
                    setError(typeof apiMsg === 'string' ? apiMsg : 'Failed to create story')
                    setSubmitting(false)
                    return
                }
                router.push('/agrisocial')
                return
            } catch (e) {
                const msg = e instanceof Error ? e.message : 'Unknown error'
                setError('Failed to create story: ' + msg)
                setSubmitting(false)
                return
            }
        }

        const hashtags = (caption.match(/#(\w+)/g) || []).map(t => t.slice(1).toLowerCase())

        const res = await authFetch('/api/social/posts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                type: postType,
                content: caption,
                mediaUrls: allMediaUrls.length > 0 ? allMediaUrls : (mediaUrl ? [mediaUrl] : []),
                mediaType,
                category,
                location,
                hashtags,
                allowDownload,
                audioUrl,
                audioTitle,
                audioArtist,
            }),
        })
        const d = await res.json()
        if (!res.ok) {
            const apiMsg = d?.error?.message || d?.error || 'Failed'
            setError(typeof apiMsg === 'string' ? apiMsg : 'Failed')
            setSubmitting(false)
            return
        }
        router.push(postType === 'krishiclip' ? '/agrisocial/clips' : '/agrisocial')
    }

    const inp: React.CSSProperties = { width: '100%', padding: '13px 16px', background: SOCIAL.primaryLight, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '12px', color: SOCIAL.text, fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: SHARED.font, transition: 'border-color 0.2s, box-shadow 0.2s' }

    return (
        <div style={{ minHeight: '100vh', background: SOCIAL.bg, fontFamily: SHARED.font }}>
            {/* Nav */}
            <nav style={{ background: 'rgba(255,255,255,0.85)', borderBottom: `1px solid ${SOCIAL.border}`, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: '10px', position: 'sticky', top: 0, zIndex: 100, boxShadow: SHARED.shadow, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
                <button onClick={() => { if (mode === 'choose') router.push('/agrisocial'); else if (mode === 'preview' || mode === 'camera') { stopCamera(); setMode('choose'); setMediaFile(null) } else if (mode === 'details') setMode('preview') }}
                    style={{ background: 'none', border: 'none', color: SOCIAL.primary, fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', transition: 'all 0.2s ease' }}>← Back</button>
                <span style={{ flex: 1, fontWeight: 800, color: SOCIAL.textSecondary, fontSize: '1rem' }}>
                    {mode === 'choose' ? (postType === 'story' ? 'New Story' : postType === 'krishiclip' ? 'New KrishiClip' : 'New Post') : mode === 'camera' ? (isRecording ? '🔴 Recording' : '📷 Camera') : mode === 'preview' ? '✨ Filters' : '📝 Details'}
                </span>
                {mode === 'preview' && <button onClick={() => setMode('details')} style={{ background: SOCIAL.primary, border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s ease' }}>Next →</button>}
                {mode === 'details' && <button onClick={handlePost} disabled={submitting} style={{ background: SOCIAL.green, border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: submitting ? 0.7 : 1, transition: 'all 0.2s ease' }}>{submitting ? 'Posting…' : '✓ Share'}</button>}
            </nav>

            {/* ── CHOOSE MODE ── */}
            {mode === 'choose' && (
                <div style={{ maxWidth: '500px', margin: '0 auto', padding: '24px 16px' }}>
                    {/* Post/KrishiClip toggle */}
                    <div style={{ display: 'flex', background: SOCIAL.primaryLight, borderRadius: '14px', padding: '5px', gap: '4px', marginBottom: '24px', border: `1px solid ${SOCIAL.border}` }}>
                        {(['post', 'krishiclip', 'story'] as const).map(t => (
                            <button key={t} onClick={() => setPostType(t)}
                                style={{ flex: 1, padding: '12px 8px', borderRadius: '11px', border: 'none', cursor: 'pointer', background: postType === t ? SOCIAL.white : 'transparent', color: postType === t ? SOCIAL.textSecondary : SOCIAL.muted, fontWeight: 800, fontSize: '0.86rem', boxShadow: postType === t ? SHARED.shadowMd : 'none', transition: 'all 0.2s ease' }}>
                                {t === 'post' ? '📷 Post' : t === 'krishiclip' ? '🎬 Clip' : '✨ Story'}
                            </button>
                        ))}
                    </div>

                    {postType === 'story' && (
                        <div style={{ background: SOCIAL.primaryLight, border: `1px solid ${SOCIAL.border}`, borderRadius: '12px', padding: '12px 14px', marginBottom: '16px', fontSize: '0.82rem', color: SOCIAL.primary, fontWeight: 600 }}>
                            ✨ Stories last 24 hours and appear at the top of the feed. Upload a photo or short video.
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {/* Camera */}
                        <button onClick={startCamera}
                            style={{ background: SOCIAL.gradient, border: 'none', borderRadius: '16px', padding: '28px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: SHARED.shadowLg, transition: 'all 0.2s ease' }}>
                            <span style={{ fontSize: '2.8rem' }}>{postType === 'krishiclip' ? '🎥' : postType === 'story' ? '✨' : '📸'}</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>{postType === 'krishiclip' ? 'Record a KrishiClip' : postType === 'story' ? 'Capture Story' : 'Open Camera'}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '2px' }}>Take a {postType === 'krishiclip' ? 'video' : 'photo'} using your camera</div>
                            </div>
                        </button>

                        {/* Upload */}
                        <button onClick={() => fileInputRef.current?.click()}
                            style={{ background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '16px', padding: '22px', color: SOCIAL.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', boxShadow: SHARED.shadowMd, transition: 'all 0.2s ease' }}>
                            <span style={{ fontSize: '2.8rem' }}>🖼️</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: SOCIAL.textSecondary }}>Upload from Gallery</div>
                                <div style={{ fontSize: '0.8rem', color: SOCIAL.muted, marginTop: '2px' }}>{postType === 'post' ? 'Choose one or more photos (up to 10 for a carousel)' : 'Choose a photo or video from your device'}</div>
                            </div>
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple={postType === "post"} style={{ display: 'none' }} onChange={handleFileUpload} />

                        {/* Text post */}
                        <button onClick={() => setMode('details')}
                            style={{ background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: '16px', padding: '22px', color: SOCIAL.text, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s ease' }}>
                            <span style={{ fontSize: '2.8rem' }}>✍️</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: SOCIAL.textSecondary }}>Text / Caption Only</div>
                                <div style={{ fontSize: '0.8rem', color: SOCIAL.muted, marginTop: '2px' }}>Share tips, prices, news — no media needed</div>
                            </div>
                        </button>
                    </div>

                    {camError && <div style={{ marginTop: '16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '12px 16px', color: SOCIAL.red, fontSize: '0.85rem' }}>⚠️ {camError}</div>}
                </div>
            )}

            {/* ── CAMERA MODE ── */}
            {mode === 'camera' && (
                <div style={{ position: 'relative', background: '#000', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', flex: 1, objectFit: 'cover', filter: buildFilterString(), transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }} />

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
                                <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'linear-gradient(135deg, #6b7280, #374151)', border: `2px solid ${selectedFilter === i ? SOCIAL.primary : 'rgba(255,255,255,0.3)'}`, filter: f.style === 'none' ? 'none' : f.style, transition: 'all 0.2s ease' }} />
                                <span style={{ color: selectedFilter === i ? SOCIAL.border : 'rgba(255,255,255,0.7)', fontSize: '0.65rem', fontWeight: 700 }}>{f.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Capture controls */}
                    <div style={{ position: 'absolute', bottom: '24px', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '28px', padding: '0 20px' }}>
                        <button onClick={() => fileInputRef.current?.click()}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', transition: 'all 0.2s ease', flexShrink: 0 }}>
                            🖼️
                        </button>
                        {postType === 'post' ? (
                            <button onClick={capturePhoto}
                                style={{ width: '68px', height: '68px', borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.4)', cursor: 'pointer', boxShadow: `0 0 0 3px ${SOCIAL.primary}b3`, transition: 'all 0.2s ease', flexShrink: 0 }} />
                        ) : (
                            <button onClick={isRecording ? stopRecording : startRecording}
                                style={{ width: '68px', height: '68px', borderRadius: '50%', background: isRecording ? SOCIAL.red : '#fff', border: `4px solid ${isRecording ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.4)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px ${isRecording ? 'rgba(239,68,68,0.7)' : SOCIAL.primary + 'b3'}`, transition: 'all 0.2s ease', flexShrink: 0 }}>
                                {isRecording ? <span style={{ display: 'block', width: '22px', height: '22px', borderRadius: '4px', background: '#fff' }} /> : null}
                            </button>
                        )}
                        <button onClick={flipCamera}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.5)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease', padding: 0, flexShrink: 0 }}
                            title="Flip camera">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 7v6h6" />
                                <path d="M21 17v-6h-6" />
                                <path d="M3 13a9 9 0 0 0 15 6.7L21 13" />
                                <path d="M21 11A9 9 0 0 0 6 4.3L3 11" />
                            </svg>
                        </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple={postType === "post"} style={{ display: 'none' }} onChange={handleFileUpload} />
                    <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
                </div>
            )}

            {/* ── PREVIEW + FILTERS ── */}
            {mode === 'preview' && mediaFile && (
                <div style={{ background: '#000', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
                    {/* Media preview */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', maxHeight: '55vh', overflow: 'hidden', position: 'relative' }}>
                        {mediaFile.type === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mediaFile.url} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'contain', ...getFilterStyle() }} />
                        ) : (
                            <video src={mediaFile.url} controls style={{ width: '100%', height: '100%', objectFit: 'contain', ...getFilterStyle() }} />
                        )}
                        {/* Carousel dots + navigation */}
                        {carouselFiles.length > 1 && (
                            <>
                                <div style={{ position: 'absolute', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                                    {carouselFiles.map((_, i) => (
                                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === carouselIdx ? '#3b82f6' : 'rgba(255,255,255,0.5)' }} />
                                    ))}
                                </div>
                                {carouselIdx > 0 && (
                                    <button onClick={() => { const i = Math.max(0, carouselIdx - 1); setCarouselIdx(i); setMediaFile(carouselFiles[i]) }} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '1.4rem' }}>‹</button>
                                )}
                                {carouselIdx < carouselFiles.length - 1 && (
                                    <button onClick={() => { const i = Math.min(carouselFiles.length - 1, carouselIdx + 1); setCarouselIdx(i); setMediaFile(carouselFiles[i]) }} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: '1.4rem' }}>›</button>
                                )}
                                <div style={{ position: 'absolute', bottom: 8, right: 16, background: 'rgba(0,0,0,0.55)', color: '#fff', padding: '3px 10px', borderRadius: 100, fontSize: '0.74rem', fontWeight: 700 }}>{carouselIdx + 1}/{carouselFiles.length}</div>
                            </>
                        )}
                    </div>

                    {/* Filter row */}
                    <div style={{ background: '#111', padding: '12px 0' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>Filters</p>
                        <div style={{ display: 'flex', gap: '10px', padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                            {FILTERS.map((f, i) => (
                                <button key={f.name} onClick={() => setSelectedFilter(i)}
                                    style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                    <div style={{ width: '60px', height: '60px', borderRadius: '10px', overflow: 'hidden', border: `2px solid ${selectedFilter === i ? SOCIAL.primary : 'rgba(255,255,255,0.15)'}`, transition: 'all 0.2s ease' }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={mediaFile.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.style === 'none' ? 'none' : f.style }} />
                                    </div>
                                    <span style={{ color: selectedFilter === i ? SOCIAL.border : 'rgba(255,255,255,0.55)', fontSize: '0.62rem', fontWeight: 700 }}>{f.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Adjustments */}
                    <div style={{ background: '#1a1a1a', padding: '12px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Adjust</p>
                            {/* Rotate buttons */}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <button onClick={() => setRotation(r => r - 90)} title="Rotate left" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>↺</button>
                                <button onClick={() => setRotation(r => r + 90)} title="Rotate right" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>↻</button>
                                {rotation !== 0 && <button onClick={() => setRotation(0)} title="Reset" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.72rem' }}>Reset</button>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>☀️ Bright</span>
                                <input type="range" min={50} max={150} value={brightness} onChange={e => setBrightness(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{brightness}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>◉ Contrast</span>
                                <input type="range" min={50} max={150} value={contrast} onChange={e => setContrast(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{contrast}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>🎨 Saturation</span>
                                <input type="range" min={0} max={200} value={saturation} onChange={e => setSaturation(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{saturation}%</span>
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

                    <div style={{ background: SOCIAL.white, border: `1px solid ${SOCIAL.border}`, borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', boxShadow: SHARED.shadowMd }}>
                        {/* Caption */}
                        <div>
                            <label style={{ color: SOCIAL.muted, fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Caption</label>
                            <textarea value={caption} onChange={e => setCaption(e.target.value)} placeholder={postType === 'krishiclip' ? 'Tell people about this KrishiClip… #farming' : 'What\'s happening on your farm today? #farming'} rows={3}
                                style={{ ...inp, resize: 'vertical', lineHeight: 1.5 } as React.CSSProperties} />
                            <p style={{ color: SOCIAL.muted, fontSize: '0.7rem', margin: '3px 0 0', textAlign: 'right' }}>{caption.length}/2200</p>
                        </div>

                        {/* Category */}
                        <div>
                            <label style={{ color: SOCIAL.muted, fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Category</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {CATEGORIES.map(c => (
                                    <button key={c} onClick={() => setCategory(c)}
                                        style={{ padding: '5px 12px', borderRadius: '100px', border: `1.5px solid ${category === c ? SOCIAL.primary : SOCIAL.border}`, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700, background: category === c ? SOCIAL.primary : SOCIAL.white, color: category === c ? '#fff' : SOCIAL.muted, transition: 'all 0.2s ease' }}>
                                        {c}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Location */}
                        <div>
                            <label style={{ color: SOCIAL.muted, fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📍 Location (optional)</label>
                            <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g., Nashik, Maharashtra" style={inp} />
                        </div>

                        {/* Allow Download toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: SOCIAL.bgSub, borderRadius: 10, border: `1px solid ${SOCIAL.border}` }}>
                            <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: SOCIAL.text }}>Allow Download</p>
                                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: SOCIAL.muted }}>Let viewers download your {postType === 'krishiclip' ? 'clip' : 'post'}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setAllowDownload(v => !v)}
                                style={{
                                    width: 48, height: 28, borderRadius: 100, border: 'none', cursor: 'pointer',
                                    background: allowDownload ? SOCIAL.green : '#CBD5E1',
                                    position: 'relative', transition: 'background 0.2s ease',
                                }}
                            >
                                <span style={{
                                    position: 'absolute', top: 3, left: allowDownload ? 23 : 3,
                                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s ease',
                                }} />
                            </button>
                        </div>

                        {/* Add Music — in-app library + device upload */}
                        <div>
                            <label style={{ color: SOCIAL.muted, fontSize: '0.72rem', fontWeight: 700, display: 'block', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>🎵 Add Music (optional)</label>
                            {audioUrl ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: SOCIAL.primaryLight, borderRadius: 12, padding: '12px 14px', border: `1px solid ${SOCIAL.border}` }}>
                                    <span style={{ fontSize: '1.3rem' }}>🎵</span>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: SOCIAL.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{audioTitle || 'Unknown track'}</p>
                                        {audioArtist && <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: SOCIAL.muted }}>{audioArtist}</p>}
                                    </div>
                                    <button onClick={() => { setAudioUrl(''); setAudioTitle(''); setAudioArtist('') }} style={{ background: 'none', border: 'none', color: SOCIAL.red, cursor: 'pointer', fontSize: '1.1rem', padding: 4, flexShrink: 0 }}>✕</button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button onClick={() => setShowMusicLibrary(true)}
                                        style={{ flex: 1, padding: '12px', background: SOCIAL.primary, border: 'none', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#fff', fontSize: '0.82rem', fontWeight: 700, transition: 'all 0.2s' }}>
                                        🎵 Browse Music
                                    </button>
                                    <button onClick={() => audioInputRef.current?.click()} disabled={audioUploading}
                                        style={{ padding: '12px 16px', background: SOCIAL.white, border: `1.5px solid ${SOCIAL.border}`, borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, color: SOCIAL.muted, fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s', flexShrink: 0 }}>
                                        {audioUploading ? '⏳' : '📤'}
                                    </button>
                                </div>
                            )}
                            <input ref={audioInputRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg" style={{ display: 'none' }} onChange={handleAudioUpload} />
                        </div>

                        {/* Music Library Modal */}
                        {showMusicLibrary && (
                            <div onClick={() => setShowMusicLibrary(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                <div onClick={e => e.stopPropagation()} style={{ background: SOCIAL.white, borderRadius: '20px 20px 0 0', padding: '20px', width: '100%', maxWidth: '500px', maxHeight: '70vh', overflowY: 'auto', boxShadow: SHARED.shadowXl }}>
                                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E0E0E0', margin: '0 auto 16px' }} />
                                    <h3 style={{ margin: '0 0 12px', color: SOCIAL.text, fontWeight: 800, fontSize: '1.1rem' }}>🎵 Choose Music</h3>
                                    <input value={musicSearch} onChange={e => setMusicSearch(e.target.value)} placeholder="Search songs..." style={{ width: '100%', padding: '10px 14px', border: `1.5px solid ${SOCIAL.border}`, borderRadius: 10, fontSize: '0.88rem', color: SOCIAL.text, outline: 'none', boxSizing: 'border-box', fontFamily: SHARED.font, marginBottom: 12 }} />
                                    {MUSIC_LIBRARY.filter(s => s.title.toLowerCase().includes(musicSearch.toLowerCase()) || s.artist.toLowerCase().includes(musicSearch.toLowerCase())).map((song, i) => (
                                        <button key={i} onClick={() => { setAudioUrl(song.url); setAudioTitle(song.title); setAudioArtist(song.artist); setShowMusicLibrary(false) }}
                                            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px', background: 'transparent', border: `1px solid ${SOCIAL.borderLight}`, borderRadius: 10, cursor: 'pointer', marginBottom: 8, transition: 'all 0.2s' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = SOCIAL.primaryLight }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                                            <div style={{ width: 40, height: 40, borderRadius: 8, background: SOCIAL.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>🎵</div>
                                            <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                                                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.85rem', color: SOCIAL.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{song.title}</p>
                                                <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: SOCIAL.muted }}>{song.artist}</p>
                                            </div>
                                            <span style={{ color: SOCIAL.muted, fontSize: '1.2rem', flexShrink: 0 }}>＋</span>
                                        </button>
                                    ))}
                                    <button onClick={() => setShowMusicLibrary(false)} style={{ width: '100%', padding: '12px', background: SOCIAL.bgSub, border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.88rem', color: SOCIAL.textSecondary, cursor: 'pointer', marginTop: 8 }}>Cancel</button>
                                </div>
                            </div>
                        )}

                        {error && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '10px 14px', color: SOCIAL.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <button onClick={handlePost} disabled={submitting}
                            style={{ width: '100%', padding: '14px', background: SOCIAL.primary, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: submitting ? 0.7 : 1, transition: 'all 0.2s ease' }}>
                            {submitting ? '⏳ Sharing…' : postType === 'krishiclip' ? '🎬 Share KrishiClip' : postType === 'story' ? '✨ Share Story' : '📢 Share Post'}
                        </button>
                    </div>

                    {/* Bottom nav link */}
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                        <Link href="/agrisocial" style={{ color: SOCIAL.muted, fontSize: '0.85rem', textDecoration: 'none', transition: 'all 0.2s ease' }}>← Cancel &amp; go back to feed</Link>
                    </div>
                </div>
            )}

            <style>{`
        input[type=range] { height: 4px; border-radius: 2px; }
        textarea:focus, input[type=text]:focus { border-color: ${SOCIAL.primary} !important; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
        </div>
    )
}

export default function CreatePost() {
    return (
        <Suspense fallback={<div style={{ minHeight: '100vh', background: SOCIAL.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: SOCIAL.primary, fontWeight: 700, fontFamily: SHARED.font }}>Loading…</div>}>
            <CreateContent />
        </Suspense>
    )
}