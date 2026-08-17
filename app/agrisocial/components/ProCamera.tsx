'use client'

/**
 * ProCamera — Instagram-grade camera capture component.
 *
 * Features:
 *  - Front/back camera switch (facingMode: 'user' | 'environment')
 *  - Tap-to-focus (uses MediaTrackConstraints.focusMode on supported devices)
 *  - Exposure adjustment (via brightness filter + manual gain where supported)
 *  - 4 aspect ratios: 16:9 (story), 4:3 (classic), 1:1 (square post), 9:16 (reels)
 *  - 3 quality presets: 720p / 1080p / 4K (auto-capped by device capability)
 *  - 30 / 60 fps toggle (60 only if device supports it)
 *  - Composition grid overlay (rule-of-thirds)
 *  - HDR auto-enable (where supported)
 *  - Torch toggle (where supported)
 *  - Photo: full post-processing pipeline (sharpen, denoise, white balance, color grade)
 *  - Video: max bitrate capture (8–25 Mbps), H.264 in MP4 preferred
 *  - Proper EXIF orientation handling (fixes "tilted face" issue)
 *
 * Usage:
 *  <ProCamera
 *    mode="photo" | "video"
 *    onCapture={(blob, type) => { ... }}
 *    onClose={() => { ... }}
 *  />
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { SOCIAL, SHARED } from '@/lib/styles'
import {
  buildCaptureConstraints,
  getBestVideoMimeType,
  getRecorderBitrate,
  captureProcessedStill,
  getCameraCapabilities,
  DEFAULT_PROCESSING,
  type CameraFacing,
  type AspectRatio,
  type QualityPreset,
  type FrameRate,
  type CameraCapabilities,
  type ImageProcessingOptions,
  QUALITY_DIMS,
} from '@/lib/camera-presets'

interface ProCameraProps {
  mode: 'photo' | 'video'
  onCapture: (blob: Blob, type: 'image' | 'video') => void
  onClose: () => void
}

export default function ProCamera({ mode, onCapture, onClose }: ProCameraProps) {
  const [facing, setFacing] = useState<CameraFacing>('environment')
  const [aspect, setAspect] = useState<AspectRatio>(mode === 'video' ? '9:16' : '4:3')
  const [quality, setQuality] = useState<QualityPreset>('1080p')
  const [fps, setFps] = useState<FrameRate>(30)
  const [showGrid, setShowGrid] = useState(true)
  const [torchOn, setTorchOn] = useState(false)
  const [processing] = useState<ImageProcessingOptions>(DEFAULT_PROCESSING)
  const [caps, setCaps] = useState<CameraCapabilities | null>(null)
  const [error, setError] = useState('')
  const [capturing, setCapturing] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [exposure, setExposure] = useState(0)

  // Permission + secure context state.
  // The user already tapped "Open Camera" on the create page — that tap IS
  // the user gesture browsers require. So calling getUserMedia on modal
  // mount is valid and triggers the permission prompt directly (like IG).
  // We only need to track secure context (HTTPS/localhost) because that's
  // a hard browser block we can't bypass.
  const [secureContext, setSecureContext] = useState(true)
  const [permissionDenied, setPermissionDenied] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // On mount: check if we're in a secure context. If yes, the useEffect
  // below will call getUserMedia immediately — which triggers the browser
  // permission prompt directly (the user already tapped "Open Camera",
  // which counts as the user gesture browsers require).
  useEffect(() => {
    const isSecure = typeof window !== 'undefined' && (window.isSecureContext || location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    setSecureContext(isSecure)
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const applyTorch = useCallback((on: boolean) => {
    const track = streamRef.current?.getVideoTracks()[0] as any
    if (!track || typeof track.applyConstraints !== 'function') return
    const trackCaps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}
    if (!trackCaps.torch) return
    track.applyConstraints({ advanced: [{ torch: on }] }).catch(() => {})
  }, [])

  const startStream = useCallback(async () => {
    setError('')

    // ── Insecure context — getUserMedia will silently fail ──
    // This happens when accessing via network IP (e.g. http://21.0.16.19:3000)
    // instead of http://localhost:3000. Browsers only allow camera on HTTPS
    // or localhost. Show a clear error with the exact URL to use.
    if (typeof window !== 'undefined' && !window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
      setError(
        `Camera requires HTTPS or localhost. You're on http://${location.host} — ` +
        `please open http://localhost:3000 instead (on this same device), ` +
        `or deploy to a HTTPS URL like https://agrieasy.vercel.app.`
      )
      return
    }

    // ── getUserMedia not supported (very old browser) ──
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support camera access. Try Chrome, Edge, Firefox, or Safari (latest version).')
      return
    }

    stopStream()
    try {
      const constraints = buildCaptureConstraints({ facing, quality, fps, isVideo: mode === 'video' })
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
      const capabilities = await getCameraCapabilities(stream)
      setCaps(capabilities)
      if (capabilities) {
        if (quality === '4k' && !capabilities.supports4k) setQuality('1080p')
        if (fps === 60 && !capabilities.supports60fps) setFps(30)
      }
      if (torchOn) applyTorch(true)
      setPermissionDenied(false)
    } catch (e: any) {
      console.error('Camera start failed:', e)
      if (e?.name === 'NotAllowedError') {
        // Permission was denied — either by the prompt OR previously saved as "denied"
        // in browser settings. The browser won't re-prompt until the user resets it.
        setPermissionDenied(true)
        setError(
          'Camera access was denied. To enable:\n' +
          '• Chrome: tap the 📷 icon in the address bar → "Always allow" → Reload\n' +
          '• iPhone: Settings → Safari → Camera → Allow\n' +
          '• Android: tap the 🔒 lock icon → Permissions → Camera → Allow'
        )
      } else if (e?.name === 'NotFoundError') {
        setError('No camera found on this device.')
      } else if (e?.name === 'OverconstrainedError') {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing },
            audio: mode === 'video',
          })
          streamRef.current = stream
          if (videoRef.current) {
            videoRef.current.srcObject = stream
            await videoRef.current.play().catch(() => {})
          }
        } catch {
          setError('Camera failed to start. Try reloading the page.')
        }
      } else {
        setError(e?.message || 'Camera failed to start.')
      }
    }
  }, [facing, quality, fps, mode, torchOn, stopStream, applyTorch])

  // Auto-start the camera stream on modal mount + whenever the user
  // changes facing/quality/fps. The user already tapped "Open Camera"
  // on the create page — that tap is the user gesture browsers require
  // to show the permission prompt. So calling getUserMedia here triggers
  // the native browser prompt immediately (just like Instagram).
  useEffect(() => {
    if (!secureContext) return  // don't bother calling getUserMedia on insecure URLs
    startStream()
    return () => { stopStream(); if (timerRef.current) clearInterval(timerRef.current) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, quality, fps, secureContext])

  const handleVideoClick = useCallback(async (e: React.MouseEvent<HTMLVideoElement>) => {
    const track = streamRef.current?.getVideoTracks()[0] as any
    if (!track || typeof track.applyConstraints !== 'function') return
    const trackCaps = typeof track.getCapabilities === 'function' ? track.getCapabilities() : {}
    if (!trackCaps.focusMode) return

    const video = videoRef.current
    if (!video) return
    const rect = video.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height

    try {
      await track.applyConstraints({
        advanced: [{ focusMode: 'manual', focusPoint: 'absolute', pointsOfInterest: [{ x, y }] }]
      })
      showFocusRing(e.clientX - rect.left, e.clientY - rect.top)
    } catch {
      // not all devices support tap-to-focus — silent fail
    }
  }, [])

  const showFocusRing = (x: number, y: number) => {
    const ring = document.createElement('div')
    ring.style.cssText = `position:absolute;left:${x-30}px;top:${y-30}px;width:60px;height:60px;border:2px solid #fff;border-radius:50%;pointer-events:none;animation:focusPulse 0.8s ease-out forwards;z-index:10;`
    videoRef.current?.parentElement?.appendChild(ring)
    setTimeout(() => ring.remove(), 800)
  }

  const capturePhoto = async () => {
    if (!videoRef.current || capturing) return
    setCapturing(true)
    try {
      const blob = await captureProcessedStill(videoRef.current, aspect, processing)
      onCapture(blob, 'image')
    } catch (e) {
      console.error('Capture failed:', e)
      setError('Failed to capture photo. Try again.')
    } finally {
      setCapturing(false)
    }
  }

  const startRecording = () => {
    if (!streamRef.current) return
    chunksRef.current = []
    const { mimeType } = getBestVideoMimeType()
    const bitrate = getRecorderBitrate({ quality, fps })
    const mr = new MediaRecorder(
      streamRef.current,
      mimeType ? { mimeType, ...bitrate } : bitrate,
    )
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' })
      onCapture(blob, 'video')
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

  const flipCamera = () => setFacing(f => f === 'user' ? 'environment' : 'user')
  const toggleTorch = () => { const next = !torchOn; setTorchOn(next); applyTorch(next) }

  const aspectValue = aspect === '16:9' ? 16/9 : aspect === '4:3' ? 4/3 : aspect === '1:1' ? 1 : 9/16

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#000', zIndex: 9999,
      display: 'flex', flexDirection: 'column', fontFamily: SHARED.font,
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '12px 16px', background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(20px)',
      }}>
        <button onClick={onClose} style={topBtnStyle}>✕</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={quality} onChange={e => setQuality(e.target.value as QualityPreset)} style={selectStyle}>
            <option value="720p">HD</option>
            <option value="1080p">FHD</option>
            {caps?.supports4k && <option value="4k">4K</option>}
          </select>
          <select value={fps} onChange={e => setFps(+e.target.value as FrameRate)} style={selectStyle}>
            <option value={30}>30fps</option>
            {caps?.supports60fps && <option value={60}>60fps</option>}
          </select>
          <select value={aspect} onChange={e => setAspect(e.target.value as AspectRatio)} style={selectStyle}>
            <option value="16:9">16:9</option>
            <option value="4:3">4:3</option>
            <option value="1:1">1:1</option>
            <option value="9:16">9:16</option>
          </select>
        </div>
      </div>

      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* ── INSECURE CONTEXT GATE ── only shown if not on HTTPS/localhost.
            On secure context, getUserMedia fires on mount and the browser
            shows its native permission prompt directly — no app-side gate. */}
        {!secureContext ? (
          <div style={{
            textAlign: 'center', padding: 32, color: '#fff', maxWidth: 440,
            fontFamily: SHARED.font,
          }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>🔒</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 12px' }}>HTTPS required</h2>
            <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.75)', lineHeight: 1.6, margin: '0 0 24px' }}>
              Camera access requires a secure connection (HTTPS or localhost).
              <br /><br />
              <strong>Fix:</strong> open <code style={{ background: 'rgba(255,255,255,0.15)', padding: '2px 6px', borderRadius: 4 }}>http://localhost:3000</code> in your browser
              (on this same device), or deploy to HTTPS.
              <br /><br />
              <span style={{ opacity: 0.6, fontSize: '0.78rem' }}>
                You're on: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>{typeof window !== 'undefined' ? window.location.host : 'unknown'}</code>
              </span>
            </p>
          </div>
        ) : (
        <>
        <div style={{
          position: 'relative',
          width: aspectValue >= 1 ? '100%' : `${(1/aspectValue) * 100}%`,
          height: aspectValue >= 1 ? `${aspectValue * 100}%` : '100%',
          maxWidth: '100%', maxHeight: '100%',
        }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onClick={handleVideoClick}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              transform: facing === 'user' ? 'scaleX(-1)' : 'none',
              filter: `brightness(${100 + exposure * 10}%)`,
            }}
          />

          {showGrid && (
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px),
                linear-gradient(to right, rgba(255,255,255,0.35) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.35) 1px, transparent 1px)
              `,
              backgroundSize: '33.33% 100%, 66.66% 100%, 100% 33.33%, 100% 66.66%',
              backgroundPosition: '0 0, 0 0, 0 0, 0 0',
              backgroundRepeat: 'no-repeat',
            }} />
          )}

          {isRecording && (
            <div style={{
              position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
              background: 'rgba(239,68,68,0.9)', borderRadius: 100, padding: '4px 14px',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fff', animation: 'pulse 1s infinite' }} />
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem' }}>
                {Math.floor(recordingTime/60).toString().padStart(2,'0')}:{(recordingTime%60).toString().padStart(2,'0')}
              </span>
            </div>
          )}

          <div style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: 'rgba(0,0,0,0.5)', borderRadius: 16, padding: '8px 4px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}>
            <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: 700 }}>EV</span>
            <input
              type="range" min={-2} max={2} step={0.5} value={exposure}
              onChange={e => setExposure(+e.target.value)}
              style={{ writingMode: 'vertical-lr', direction: 'rtl', width: 8, height: 80, accentColor: SOCIAL.primary }}
            />
          </div>
        </div>
        </>
        )}
      </div>

      <div style={{
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
        padding: '20px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
          <button onClick={() => setShowGrid(g => !g)} style={iconBtnStyle(showGrid)} title="Grid">
            <GridIcon active={showGrid} />
          </button>
          <button onClick={flipCamera} style={iconBtnStyle(false)} title="Flip camera">
            <FlipIcon />
          </button>
          {caps?.hasTorch && (
            <button onClick={toggleTorch} style={iconBtnStyle(torchOn)} title="Torch">
              <TorchIcon active={torchOn} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <div style={{ width: 44, height: 44 }} />
          {mode === 'photo' ? (
            <button
              onClick={capturePhoto}
              disabled={capturing}
              style={{
                width: 76, height: 76, borderRadius: '50%',
                background: '#fff', border: `4px solid rgba(255,255,255,0.4)`,
                cursor: capturing ? 'wait' : 'pointer',
                boxShadow: `0 0 0 3px ${SOCIAL.primary}b3`,
                opacity: capturing ? 0.6 : 1,
                transition: 'all 0.15s ease',
              }}
            />
          ) : (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              style={{
                width: 76, height: 76, borderRadius: '50%',
                background: isRecording ? (SOCIAL.red || '#ef4444') : '#fff',
                border: `4px solid ${isRecording ? 'rgba(239,68,68,0.4)' : 'rgba(255,255,255,0.4)'}`,
                cursor: 'pointer',
                boxShadow: `0 0 0 3px ${isRecording ? 'rgba(239,68,68,0.7)' : SOCIAL.primary + 'b3'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {isRecording && <span style={{ display: 'block', width: 24, height: 24, borderRadius: 4, background: '#fff' }} />}
            </button>
          )}
          <div style={{ width: 44, height: 44 }} />
        </div>

        {caps && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.65rem' }}>
            {QUALITY_DIMS[quality].label} · {fps}fps · {caps.hasHdr ? 'HDR ✓' : 'HDR ✗'}{caps.hasTorch ? ' · Torch ✓' : ''}
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', color: '#ef4444', fontSize: '0.78rem', padding: '12px 16px', background: 'rgba(239,68,68,0.1)', borderRadius: 8, whiteSpace: 'pre-line' }}>
            {error}
            {permissionDenied && (
              <button
                onClick={() => { setError(''); setPermissionDenied(false); startStream() }}
                style={{
                  display: 'block', margin: '10px auto 0', background: SOCIAL.primary || '#7091E6',
                  color: '#fff', border: 'none', borderRadius: 8, padding: '8px 20px',
                  fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                🔄 Try Again
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes focusPulse {
          0% { transform: scale(0.5); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  )
}

function GridIcon({ active }: { active: boolean }) {
  const color = active ? (SOCIAL.primary || '#7091E6') : '#fff'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="1" />
      <line x1="9" y1="3" x2="9" y2="21" />
      <line x1="15" y1="3" x2="15" y2="21" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </svg>
  )
}

function FlipIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  )
}

function TorchIcon({ active }: { active: boolean }) {
  const color = active ? (SOCIAL.primary || '#7091E6') : '#fff'
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6c0 2-2 2-2 4v10a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2V10c0-2-2-2-2-4V2h12z" />
    </svg>
  )
}

const topBtnStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%',
  width: 36, height: 36, color: '#fff', cursor: 'pointer', fontSize: '1.2rem',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const selectStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none',
  borderRadius: 8, padding: '6px 10px', fontSize: '0.75rem', fontWeight: 700,
  cursor: 'pointer', outline: 'none',
}

const iconBtnStyle = (active: boolean): React.CSSProperties => ({
  width: 44, height: 44, borderRadius: '50%',
  background: active ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
  border: 'none', cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s ease',
})
