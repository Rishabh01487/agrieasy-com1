'use client'

/**
 * Video watermarking utility — burns the AgriSocial logo + @username + agrieasy.site
 * into a video file using canvas + MediaRecorder.
 *
 * When someone downloads or shares a video, the watermarked version includes:
 * - AgriSocial logo (top-left)
 * - @username (top-left, below the logo)
 * - agrieasy.site (bottom-right)
 *
 * This way, when the video is shared to Instagram Story / WhatsApp Status,
 * viewers see the AgriSocial branding and can visit agrieasy.site to find
 * the original post.
 *
 * The process:
 * 1. Load the video into a hidden <video> element
 * 2. Create a canvas matching the video dimensions
 * 3. Draw each frame: video frame → watermark overlay
 * 4. Use canvas.captureStream() + MediaRecorder to record the canvas
 * 5. Return the watermarked video as a File
 *
 * Note: This runs in real-time (a 30s video takes ~30s to process).
 * The user sees a "Adding watermark..." toast during processing.
 */

interface WatermarkOptions {
  username: string
  logoText?: string
  siteUrl?: string
}

/**
 * Watermark a video file by burning the AgriSocial branding into it.
 * Returns a new File with the watermark baked in.
 */
export async function watermarkVideo(
  videoUrl: string,
  options: WatermarkOptions,
  onProgress?: (progress: number) => void
): Promise<File | null> {
  const { username, logoText = 'AgriSocial', siteUrl = 'agrieasy.site' } = options

  if (typeof HTMLCanvasElement.prototype.captureStream !== 'function' ||
      typeof window.MediaRecorder === 'undefined') {
    // Caller should fall back to downloading the original file.
    return null
  }

  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.src = videoUrl
    video.muted = false  // unmuted so the audio track is available for capture
    video.volume = 0     // silent so the user doesn't hear it during processing
    video.playsInline = true
    video.preload = 'auto'

    video.onloadedmetadata = () => {
      const w = video.videoWidth
      const h = video.videoHeight
      if (!w || !h) { resolve(null); return }

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }

      // canvas.captureStream() only gives video — we must add the audio track
      // separately, otherwise the watermarked output has no sound.
      const canvasStream = (canvas as any).captureStream(30) as MediaStream
      const outputStream = new MediaStream()

      canvasStream.getVideoTracks().forEach(t => outputStream.addTrack(t))

      // Audio tracks are added in onplay() — captureStream() on a <video>
      // needs the audio to be actively decoding.

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
            ? 'video/webm;codecs=vp9'
            : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
              ? 'video/webm;codecs=vp8'
              : 'video/webm'

      const chunks: Blob[] = []
      let recorder: MediaRecorder

      let rafId: number
      const draw = () => {
        if (video.paused || video.ended) return

        ctx.drawImage(video, 0, 0, w, h)
        drawWatermark(ctx, w, h, username, logoText, siteUrl)

        if (onProgress && video.duration) {
          onProgress(video.currentTime / video.duration)
        }

        rafId = requestAnimationFrame(draw)
      }

      video.onplay = () => {
        // captureStream() on the <video> works only once audio is decoding.
        try {
          const videoStream: MediaStream = (video as any).captureStream
            ? (video as any).captureStream()
            : (video as any).mozCaptureStream()
          if (videoStream) {
            const audioTracks = videoStream.getAudioTracks()
            audioTracks.forEach(t => outputStream.addTrack(t))
          }
        } catch {
          // Audio capture failed — continue with video-only.
        }

        recorder = new MediaRecorder(outputStream, { mimeType, videoBitsPerSecond: 5_000_000 })
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data)
        }
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'video/webm' })
          const file = new File([blob], `krishiclip-watermarked.webm`, { type: 'video/webm' })
          resolve(file)
        }
        recorder.start()
        draw()
      }

      video.onended = () => {
        cancelAnimationFrame(rafId)
        ctx.drawImage(video, 0, 0, w, h)
        drawWatermark(ctx, w, h, username, logoText, siteUrl)
        setTimeout(() => { if (recorder && recorder.state !== 'inactive') recorder.stop() }, 300)
      }

      // Browsers block autoplay of unmuted videos, so we start muted to satisfy
      // the autoplay policy, then immediately un-mute after playback begins so
      // the audio track is available for capture. Volume stays at 0 so the user
      // doesn't hear anything during processing.
      video.muted = true
      video.play().then(() => {
        video.muted = false
        video.volume = 0
      }).catch(() => {
        // Autoplay blocked entirely — can't watermark; fall back to original.
        resolve(null)
      })
    }

    video.onerror = () => resolve(null)
  })
}

/**
 * Draw the watermark overlay on the canvas:
 * - Top-left: AgriSocial logo (red circle with play icon) + "@username"
 * - Bottom-right: "agrieasy.site" pill
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
  const padding = 16 * scale
  const logoSize = 28 * scale
  const fontSize = 16 * scale
  const smallFontSize = 13 * scale

  ctx.save()

  // Top-left: logo + @username
  const pillWidth = (logoText.length + username.length + 4) * fontSize * 0.6 + logoSize + padding
  const pillHeight = logoSize + padding
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)'
  roundRect(ctx, padding, padding, pillWidth, pillHeight, 8 * scale)
  ctx.fill()

  const logoX = padding + logoSize / 2 + 4 * scale
  const logoY = padding + logoSize / 2 + 2 * scale
  ctx.fillStyle = '#D9534F'
  ctx.beginPath()
  ctx.arc(logoX, logoY, logoSize / 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.beginPath()
  const playSize = logoSize * 0.35
  ctx.moveTo(logoX - playSize / 2, logoY - playSize)
  ctx.lineTo(logoX + playSize, logoY)
  ctx.lineTo(logoX - playSize / 2, logoY + playSize)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.font = `700 ${fontSize}px Arial, sans-serif`
  ctx.textBaseline = 'middle'
  ctx.fillText(logoText, logoX + logoSize / 2 + 6 * scale, logoY - fontSize * 0.35)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
  ctx.font = `600 ${smallFontSize}px Arial, sans-serif`
  ctx.fillText(`@${username}`, logoX + logoSize / 2 + 6 * scale, logoY + fontSize * 0.45)

  // Bottom-right: agrieasy.site pill
  const siteText = siteUrl
  ctx.font = `800 ${smallFontSize * 1.1}px Arial, sans-serif`
  const siteMetrics = ctx.measureText(siteText)
  const sitePillWidth = siteMetrics.width + 24 * scale
  const sitePillHeight = smallFontSize + 16 * scale
  const sitePillX = w - sitePillWidth - padding
  const sitePillY = h - sitePillHeight - padding

  ctx.fillStyle = 'rgba(217, 83, 79, 0.9)'
  roundRect(ctx, sitePillX, sitePillY, sitePillWidth, sitePillHeight, 8 * scale)
  ctx.fill()

  ctx.fillStyle = '#fff'
  ctx.textBaseline = 'middle'
  ctx.fillText(siteText, sitePillX + 12 * scale, sitePillY + sitePillHeight / 2)

  // Top-right: call-to-action
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
  ctx.font = `600 ${smallFontSize * 0.9}px Arial, sans-serif`
  ctx.textAlign = 'right'
  ctx.fillText('▶ Watch more on', w - padding, padding + smallFontSize)
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

/**
 * Simpler alternative: create a watermarked thumbnail (for when video
 * processing isn't supported or is too slow). Returns a PNG File.
 */
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
      // Seek to 1 second in to get a representative frame.
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
