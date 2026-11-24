'use client'

interface WatermarkOptions {
  username: string
  logoText?: string
  siteUrl?: string
}

export async function watermarkVideo(
  videoUrl: string,
  options: WatermarkOptions,
  onProgress?: (progress: number) => void
): Promise<File | null> {
  const { username, logoText = 'AgriSocial', siteUrl = 'agrieasy.site' } = options

  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function' ||
      typeof window.MediaRecorder === 'undefined') {
    return null
  }

  // Pre-fetch the FULL video as a blob before processing.
  // This eliminates network buffering stalls during canvas/MediaRecorder
  // processing — the #1 cause of fragmented output on mobile. The video
  // plays from a local blob URL, so there's no network dependency.
  let blobUrl: string | null = null
  try {
    const resp = await fetch(videoUrl, { mode: 'cors' })
    if (!resp.ok) return null
    const blob = await resp.blob()
    blobUrl = URL.createObjectURL(blob)
  } catch {
    // Fetch failed (CORS or network) — fall back to the network URL.
    // The video might still play if the server supports range requests,
    // but buffering stalls are more likely.
    blobUrl = null
  }

  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = blobUrl || videoUrl
    video.muted = true  // CRITICAL: stay muted — see comment below
    video.playsInline = true
    video.preload = 'auto'

    video.onloadedmetadata = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) { resolve(null); return }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) { resolve(null); return }

      // Match the original video's frame rate instead of forcing 30fps.
      // captureStream(0) = record on demand (we push frames manually).
      // captureStream(fps) = auto-capture at fps. Use the video's rate.
      const fps = 30 // most mobile videos are 30fps; 60fps would need 2x bitrate
      const canvasStream = (canvas as any).captureStream(fps) as MediaStream
      const outputStream = new MediaStream()

      canvasStream.getVideoTracks().forEach(t => outputStream.addTrack(t))

      // Pick the best available codec — prefer H.264 (mp4) for max compatibility
      // with Instagram/WhatsApp, fall back to VP9/VP8 (webm).
      const codecs = [
        'video/mp4;codecs=h264,aac',
        'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
      ]
      let mimeType = 'video/webm'
      for (const c of codecs) {
        if (MediaRecorder.isTypeSupported(c)) { mimeType = c; break }
      }

      const chunks: Blob[] = []
      let recorder: MediaRecorder

      // Bitrate scales with resolution to preserve quality:
      // 1080p → 12 Mbps, 720p → 8 Mbps, 480p → 5 Mbps
      const pixels = w * h
      let videoBitsPerSecond = 5_000_000
      if (pixels >= 1920 * 1080) videoBitsPerSecond = 12_000_000
      else if (pixels >= 1280 * 720) videoBitsPerSecond = 8_000_000

      let rafId: number
      let intervalId: ReturnType<typeof setInterval>
      let lastDrawTime = 0
      const frameInterval = 1000 / fps
      const draw = () => {
        // Don't return early when video.paused — the auto-resume
        // (onpause handler) will restart playback within 100ms, and
        // we need to keep drawing the current frame so the recorder
        // doesn't capture stale/blank frames during the resume gap.
        if (video.ended) return

        const now = performance.now()
        if (now - lastDrawTime >= frameInterval) {
          try { ctx.drawImage(video, 0, 0, w, h) } catch {}
          drawWatermark(ctx, w, h, username, logoText, siteUrl)
          lastDrawTime = now
        }

        if (onProgress && video.duration) {
          onProgress(video.currentTime / video.duration)
        }
      }

      // Use BOTH requestAnimationFrame AND setInterval.
      // RAF stops when the mobile tab goes to background (screen lock,
      // app switch), which is the #1 cause of fragmented output — frames
      // stop being drawn and the recorder captures stale frames.
      // setInterval keeps drawing even when RAF is throttled.
      // IMPORTANT: don't check video.paused — keep drawing the current
      // frame even when paused so the recorder captures SOMETHING while
      // we auto-resume playback (see onpause handler below).
      const startDraw = () => {
        const tick = () => { draw(); rafId = requestAnimationFrame(tick) }
        tick()
        intervalId = setInterval(draw, frameInterval)
      }

      // Stall detection: if currentTime doesn't advance for 5 seconds,
      // the video has stalled permanently (mobile browser throttling,
      // memory pressure, etc). Force-stop the recorder with whatever
      // we've captured so far — better to get a partial watermarked
      // video than to hang forever.
      let lastCurrentTime = 0
      let stallCount = 0
      const stallChecker = setInterval(() => {
        if (stopped) { clearInterval(stallChecker); return }
        if (video.currentTime === lastCurrentTime) {
          stallCount++
          // 5 ticks × 1s = 5 seconds with no progress
          if (stallCount >= 5) {
            console.warn('[watermarkVideo] Video stalled for 5s — force-stopping')
            clearInterval(stallChecker)
            stopRecorder()
          }
        } else {
          stallCount = 0
          lastCurrentTime = video.currentTime
        }
      }, 1000)

      // Auto-resume: mobile browsers aggressively pause video playback
      // (power management, tab switch, screen lock). When paused
      // mid-playback (not ended, not manually stopped), immediately
      // resume. This is the #2 cause of fragmented output after the
      // unmute bug — the video pauses, draw() stops checking (old code
      // returned early if paused), and the recorder captures stale
      // frames for the remaining duration.
      video.onpause = () => {
        if (!stopped && !video.ended && video.currentTime < video.duration - 0.1) {
          // Small delay to avoid rapid pause/play loops
          setTimeout(() => {
            if (!stopped && video.paused) video.play().catch(() => {})
          }, 100)
        }
      }

      let stopped = false
      const stopRecorder = () => {
        if (stopped) return
        stopped = true
        cancelAnimationFrame(rafId)
        clearInterval(intervalId)
        clearInterval(stallChecker)
        // Draw the final frame with watermark
        try { ctx.drawImage(video, 0, 0, w, h) } catch {}
        drawWatermark(ctx, w, h, username, logoText, siteUrl)
        // Request any pending data to be flushed before stopping
        if (recorder && recorder.state === 'recording') {
          try { recorder.requestData() } catch {}
        }
        // Slightly longer delay (500ms) to ensure the last frame +
        // final dataavailable event are captured.
        setTimeout(() => {
          if (recorder && recorder.state !== 'inactive') recorder.stop()
          // If recorder was never created (play failed), resolve null
          if (!recorder) resolve(null)
        }, 500)
      }

      video.onended = stopRecorder
      video.ontimeupdate = () => {
        if (video.duration > 0 && video.currentTime >= video.duration - 0.1) {
          stopRecorder()
        }
      }

      // CRITICAL: keep video.muted = true throughout.
      // On mobile browsers, only MUTED videos can autoplay. Unmuting
      // violates the autoplay policy and pauses the video.
      // Audio is captured via video.captureStream() which works
      // regardless of mute state.
      video.muted = true

      // Start playback. When play() resolves, the video is actually
      // playing — start the recorder HERE, not in onplay (which can
      // fire before the video data is ready, especially on mobile).
      video.play().then(() => {
        // Capture audio track from the video element
        try {
          const videoStream: MediaStream = (video as any).captureStream
            ? (video as any).captureStream()
            : (video as any).mozCaptureStream()
          if (videoStream) {
            videoStream.getAudioTracks().forEach(t => outputStream.addTrack(t))
          }
        } catch {
          // Audio capture failed — continue with video-only.
        }

        recorder = new MediaRecorder(outputStream, { mimeType, videoBitsPerSecond })
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType })
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm'
          const file = new File([blob], `krishiclip-watermarked.${ext}`, { type: mimeType })
          if (blobUrl) URL.revokeObjectURL(blobUrl)
          resolve(file)
        }
        // timeslice=100ms ensures dataavailable fires regularly
        recorder.start(100)
        lastCurrentTime = video.currentTime
        startDraw()
      }).catch(() => {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
        resolve(null)
      })
    }

    video.onerror = () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl)
      resolve(null)
    }
  })
}

/**
 * Draw a Madhubani-art-style watermark:
 * - Top-left: AgriSocial logo in a Madhubani sun-mandala + @username
 * - Bottom-right: agrieasy.site in a Madhubani lotus-bordered pill
 * - Uses the 4 classic Madhubani colors: sindoor red, turmeric yellow,
 *   peacock green, indigo blue on a cream/kohbar background.
 */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  username: string,
  logoText: string,
  siteUrl: string
) {
  const scale = Math.max(w, h) / 720
  const padding = 14 * scale
  const logoSize = 32 * scale
  const fontSize = 15 * scale
  const smallFontSize = 12 * scale

  ctx.save()

  // ════════════════════════════════════════════════════════════════
  // TOP-LEFT: Madhubani sun-mandala logo + AgriSocial + @username
  // ════════════════════════════════════════════════════════════════

  // Background pill — cream with Madhubani double-line border
  const pillWidth = (logoText.length + username.length + 5) * fontSize * 0.62 + logoSize + padding * 1.5
  const pillHeight = logoSize + padding * 1.2

  // Cream fill
  ctx.fillStyle = 'rgba(255, 248, 230, 0.92)'
  roundRect(ctx, padding, padding, pillWidth, pillHeight, 6 * scale)
  ctx.fill()

  // Double-line border (Madhubani kohbar convention) — sindoor red
  ctx.strokeStyle = '#C8403A'
  ctx.lineWidth = 1.5 * scale
  roundRect(ctx, padding, padding, pillWidth, pillHeight, 6 * scale)
  ctx.stroke()
  ctx.lineWidth = 0.7 * scale
  roundRect(ctx, padding + 3 * scale, padding + 3 * scale, pillWidth - 6 * scale, pillHeight - 6 * scale, 4 * scale)
  ctx.stroke()

  // Madhubani sun-mandala logo (replaces the plain red circle)
  const logoCx = padding + logoSize / 2 + 7 * scale
  const logoCy = padding + logoSize / 2 + 6 * scale
  const logoR = logoSize / 2

  // 8 sun rays (Madhubani style — triangular petals)
  ctx.fillStyle = '#F4B942' // turmeric yellow
  for (let i = 0; i < 8; i++) {
    const deg = i * 45
    const rad = (deg * Math.PI) / 180
    const r1 = logoR * 0.7
    const r2 = logoR * 1.15
    const halfAngle = 0.18
    ctx.beginPath()
    ctx.moveTo(
      logoCx + Math.cos(rad - halfAngle) * r1,
      logoCy + Math.sin(rad - halfAngle) * r1
    )
    ctx.lineTo(logoCx + Math.cos(rad) * r2, logoCy + Math.sin(rad) * r2)
    ctx.lineTo(
      logoCx + Math.cos(rad + halfAngle) * r1,
      logoCy + Math.sin(rad + halfAngle) * r1
    )
    ctx.closePath()
    ctx.fill()
  }

  // Inner circle — sindoor red
  ctx.fillStyle = '#C8403A'
  ctx.beginPath()
  ctx.arc(logoCx, logoCy, logoR * 0.65, 0, Math.PI * 2)
  ctx.fill()

  // Concentric dashed ring (Madhubani fish-eye motif) — cream
  ctx.strokeStyle = 'rgba(255, 248, 230, 0.7)'
  ctx.lineWidth = 0.8 * scale
  ctx.setLineDash([2 * scale, 2 * scale])
  ctx.beginPath()
  ctx.arc(logoCx, logoCy, logoR * 0.45, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])

  // Center play triangle — cream
  ctx.fillStyle = '#FFF8E6'
  const playSize = logoR * 0.28
  ctx.beginPath()
  ctx.moveTo(logoCx - playSize * 0.6, logoCy - playSize)
  ctx.lineTo(logoCx + playSize, logoCy)
  ctx.lineTo(logoCx - playSize * 0.6, logoCy + playSize)
  ctx.closePath()
  ctx.fill()

  // "AgriSocial" text — sindoor red
  ctx.fillStyle = '#5A1A18'
  ctx.font = `700 ${fontSize}px Arial, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText(logoText, logoCx + logoR + 5 * scale, logoCy - fontSize * 0.32)

  // "@username" — peacock green
  ctx.fillStyle = '#2E6E4A'
  ctx.font = `600 ${smallFontSize}px Arial, sans-serif`
  ctx.fillText(`@${username}`, logoCx + logoR + 5 * scale, logoCy + fontSize * 0.42)

  // ════════════════════════════════════════════════════════════════
  // BOTTOM-RIGHT: agrieasy.site in a Madhubani lotus-bordered pill
  // ════════════════════════════════════════════════════════════════

  ctx.font = `800 ${smallFontSize * 1.1}px Arial, sans-serif`
  const siteMetrics = ctx.measureText(siteUrl)
  const sitePillWidth = siteMetrics.width + 28 * scale
  const sitePillHeight = smallFontSize + 18 * scale
  const sitePillX = w - sitePillWidth - padding
  const sitePillY = h - sitePillHeight - padding

  // Cream fill
  ctx.fillStyle = 'rgba(255, 248, 230, 0.92)'
  roundRect(ctx, sitePillX, sitePillY, sitePillWidth, sitePillHeight, 6 * scale)
  ctx.fill()

  // Double-line border — indigo blue
  ctx.strokeStyle = '#1F4A6E'
  ctx.lineWidth = 1.5 * scale
  roundRect(ctx, sitePillX, sitePillY, sitePillWidth, sitePillHeight, 6 * scale)
  ctx.stroke()
  ctx.lineWidth = 0.7 * scale
  roundRect(ctx, sitePillX + 3 * scale, sitePillY + 3 * scale, sitePillWidth - 6 * scale, sitePillHeight - 6 * scale, 4 * scale)
  ctx.stroke()

  // Small lotus petals at the left edge of the pill (Madhubani motif)
  const lotusCx = sitePillX + 8 * scale
  const lotusCy = sitePillY + sitePillHeight / 2
  ctx.fillStyle = '#C8403A'
  for (let i = 0; i < 3; i++) {
    const offsetY = (i - 1) * 4 * scale
    ctx.beginPath()
    ctx.ellipse(lotusCx, lotusCy + offsetY, 1.5 * scale, 3 * scale, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // "agrieasy.site" text — indigo blue
  ctx.fillStyle = '#1F4A6E'
  ctx.textBaseline = 'middle'
  ctx.fillText(siteUrl, sitePillX + 14 * scale, sitePillY + sitePillHeight / 2)

  // ════════════════════════════════════════════════════════════════
  // TOP-RIGHT: "▶ Watch more" call-to-action with a creeping vine
  // ════════════════════════════════════════════════════════════════

  ctx.fillStyle = 'rgba(255, 248, 230, 0.85)'
  ctx.font = `600 ${smallFontSize * 0.9}px Arial, sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('▶ Watch more on', w - padding, padding + smallFontSize)

  // Small creeping vine motif below the CTA (Madhubani style — dashed line)
  ctx.strokeStyle = 'rgba(46, 110, 74, 0.6)'
  ctx.lineWidth = 0.8 * scale
  ctx.setLineDash([2 * scale, 2 * scale])
  ctx.beginPath()
  ctx.moveTo(w - 100 * scale, padding + smallFontSize + 6 * scale)
  ctx.lineTo(w - padding, padding + smallFontSize + 6 * scale)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.textAlign = 'left'

  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export async function createWatermarkedThumbnail(
  videoUrl: string,
  options: WatermarkOptions
): Promise<File | null> {
  const { username, logoText = 'AgriSocial', siteUrl = 'agrieasy.site' } = options

  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = videoUrl
    video.muted = true
    video.playsInline = true

    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1, video.duration / 2)
    }

    video.onseeked = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) { resolve(null); return }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }

      ctx.drawImage(video, 0, 0, w, h)
      drawWatermark(ctx, w, h, username, logoText, siteUrl)

      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], 'krishiclip-thumb.png', { type: 'image/png' }))
        } else {
          resolve(null)
        }
      }, 'image/png')
    }

    video.onerror = () => resolve(null)
  })
}
