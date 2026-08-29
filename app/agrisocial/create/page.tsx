'use client'

import { Suspense, useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authFetch } from '@/lib/auth-fetch'
import { SOCIAL, SHARED } from '@/lib/styles'
import { applyInstagramFilterToBlob } from '@/lib/camera-presets'
import { ADVANCED_FILTERS, FILTER_CATEGORIES } from '@/lib/advanced-filters'
import { useAdvancedFilter } from '@/lib/use-advanced-filter'
import ProCamera from '../components/ProCamera'

const CATEGORIES = ['farming', 'agritrading', 'technique', 'equipment', 'weather', 'livestock', 'organic', 'general']

// ── ADVANCED FILTER ENGINE ──────────────────────────────────────────
// 23 presets in 7 categories: Natural, Cinematic, Film, Vintage, Vivid,
// Mono, Artistic. Each preset combines:
//   - CSS-level preview filter (instant)
//   - Pixel-level ops (white balance, tone curves, split-toning, HSL bands,
//     film grain, master saturation/contrast/brightness)
//   - Canvas-composite ops (vignette, light leak, bloom, Orton effect)
//
// All applied via Web Worker for off-main-thread processing.
// What you see in the preview is exactly what gets uploaded.
//
// See lib/advanced-filters.ts for the full pipeline.
const FILTERS = ADVANCED_FILTERS

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
    const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')
    const [mode, setMode] = useState<Mode>('choose')
    const [mediaFile, setMediaFile] = useState<MediaFile | null>(null)
    // Tracks which camera facing was used for the most recent capture.
    // Used to (a) mirror the displayed <img> via CSS so it matches the
    // CSS-mirrored live preview, and (b) bake a canvas mirror into the
    // uploaded blob so the saved post is also mirrored (Instagram-style
    // WYSIWYG selfie). captureProcessedStill no longer mirrors in the
    // capture canvas; this is the source of truth for mirror behavior.
    const [lastCaptureFacing, setLastCaptureFacing] = useState<'user' | 'environment'>('environment')
    const [carouselFiles, setCarouselFiles] = useState<MediaFile[]>([])
    const [carouselIdx, setCarouselIdx] = useState(0)
    const [selectedFilter, setSelectedFilter] = useState(0)
    const [advancedFilterPreview, setAdvancedFilterPreview] = useState<string | null>(null)
    // Web Worker-based advanced filter hook. Applies the full pixel-level
    // pipeline off the main thread so the UI stays smooth during filter
    // baking on large 1080p+ images.
    const { applyFilter: applyAdvancedFilter, previewFilter, isProcessing: isFilterProcessing } = useAdvancedFilter()
    const [caption, setCaption] = useState('')
    const [category, setCategory] = useState('farming')
    const [location, setLocation] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [error, setError] = useState('')
    const [camError, setCamError] = useState('')
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [brightness, setBrightness] = useState(100)  // 80..120 (% of filter's baked brightness)
    const [contrast, setContrast] = useState(100)      // 80..120
    const [saturation, setSaturation] = useState(100)  // 70..130
    // New pro sliders — overlay adjustments baked into the upload,
    // not just CSS preview. Wire: buildMergedFilter() consumes all
    // 9 slider values and overlays them on the base FilterDefinition.
    const [warmth, setWarmth] = useState(0)            // -50..+50 (° Kelvin shift)
    const [highlights, setHighlights] = useState(0)    // -50..+50
    const [shadows, setShadows] = useState(0)           // -50..+50
    const [fade, setFade] = useState(0)                  // 0..50
    const [sharpen, setSharpen] = useState(0)            // 0..50
    const [vignette, setVignette] = useState(0)          // 0..50 (adds/extends vignette)
    const [showProAdjust, setShowProAdjust] = useState(false)  // toggle for the 6 new sliders
    const [rotation, setRotation] = useState(0)
    const [proCameraOpen, setProCameraOpen] = useState(false)

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

    // Sync postType with URL ?type= param on client-side navigation (Fix: Issue 1)
    // Without this, navigating between /create and /create?type=krishiclip doesn't update postType
    useEffect(() => {
        if (typeParam === 'krishiclip') setPostType('krishiclip')
        else if (typeParam === 'story') setPostType('story')
        else setPostType('post')
    }, [typeParam])

    useEffect(() => {
        if (mode === 'camera' && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current
            videoRef.current.play()
        }
    }, [mode])

    const startCamera = async () => {
        setCamError('')
        setProCameraOpen(true)
    }

    // Called by ProCamera when a photo or video is captured.
    // Replaces the old in-page getUserMedia + MediaRecorder flow with
    // the Instagram-grade ProCamera pipeline (HDR, tap-to-focus, 4K,
    // sharpening, denoise, white balance, color grading, proper EXIF).
    const handleProCameraCapture = (blob: Blob, type: 'image' | 'video', facing: 'user' | 'environment' = 'environment') => {
        const url = URL.createObjectURL(blob)
        setMediaFile({ url, type, blob })
        setLastCaptureFacing(facing)
        setProCameraOpen(false)
        setMode('preview')
    }

    // Flip between front (user) and back (environment) camera
    const flipCamera = async () => {
        const next = facingMode === 'environment' ? 'user' : 'environment'
        setFacingMode(next)
        stopCamera()
        await new Promise(r => setTimeout(r, 50))
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: next } }, audio: postType === 'krishiclip' })
            streamRef.current = stream
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
        } catch (e) {
            console.error(e)
            stopCamera()
            setMode('choose')
            setCamError('Could not switch camera. Your device may not have a front camera.')
        }
    }

    const capturePhoto = async () => {
        if (!videoRef.current) return
        const video = videoRef.current
        const vw = video.videoWidth || 1280, vh = video.videoHeight || 720

        // Detect the ACTUAL facing mode from the live media stream — don't rely
        // on React state, which can be stale if the user switched cameras just
        // before capturing.
        let actualFacing: 'user' | 'environment' = facingMode
        if (streamRef.current) {
            const track = streamRef.current.getVideoTracks()[0]
            const settings = track?.getSettings?.() as any
            if (settings?.facingMode === 'user' || settings?.facingMode === 'environment') {
                actualFacing = settings.facingMode
            }
        }

        // Capture the FULL video frame.
        let outW = vw, outH = vh
        if (outW > 1920) { outH = Math.round(outH * 1920 / outW); outW = 1920 }

        const canvas = document.createElement('canvas')
        canvas.width = outW
        canvas.height = outH
        const ctx = canvas.getContext('2d')
        if (!ctx) return

        // ── MIRROR LOGIC ──
        // The camera preview <video> has transform: scaleX(-1) applied via CSS
        // when facingMode === 'user'. This makes the preview feel like a mirror
        // (natural for selfies).
        //
        // IMPORTANT: CSS transforms do NOT affect ctx.drawImage(). The canvas
        // always draws the RAW video frame, regardless of CSS transforms on the
        // <video> element. So we MUST manually mirror the canvas drawing to
        // match what the user saw in the mirrored preview.
        //
        // Without this mirror, a selfie captured while the user tilts their
        // head LEFT would show the head tilted RIGHT in the photo (because the
        // raw sensor captures the non-mirrored view, as others see you).
        //
        // We mirror when actualFacing === 'user' (front camera / selfie).
        if (actualFacing === 'user') {
            ctx.translate(outW, 0)
            ctx.scale(-1, 1)
        }

        // Draw the full frame. No filter baked in.
        ctx.drawImage(video, 0, 0, outW, outH)

        // Reset the transform (cleanup for any future draws)
        ctx.setTransform(1, 0, 0, 1, 0, 0)

        canvas.toBlob(blob => {
            if (!blob) return
            const url = URL.createObjectURL(blob)
            setMediaFile({ url, type: 'image', blob })
            stopCamera()
            setMode('preview')
        }, 'image/jpeg', 0.92)
    }

    const getSupportedMimeType = () => {
        const types = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm;codecs=h264,opus', 'video/webm', 'video/mp4']
        return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
    }

    const startRecording = () => {
        if (!streamRef.current) return
        chunksRef.current = []
        const mimeType = getSupportedMimeType()
        // Limit video bitrate to 2.5 Mbps — keeps 2-min video under ~37MB instead of 100MB+
        // This is the #1 fix for slow uploads — smaller files upload 4x faster
        const mr = new MediaRecorder(streamRef.current, mimeType ? { mimeType, videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 } : { videoBitsPerSecond: 2_500_000, audioBitsPerSecond: 128_000 })
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
        mr.start(100) // collect data in 100ms chunks
        mediaRecorderRef.current = mr
        setIsRecording(true)
        setRecordingTime(0)
        timerRef.current = setInterval(() => {
            setRecordingTime(t => {
                // Auto-stop at 3 minutes (180 seconds) — prevents huge files
                if (t + 1 >= 180) {
                    stopRecording()
                    return 180
                }
                return t + 1
            })
        }, 1000)
    }

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
        }
    }

    const compressImage = async (blob: Blob): Promise<Blob> => {
        const img = new Image()
        const url = URL.createObjectURL(blob)
        await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = reject; img.src = url })
        URL.revokeObjectURL(url)
        let w = img.width, h = img.height
        // Cap at 2400px on the long edge — keeps enough resolution for
        // 4K displays at typical viewing sizes without bloating uploads.
        // (Was 1920 + JPEG q=0.8 — visibly worse than camera-captured photos.)
        if (w > 2400) { h = Math.round(h * 2400 / w); w = 2400 }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, w, h)
        return new Promise(resolve => canvas.toBlob(b => resolve(b || blob), 'image/jpeg', 0.92) as unknown as void)
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
        const f = FILTERS[selectedFilter]
        // Advanced filter — use the CSS-level preview for instant feedback.
        // The full pixel-level pipeline (tone curves, split-toning, grain,
        // vignette, bloom, Orton) is applied at upload time via the
        // useAdvancedFilter hook → Web Worker.
        const base = f.previewCss !== 'none' ? f.previewCss : ''
        const adj = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
        return base ? `${base} ${adj}` : adj
    }

    /**
     * Build a merged FilterDefinition that overlays the user's slider
     * adjustments on top of the selected base filter. Both previewFilter
     * (live preview) and applyAdvancedFilter (upload bake) consume this
     * merged filter — so what the user sees is exactly what gets uploaded.
     *
     * Slider-to-filter mapping:
     *   brightness (80-120%)  → multiplies filter.brightness (default 1.0)
     *   contrast   (80-120%)  → multiplies filter.contrast   (default 1.0)
     *   saturation (70-130%)  → multiplies filter.saturation (default 1.0)
     *   warmth     (-50..+50) → adds to filter.whiteBalance.temperature (range ±50)
     *   highlights (-50..+50) → sets filter.toneRegions.highlights (range -1..+1)
     *   shadows    (-50..+50) → sets filter.toneRegions.shadows  (range -1..+1)
     *   fade       (0..50)    → sets filter.toneRegions.fade (range 0..1)
     *   sharpen    (0..50)    → sets filter.sharpen { amount, radius, threshold }
     *   vignette   (0..50)    → overrides/extends filter.vignette.amount
     *
     * Returns a fresh object each call — never mutates the base filter.
     */
    const buildMergedFilter = () => {
        const base = FILTERS[selectedFilter]
        return {
            ...base,
            // Master adjustments: multiply base values by slider ratio
            brightness: (base.brightness ?? 1) * (brightness / 100),
            contrast:   (base.contrast   ?? 1) * (contrast   / 100),
            saturation: (base.saturation ?? 1) * (saturation / 100),
            // White balance: overlay warmth slider (±50 = ±50° K shift)
            whiteBalance: base.whiteBalance
                ? { ...base.whiteBalance, temperature: (base.whiteBalance.temperature ?? 0) + warmth }
                : (warmth !== 0 ? { temperature: warmth, tint: 0 } : undefined),
            // Tone regions: highlights/shadows/fade (only set if non-zero)
            toneRegions: (highlights !== 0 || shadows !== 0 || fade !== 0)
                ? {
                    highlights: highlights / 50,
                    shadows: shadows / 50,
                    fade: fade / 50,
                }
                : base.toneRegions,
            // Sharpen (only set if slider > 0)
            sharpen: sharpen > 0
                ? { amount: sharpen / 25, radius: 1.5, threshold: 4 }  // amount 0..2
                : base.sharpen,
            // Vignette: if slider > 0, override/extend base vignette
            vignette: vignette > 0
                ? {
                    amount: vignette / 100,   // 0..0.5 strength
                    size: base.vignette?.size ?? 0.4,
                    feather: base.vignette?.feather ?? 0.5,
                    tint: base.vignette?.tint ?? 0,
                }
                : base.vignette,
        }
    }

    // Live preview of the FULL advanced filter pipeline (not just CSS).
    // Runs when the user changes the selected filter while in preview mode.
    // Uses a small preview dimension (480px) so the Web Worker finishes
    // in ~150ms even on mid-range phones.
    useEffect(() => {
        if (mode !== 'preview' || !mediaFile || mediaFile.type !== 'image' || !mediaFile.blob) {
            setAdvancedFilterPreview(null)
            return
        }
        let cancelled = false
        // Pass mirrorSelfie so the worker-baked preview blob is already
        // mirrored for front-camera captures — keeps the displayed
        // preview WYSIWYG with the uploaded post. Without this, the
        // selfie would flip back to the un-mirrored "real" orientation
        // as soon as the worker finishes (~150ms after capture).
        previewFilter(mediaFile.blob, buildMergedFilter(), { maxWidth: 480, mirrorSelfie: lastCaptureFacing === 'user' })
            .then(url => { if (!cancelled) setAdvancedFilterPreview(url) })
            .catch(() => { if (!cancelled) setAdvancedFilterPreview(null) })
        return () => {
            cancelled = true
            setAdvancedFilterPreview(prev => { if (prev) URL.revokeObjectURL(prev); return null })
        }
    }, [mode, mediaFile, selectedFilter, previewFilter, brightness, contrast, saturation, warmth, highlights, shadows, fade, sharpen, vignette])

    const getFilterStyle = () => ({ filter: buildFilterString(), transform: `rotate(${rotation}deg)` })

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
                // SECURITY: fetch one signature per kind (image / video)
                // present. Each signature binds resource_type +
                // allowed_formats server-side, blocking SVG / HTML / PDF
                // upload via the image endpoint (stored XSS vector).
                const kinds = Array.from(new Set(
                    filesToUpload
                        .filter(f => f.blob)
                        .map(f => f.type === 'video' ? 'video' : 'image')
                ))
                const sigs: Record<string, any> = {}
                for (const kind of kinds) {
                    const sigRes = await authFetch(`/api/social/upload-signature?kind=${kind}`)
                    if (!sigRes.ok) {
                        const errBody = await sigRes.json().catch(() => ({}))
                        setError(errBody?.error || `Authentication failed (HTTP ${sigRes.status}). Please log in again.`)
                        setSubmitting(false)
                        return
                    }
                    const sig = await sigRes.json()
                    if (!sig.available) {
                        setError('Upload unavailable. Please try again or contact support.')
                        setSubmitting(false)
                        return
                    }
                    if (!sig.apiKey || !sig.cloudName || !sig.signature) {
                        setError('Upload signature incomplete — missing apiKey, cloudName, or signature. Check server env vars.')
                        setSubmitting(false)
                        return
                    }
                    sigs[kind] = sig
                }

                setUploadProgress(0)
                for (const file of filesToUpload) {
                    if (!file.blob) continue
                    // *** ADVANCED FILTER PIPELINE ***
                    // Use the Web Worker-based advanced filter engine.
                    // Applies the FULL pixel-level pipeline (white balance,
                    // tone curves, split-toning, HSL bands, film grain,
                    // vignette, light leak, bloom, Orton) — not just CSS.
                    // This is what makes our filters competitive with /
                    // better than Instagram's. Falls back to the simpler
                    // CSS-based baker if the worker fails.
                    //
                    // SECURITY/WYSIWYG: pass `mirrorSelfie: lastCaptureFacing === 'user'`
                    // so front-camera selfies get a canvas mirror baked into
                    // the uploaded blob — matches what the user saw during
                    // capture (CSS-mirrored live preview). Without this, the
                    // saved post would show the "real" un-mirrored orientation,
                    // which doesn't match the in-app preview.
                    let uploadBlob: Blob = file.blob
                    const mirrorSelfie = lastCaptureFacing === 'user' && file.type === 'image'
                    if (file.type === 'image') {
                        try {
                            uploadBlob = await applyAdvancedFilter(file.blob, buildMergedFilter(), mirrorSelfie)
                        } catch (e) {
                            console.warn('Advanced filter failed, falling back to CSS baker:', e)
                            try {
                                uploadBlob = await applyInstagramFilterToBlob(file.blob, buildFilterString(), mirrorSelfie)
                            } catch (e2) {
                                console.warn('CSS baker also failed, uploading original:', e2)
                                uploadBlob = file.blob
                            }
                        }
                    }
                    const resourceType = file.type === 'video' ? 'video' : 'image'
                    const sig = sigs[resourceType]
                    const fd = new FormData()
                    fd.append('file', uploadBlob)
                    fd.append('api_key', sig.apiKey)
                    fd.append('timestamp', sig.timestamp.toString())
                    fd.append('signature', sig.signature)
                    fd.append('folder', sig.folder)
                    // SECURITY: forward the signed params to Cloudinary —
                    // required because the signature now binds resource_type
                    // + allowed_formats. Cloudinary rejects uploads that
                    // omit any signed parameter with "Invalid Signature".
                    fd.append('resource_type', sig.resourceType)
                    fd.append('allowed_formats', sig.allowedFormats)

                    // Use XMLHttpRequest instead of fetch — gives us upload progress tracking
                    const uploadUrl = `https://api.cloudinary.com/v1_1/${sig.cloudName}/${resourceType}/upload`
                    const cld = await new Promise<any>((resolve, reject) => {
                        const xhr = new XMLHttpRequest()
                        xhr.open('POST', uploadUrl)

                        // Track upload progress
                        xhr.upload.onprogress = (e) => {
                            if (e.lengthComputable) {
                                const pct = Math.round((e.loaded / e.total) * 100)
                                setUploadProgress(pct)
                            }
                        }

                        xhr.onload = () => {
                            try {
                                const res = JSON.parse(xhr.responseText)
                                if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) {
                                    resolve(res)
                                } else {
                                    reject(new Error(res?.error?.message || `Cloudinary HTTP ${xhr.status}`))
                                }
                            } catch {
                                reject(new Error(`Cloudinary HTTP ${xhr.status}`))
                            }
                        }

                        xhr.onerror = () => reject(new Error('Network error during upload. Check your connection.'))
                        xhr.ontimeout = () => reject(new Error('Upload timed out. Try a shorter video or check your connection.'))
                        xhr.timeout = 120000 // 2 minute timeout for large videos
                        xhr.send(fd)
                    }).catch(e => {
                        const msg = e instanceof Error ? e.message : 'Upload failed'
                        setError(msg)
                        setSubmitting(false)
                        setUploadProgress(0)
                        return null
                    })

                    if (!cld) return
                    allMediaUrls.push(cld.secure_url)
                }
                setUploadProgress(100)
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
                {mode === 'details' && <button onClick={handlePost} disabled={submitting} style={{ background: SOCIAL.green, border: 'none', borderRadius: '8px', padding: '8px 16px', color: '#fff', fontWeight: 800, cursor: 'pointer', opacity: submitting ? 0.7 : 1, transition: 'all 0.2s ease' }}>{submitting ? (uploadProgress > 0 && uploadProgress < 100 ? `⏳ ${uploadProgress}%` : '⏳…') : '✓ Share'}</button>}
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

                    {camError && <div style={{ marginTop: '16px', background: '#fef2f2', border: '1px solid rgba(217,83,79,0.4)', borderRadius: '12px', padding: '12px 16px', color: SOCIAL.red, fontSize: '0.85rem' }}>⚠️ {camError}</div>}
                </div>
            )}

            {/* ── CAMERA MODE ── */}
            {mode === 'camera' && (
                <div style={{ position: 'relative', background: '#000', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <video ref={videoRef} autoPlay playsInline muted style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 56px)', width: 'auto', height: 'auto', objectFit: 'contain', transform: facingMode === 'user' ? 'scaleX(-1)' : 'none', background: '#000' }} />

                    {/* Recording timer */}
                    {isRecording && (
                        <div style={{ position: 'absolute', top: '16px', left: '50%', transform: 'translateX(-50%)', background: 'rgba(217,83,79,0.9)', borderRadius: '100px', padding: '4px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
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
                                <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'linear-gradient(135deg, #42476E, #D9534F)', border: `2px solid ${selectedFilter === i ? SOCIAL.primary : 'rgba(255,255,255,0.3)'}`, filter: f.previewCss === 'none' ? 'none' : f.previewCss, transition: 'all 0.2s ease' }} />
                                <span style={{ color: selectedFilter === i ? SOCIAL.border : 'rgba(255,255,255,0.7)', fontSize: '0.65rem', fontWeight: 700 }}>{f.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Capture controls */}
                    <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
                        <button onClick={() => fileInputRef.current?.click()}
                            style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', transition: 'all 0.2s ease' }}>
                            🖼️
                        </button>
                        {postType === 'post' ? (
                            <button onClick={capturePhoto}
                                style={{ width: '72px', height: '72px', borderRadius: '50%', background: '#fff', border: '4px solid rgba(255,255,255,0.4)', cursor: 'pointer', boxShadow: `0 0 0 3px ${SOCIAL.primary}b3`, transition: 'all 0.2s ease' }} />
                        ) : (
                            <button onClick={isRecording ? stopRecording : startRecording}
                                style={{ width: '72px', height: '72px', borderRadius: '50%', background: isRecording ? SOCIAL.red : '#fff', border: `4px solid ${isRecording ? 'rgba(217,83,79,0.4)' : 'rgba(255,255,255,0.4)'}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px ${isRecording ? 'rgba(217,83,79,0.7)' : SOCIAL.primary + 'b3'}`, transition: 'all 0.2s ease' }}>
                                {isRecording ? <span style={{ display: 'block', width: '22px', height: '22px', borderRadius: '4px', background: '#fff' }} /> : null}
                            </button>
                        )}
                        <button onClick={flipCamera} title="Flip camera"
                            style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '2px solid rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem', transition: 'all 0.2s ease' }}>
                            🔄
                        </button>
                    </div>
                    <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple={postType === "post"} style={{ display: 'none' }} onChange={handleFileUpload} />
                    <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
                </div>
            )}

            {/* ── PREVIEW + FILTERS ── */}
            {mode === 'preview' && mediaFile && (
                <div style={{ background: '#000', minHeight: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
                    {/* Media preview — full photo on neutral black background.
                        objectFit: 'contain' preserves the entire image without cropping. */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '52vh', overflow: 'hidden', position: 'relative', background: '#000' }}>
                        {mediaFile.type === 'image' ? (
                            // Use the Web-Worker-rendered preview when available
                            // (full pixel-level pipeline result, including
                            // grain/vignette/bloom/etc.). Falls back to the
                            // raw capture URL with CSS filter when the worker
                            // is still rendering or has failed.
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={advancedFilterPreview || mediaFile.url} alt="preview" style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', transform: `rotate(${rotation}deg)${lastCaptureFacing === 'user' && !advancedFilterPreview ? ' scaleX(-1)' : ''}`, ...(advancedFilterPreview ? {} : getFilterStyle()) }} />
                        ) : (
                            <video src={mediaFile.url} controls style={{ maxWidth: '100%', maxHeight: '100%', width: 'auto', height: 'auto', objectFit: 'contain', ...getFilterStyle() }} />
                        )}
                        {isFilterProcessing && (
                            <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.65)', color: '#fff', padding: '6px 12px', borderRadius: 100, fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SOCIAL.primary, animation: 'pulse 1s infinite' }} />
                                Rendering preview…
                            </div>
                        )}
                        {/* Carousel dots + navigation */}
                        {carouselFiles.length > 1 && (
                            <>
                                <div style={{ position: 'absolute', top: 8, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                                    {carouselFiles.map((_, i) => (
                                        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i === carouselIdx ? '#D9534F' : 'rgba(255,255,255,0.5)' }} />
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

                    {/* Filter row — grouped by category for browsability.
                        23 advanced filters in 7 categories. Each thumbnail
                        shows a CSS-filtered preview for instant feedback;
                        the full pipeline result shows in the main preview
                        once the worker finishes (~150ms). */}
                    <div style={{ background: '#111', padding: '8px 0' }}>
                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.68rem', fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 6px' }}>Advanced Filters</p>
                        <div style={{ display: 'flex', gap: '14px', padding: '0 16px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                            {FILTERS.map((f, i) => {
                                // Insert a category label chip before the first filter of each category
                                const isFirstInCategory = i === 0 || FILTERS[i - 1].category !== f.category
                                const catMeta = FILTER_CATEGORIES.find(c => c.id === f.category)
                                return (
                                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                                    {isFirstInCategory && catMeta && (
                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
                                            <div style={{ fontSize: '1.4rem' }}>{catMeta.icon}</div>
                                            <span style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.55rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{catMeta.label}</span>
                                        </div>
                                    )}
                                    <button onClick={() => setSelectedFilter(i)}
                                        style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px', background: 'none', border: 'none', cursor: 'pointer' }}>
                                        <div style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', border: `2px solid ${selectedFilter === i ? SOCIAL.primary : 'rgba(255,255,255,0.15)'}`, transition: 'all 0.2s ease' }}>
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img src={mediaFile.url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: f.previewCss === 'none' ? 'none' : f.previewCss }} />
                                        </div>
                                        <span style={{ color: selectedFilter === i ? SOCIAL.border : 'rgba(255,255,255,0.55)', fontSize: '0.58rem', fontWeight: 700 }}>{f.name}</span>
                                    </button>
                                </div>
                                )
                            })}
                        </div>
                        {/* Filter description caption — shows what the selected filter does */}
                        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.66rem', textAlign: 'center', marginTop: 6, fontStyle: 'italic' }}>
                            {FILTERS[selectedFilter].description}
                        </p>
                    </div>

                    {/* Adjustments */}
                    <div style={{ background: '#42476E', padding: '8px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Adjust</p>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                {/* Pro toggle — reveals 6 more sliders (warmth/highlights/shadows/fade/sharpen/vignette) */}
                                <button onClick={() => setShowProAdjust(s => !s)} title="Pro adjustments"
                                    style={{ background: showProAdjust ? SOCIAL.primary : 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '4px 10px', color: showProAdjust ? '#fff' : 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 700 }}>✨ Pro</button>
                                <button onClick={() => setRotation(r => r - 90)} title="Rotate left" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>↺</button>
                                <button onClick={() => setRotation(r => r + 90)} title="Rotate right" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '4px 10px', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}>↻</button>
                                {rotation !== 0 && <button onClick={() => setRotation(0)} title="Reset rotation" style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: '4px 10px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.72rem' }}>↺↻</button>}
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {/* Basic 3 sliders — always visible */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>☀️ Bright</span>
                                <input type="range" min={80} max={120} value={brightness} onChange={e => setBrightness(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{brightness}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>◉ Contrast</span>
                                <input type="range" min={80} max={120} value={contrast} onChange={e => setContrast(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{contrast}%</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>🎨 Saturat</span>
                                <input type="range" min={70} max={130} value={saturation} onChange={e => setSaturation(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{saturation}%</span>
                            </div>
                            {/* 6 pro sliders — shown when user taps "Pro" */}
                            {showProAdjust && (
                                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 4, paddingTop: 6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>🔥 Warmth</span>
                                        <input type="range" min={-50} max={50} value={warmth} onChange={e => setWarmth(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{warmth > 0 ? `+${warmth}` : warmth}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>⬆ Highlts</span>
                                        <input type="range" min={-50} max={50} value={highlights} onChange={e => setHighlights(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{highlights > 0 ? `+${highlights}` : highlights}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>⬇ Shadows</span>
                                        <input type="range" min={-50} max={50} value={shadows} onChange={e => setShadows(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{shadows > 0 ? `+${shadows}` : shadows}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>🌫️ Fade</span>
                                        <input type="range" min={0} max={50} value={fade} onChange={e => setFade(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{fade}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>🔪 Sharpen</span>
                                        <input type="range" min={0} max={50} value={sharpen} onChange={e => setSharpen(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{sharpen}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.75rem', width: '70px' }}>⚫ Vignette</span>
                                        <input type="range" min={0} max={50} value={vignette} onChange={e => setVignette(+e.target.value)} style={{ flex: 1, accentColor: SOCIAL.primary }} />
                                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.72rem', width: '32px', textAlign: 'right' }}>{vignette}</span>
                                    </div>
                                    {/* Reset all pro adjustments */}
                                    <button onClick={() => { setWarmth(0); setHighlights(0); setShadows(0); setFade(0); setSharpen(0); setVignette(0) }}
                                        style={{ alignSelf: 'flex-end', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 6, padding: '3px 8px', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '0.68rem', marginTop: 2 }}>Reset Pro</button>
                                </div>
                            )}
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

                        {error && <div style={{ background: '#fef2f2', border: '1px solid rgba(217,83,79,0.4)', borderRadius: '10px', padding: '10px 14px', color: SOCIAL.red, fontSize: '0.85rem', fontWeight: 600 }}>⚠️ {error}</div>}

                        <button onClick={handlePost} disabled={submitting}
                            style={{ width: '100%', padding: '14px', background: SOCIAL.primary, border: 'none', borderRadius: '12px', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', opacity: submitting ? 0.7 : 1, transition: 'all 0.2s ease' }}>
                            {submitting ? (uploadProgress > 0 && uploadProgress < 100 ? `⏳ Uploading… ${uploadProgress}%` : '⏳ Sharing…') : postType === 'krishiclip' ? '🎬 Share KrishiClip' : postType === 'story' ? '✨ Share Story' : '📢 Share Post'}
                        </button>

                        {/* Upload progress bar */}
                        {submitting && uploadProgress > 0 && uploadProgress < 100 && (
                            <div style={{ width: '100%', height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '100px', marginTop: '8px', overflow: 'hidden' }}>
                                <div style={{ width: `${uploadProgress}%`, height: '100%', background: SOCIAL.primary, borderRadius: '100px', transition: 'width 0.3s ease' }} />
                            </div>
                        )}
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

        {/* ── PRO CAMERA MODAL ── Instagram-grade capture experience */}
        {proCameraOpen && (
            <ProCamera
                mode={postType === 'krishiclip' ? 'video' : 'photo'}
                onCapture={handleProCameraCapture}
                onClose={() => setProCameraOpen(false)}
            />
        )}
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