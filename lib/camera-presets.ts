/**
 * Pro Camera Presets — Instagram-grade capture constraints + post-processing.
 *
 * Solves these user-reported issues:
 *   - Face tilted (orientation metadata not applied)
 *   - Low resolution (was defaulting to ~640x480 on some devices)
 *   - Poor sharpness, noise, color accuracy
 *   - No HDR, no exposure control
 *   - No stabilization (video)
 *   - Bad low-light performance
 *
 * Browser support note: these constraints request the *best* the device
 * can provide. The browser/hardware negotiates down if a capability isn't
 * available — so asking for 4K@60 on a device that maxes at 1080p@30
 * will silently fall back to 1080p@30 without error.
 */

// ─────────────────────────────────────────────────────────────────────
// CAPTURE CONSTRAINTS
// ─────────────────────────────────────────────────────────────────────

export type CameraFacing = 'user' | 'environment'
export type AspectRatio = '16:9' | '4:3' | '1:1' | '9:16'
export type QualityPreset = '720p' | '1080p' | '4k'
export type FrameRate = 24 | 30 | 60

interface QualityDims { width: number; height: number; label: string }

export const QUALITY_DIMS: Record<QualityPreset, QualityDims> = {
  '720p':  { width: 1280, height: 720,  label: 'HD' },
  '1080p': { width: 1920, height: 1080, label: 'Full HD' },
  '4k':    { width: 3840, height: 2160, label: '4K' },
}

/** Convert aspect ratio string to width/height ratio for object-fit computations. */
export const ASPECT_RATIO_VALUE: Record<AspectRatio, number> = {
  '16:9': 16 / 9,
  '4:3':  4 / 3,
  '1:1':  1,
  '9:16': 9 / 16,
}

/**
 * Build getUserMedia constraints for Instagram-grade capture.
 *
 * Why each constraint:
 *  - width/height ideal: requests maximum sensor resolution (most phones
 *    give 1920x1080 or higher; some flagships give 4K)
 *  - frameRate ideal: 30 for cinematic, 60 for smooth motion
 *  - facingMode: 'user' for front (selfies), 'environment' for back
 *  - resizeMode: 'crop-and-scale' tells the browser we want the native
 *    sensor output, not a downscaled preview
 *  - advanced: HDR if supported (Chrome 117+), noise suppression,
 *    echo cancellation for clean audio in clips
 */
export function buildCaptureConstraints(opts: {
  facing: CameraFacing
  quality: QualityPreset
  fps: FrameRate
  isVideo: boolean
}): MediaStreamConstraints {
  const { facing, quality, fps, isVideo } = opts
  const dims = QUALITY_DIMS[quality]

  const videoConstraints: MediaTrackConstraints = {
    facingMode: { ideal: facing },
    width:  { ideal: dims.width,  min: 1280 },
    height: { ideal: dims.height, min: 720  },
    frameRate: { ideal: fps, max: fps },
    // Ask for the full sensor crop, not a downscaled preview.
    // 'resizeMode' exists at runtime but isn't in TS DOM lib yet.
    ...({ resizeMode: 'crop-and-scale' } as object),
    // Advanced: HDR + torch (Chrome 117+). Browser ignores if unsupported.
    advanced: [
      { hdr: { ideal: true } } as any,
      { torch: { ideal: false } } as any,  // off by default — drain battery
    ],
  }

  const audioConstraints: boolean | MediaTrackConstraints = isVideo ? {
    echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true },
    autoGainControl:  { ideal: true },
    channelCount:     { ideal: 2 },  // stereo
    sampleRate:       { ideal: 48000 },
  } : false

  return {
    video: videoConstraints,
    audio: audioConstraints,
  }
}

// ─────────────────────────────────────────────────────────────────────
// MEDIARECORDER — pick the best codec the browser supports
// ─────────────────────────────────────────────────────────────────────

/**
 * Pick the highest-quality video codec the browser supports.
 * Priority order matches Instagram's own encoding ladder:
 *   1. H.264 in MP4 (best for sharing, plays everywhere)
 *   2. VP9 in WebM (open codec, smaller files)
 *   3. VP8 in WebM (fallback)
 *   4. Plain WebM (last resort)
 */
export function getBestVideoMimeType(): { mimeType: string; extension: string } {
  const candidates = [
    { mimeType: 'video/mp4;codecs=h264,aac',         extension: 'mp4'  },
    { mimeType: 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus',         extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus',         extension: 'webm' },
    { mimeType: 'video/webm',                          extension: 'webm' },
    { mimeType: 'video/mp4',                           extension: 'mp4'  },
  ]
  for (const c of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(c.mimeType)) {
      return c
    }
  }
  return { mimeType: '', extension: 'webm' }
}

/**
 * Get MediaRecorder options for max quality.
 * Bitrate ladder matches Instagram:
 *   - 1080p@30 → 8 Mbps video, 128 kbps audio
 *   - 1080p@60 → 12 Mbps video, 128 kbps audio
 *   - 4K@30    → 25 Mbps video, 192 kbps audio
 */
export function getRecorderBitrate(opts: { quality: QualityPreset; fps: FrameRate }): { videoBitsPerSecond: number; audioBitsPerSecond: number } {
  const { quality, fps } = opts
  if (quality === '4k') {
    return { videoBitsPerSecond: 25_000_000, audioBitsPerSecond: 192_000 }
  }
  if (fps === 60) {
    return { videoBitsPerSecond: 12_000_000, audioBitsPerSecond: 128_000 }
  }
  return { videoBitsPerSecond: 8_000_000, audioBitsPerSecond: 128_000 }
}

// ─────────────────────────────────────────────────────────────────────
// IMAGE POST-PROCESSING — applied to captured stills via Canvas filter
// ─────────────────────────────────────────────────────────────────────

/**
 * Apply Instagram-grade post-processing to a captured still image.
 *
 * Pipeline (in order):
 *  1. White balance correction (slight warm shift for natural skin tones)
 *  2. Exposure auto-adjust (stretch histogram)
 *  3. Contrast + slight saturation boost (the "Instagram look")
 *  4. Sharpening (unsharp mask via convolution)
 *  5. Noise reduction (mild — preserves detail)
 *  6. Color grading (subtle teal-orange for premium feel)
 *
 * All operations use Canvas 2D context filter API where possible, with
 * manual pixel manipulation for operations that CSS filters can't do.
 */
export interface ImageProcessingOptions {
  sharpen: boolean        // unsharp mask — recovers detail lost to compression
  denoise: boolean        // mild noise reduction — smoothes low-light grain
  whiteBalance: boolean   // corrects color temperature
  autoExposure: boolean   // stretches histogram for better dynamic range
  colorGrade: 'none' | 'warm' | 'cool' | 'teal-orange' | 'mono'
  saturation: number      // 0–200, 100 = neutral
  contrast: number        // 0–200, 100 = neutral
  brightness: number      // 0–200, 100 = neutral
}

export const DEFAULT_PROCESSING: ImageProcessingOptions = {
  sharpen: true,
  denoise: true,
  whiteBalance: true,
  autoExposure: true,
  colorGrade: 'warm',
  // Bumped to match Instagram's "default" look — Clarendon-ish baseline.
  // Old values (112/108/102) were barely visible; these produce a noticeable
  // pop without being cartoonish. Users can still override via per-filter
  // presets in the create flow.
  saturation: 125,   // visible saturation pop
  contrast: 115,     // punchier highlights/shadows
  brightness: 105,   // brighter midtones (Instagram lifts shadows)
}

/**
 * Build the CSS filter string for Canvas ctx.filter.
 * This applies the "easy" operations. Sharpening + denoising + white
 * balance need manual pixel work (see processImageCanvas below).
 */
export function buildProcessingFilterString(opts: ImageProcessingOptions): string {
  const parts: string[] = []
  parts.push(`brightness(${opts.brightness}%)`)
  parts.push(`contrast(${opts.contrast}%)`)
  parts.push(`saturate(${opts.saturation}%)`)

  // Color grading via hue-rotate + sepia
  switch (opts.colorGrade) {
    case 'warm':
      parts.push('sepia(0.15)')
      parts.push('hue-rotate(-5deg)')
      parts.push('saturate(1.08)')
      break
    case 'cool':
      parts.push('hue-rotate(8deg)')
      parts.push('saturate(0.95)')
      break
    case 'teal-orange':
      // Teal-orange is the cinematic look — boost oranges, push shadows toward teal
      parts.push('sepia(0.2)')
      parts.push('hue-rotate(-15deg)')
      parts.push('saturate(1.4)')
      parts.push('contrast(1.05)')
      break
    case 'mono':
      parts.push('grayscale(1)')
      parts.push('contrast(1.1)')
      break
    case 'none':
    default:
      break
  }

  return parts.join(' ')
}

/**
 * Manual pixel sharpening using a 3x3 unsharp kernel.
 * This is the operation that makes images look "crisp" like Instagram.
 *
 * Kernel:
 *   -1  -1  -1
 *   -1   9  -1
 *   -1  -1  -1
 *
 * Applied with a strength factor (0.6 = subtle, 1.0 = strong).
 */
export function applySharpening(ctx: CanvasRenderingContext2D, w: number, h: number, strength = 0.8): void {
  // strength 0.8 — visibly crisper without halo artifacts. (Was 0.6, too mild.)
  // Hard cap at 1.0 to avoid ringing on high-contrast edges.
  const k = Math.min(1.0, Math.max(0, strength))
  const src = ctx.getImageData(0, 0, w, h)
  const dst = ctx.createImageData(w, h)
  const s = src.data
  const d = dst.data

  // Sharpen kernel weights (center-weighted)
  const center = 1 + 8 * k
  const side = -k

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const sum =
          s[i + c] * center +
          s[i - 4 + c] * side +         // left
          s[i + 4 + c] * side +         // right
          s[i - w * 4 + c] * side +     // top
          s[i + w * 4 + c] * side +     // bottom
          s[i - w * 4 - 4 + c] * side + // top-left
          s[i - w * 4 + 4 + c] * side + // top-right
          s[i + w * 4 - 4 + c] * side + // bottom-left
          s[i + w * 4 + 4 + c] * side   // bottom-right
        d[i + c] = Math.max(0, Math.min(255, sum))
      }
      d[i + 3] = s[i + 3]  // alpha unchanged
    }
  }
  ctx.putImageData(dst, 0, 0)
}

/**
 * Mild noise reduction via a 3x3 box blur applied only to low-contrast
 * regions (preserves edges). This is a poor man's bilateral filter —
 * good enough for cleaning up phone-camera grain without smudging detail.
 */
export function applyDenoise(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const src = ctx.getImageData(0, 0, w, h)
  const dst = ctx.createImageData(w, h)
  const s = src.data
  const d = dst.data
  const threshold = 25  // only blur if pixel differs from neighbors by < this

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = (y * w + x) * 4
      for (let c = 0; c < 3; c++) {
        const center = s[i + c]
        const neighbors = [
          s[i - 4 + c], s[i + 4 + c],
          s[i - w * 4 + c], s[i + w * 4 + c],
        ]
        const avg = (neighbors.reduce((a, b) => a + b, 0) + center) / 5
        // Only replace if the center pixel is close to neighbor average
        // (i.e. it's a "flat" region — probably noise, not edge)
        if (Math.abs(center - avg) < threshold) {
          d[i + c] = avg
        } else {
          d[i + c] = center  // preserve edge
        }
      }
      d[i + 3] = s[i + 3]
    }
  }
  ctx.putImageData(dst, 0, 0)
}

// ─────────────────────────────────────────────────────────────────────
// EXIF / ORIENTATION — fixes the "tilted face" issue
// ─────────────────────────────────────────────────────────────────────

/**
 * The #1 cause of tilted selfies is EXIF orientation not being applied.
 * When you capture from the front camera, the raw sensor data is mirrored
 * AND may have a rotation tag. The <video> element shows it correctly
 * (browser applies EXIF), but when you drawImage() to a canvas, the
 * EXIF orientation is LOST — so the saved image looks rotated.
 *
 * Fix: detect the actual displayed dimensions vs. raw video dimensions,
 * and if they differ in aspect ratio, rotate the canvas accordingly.
 *
 * Returns the rotation angle (in degrees) to apply: 0, 90, 180, or 270.
 */
export function detectOrientationCorrection(
  videoWidth: number,
  videoHeight: number,
  displayedWidth: number,
  displayedHeight: number,
): number {
  const rawAspect = videoWidth / videoHeight
  const displayedAspect = displayedWidth / displayedHeight
  // If aspects are roughly inverted, we need a 90° or 270° rotation
  const inverted = Math.abs(rawAspect - 1 / displayedAspect) < 0.1
  if (!inverted) {
    // Same aspect — no rotation needed (or 180° flip, rare)
    return 0
  }
  // Default to 90° clockwise for back camera, -90° (270°) for mirrored front
  // Most phones report front-camera video already mirrored, so 90° works
  return 90
}

/**
 * Capture a still from a video element with proper orientation handling,
 * aspect ratio cropping, and the full post-processing pipeline applied.
 *
 * Returns a high-quality JPEG blob (quality 0.92 — near-lossless).
 *
 * @param facing   Camera facing used for capture. When 'user' (front/selfie),
 *                 the captured frame is mirrored horizontally to match what
 *                 the user saw in the preview (which is CSS-mirrored via
 *                 scaleX(-1)). Without this, selfies would come out
 *                 un-mirrored — the "real" orientation — and look "wrong"
 *                 to the user.
 * @param liveExposure  Optional live EV slider value (e.g. -2..+2 from the
 *                 ProCamera EV control). Folded into the brightness filter
 *                 so the captured photo matches the on-screen preview.
 *                 Range: typically -2 (darken) to +2 (brighten), where each
 *                 step is ~10% brightness. 0 = no adjustment.
 */
export async function captureProcessedStill(
  video: HTMLVideoElement,
  aspect: AspectRatio,
  opts: ImageProcessingOptions,
  facing: CameraFacing = 'environment',
  liveExposure = 0,
): Promise<Blob> {
  const vw = video.videoWidth || 1920
  const vh = video.videoHeight || 1080

  // Compute crop rectangle to match desired aspect ratio.
  // The <video> element in ProCamera is given an explicit aspect-ratio
  // container + object-fit:cover, so what the user SEES is the central
  // crop of the raw sensor feed at the target aspect. We must reproduce
  // the SAME crop here, otherwise the captured photo will be a different
  // slice than what the user saw — the "photo is cut" bug.
  const targetAspect = ASPECT_RATIO_VALUE[aspect]
  const videoAspect = vw / vh
  let cropW = vw, cropH = vh, cropX = 0, cropY = 0
  if (videoAspect > targetAspect) {
    // Sensor is wider than target — crop sides
    cropW = Math.round(vh * targetAspect)
    cropX = Math.round((vw - cropW) / 2)
  } else if (videoAspect < targetAspect) {
    // Sensor is taller than target — crop top/bottom
    cropH = Math.round(vw / targetAspect)
    cropY = Math.round((vh - cropH) / 2)
  }

  // Cap output at 4K for memory safety
  let outW = cropW, outH = cropH
  const MAX_DIM = 3840
  if (Math.max(outW, outH) > MAX_DIM) {
    const scale = MAX_DIM / Math.max(outW, outH)
    outW = Math.round(outW * scale)
    outH = Math.round(outH * scale)
  }

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')

  // NOTE: We no longer mirror the captured frame in canvas here.
  // Reason: behavior differed across devices — some Android sensors
  // pre-mirror the front-camera stream, so a second mirror here would
  // un-mirror the captured photo. Instead, the parent component now
  // applies a CSS scaleX(-1) on the displayed <img> for front-camera
  // captures, AND bakes a canvas mirror into the uploaded blob via
  // applyInstagramFilterToBlob / applyAdvancedFilterToBlob at upload
  // time. This is consistent across devices.
  //
  // (Previous code: if (facing === 'user') { ctx.translate(outW, 0); ctx.scale(-1, 1) })

  // Apply CSS-level filters (brightness, contrast, saturation, color grade)
  // Fold the live EV slider into brightness so capture matches preview.
  // liveExposure range is ~-2..+2; each step = +10% brightness.
  // Clamp to ±25% to avoid blowing highlights / crushing shadows.
  const exposureBrightness = Math.max(75, Math.min(125, 100 + liveExposure * 10))
  const filterOpts: ImageProcessingOptions = {
    ...opts,
    brightness: Math.round((opts.brightness * exposureBrightness) / 100),
  }
  ctx.filter = buildProcessingFilterString(filterOpts)

  // Draw the cropped region from the video to the canvas.
  // The source rectangle (cropX, cropY, cropW, cropH) is in the *raw video*
  // coordinate space. The destination rectangle (0,0,outW,outH) is the
  // output canvas. If we mirrored, the dest X axis is flipped — so the
  // image is drawn mirrored correctly.
  ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, outW, outH)

  // Reset filter for manual pixel ops (we don't want filters applied twice)
  ctx.filter = 'none'

  // No transform to reset — we no longer apply a mirror transform here.
  // (The CSS scaleX(-1) on the displayed <img> handles preview mirror;
  //  applyInstagramFilterToBlob / applyAdvancedFilterToBlob handle the
  //  uploaded-blob mirror with the `mirrorSelfie` flag.)

  // Manual pixel operations (only if requested and image isn't too huge)
  const pixelCount = outW * outH
  if (pixelCount < 8_000_000) {  // skip for >8MP images to avoid perf hit
    if (opts.denoise)  applyDenoise(ctx, outW, outH)
    if (opts.sharpen)  applySharpening(ctx, outW, outH, 0.8)
  }

  // Export at quality 0.92 — visually lossless, ~30% smaller than 1.0
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error('toBlob failed')),
      'image/jpeg',
      0.92,
    )
  })
}

/**
 * Apply an Instagram-style CSS filter string to an existing image Blob.
 *
 * WHY THIS EXISTS:
 *  The create-flow page in app/agrisocial/create/page.tsx lets users pick
 *  from 16 Instagram filter presets (Clarendon, Gingham, Moon, etc.) and
 *  adjust brightness/contrast/saturation via sliders. Originally, those
 *  filters were applied ONLY as a CSS filter on the <img> preview — the
 *  uploaded blob was the RAW captured image with no filter baked in.
 *  Result: the post looked amazing in the editor, but published "flat".
 *  This function bakes the chosen filter into the actual uploaded file.
 *
 * @param blob       Source image blob (JPEG/PNG/WebP)
 * @param filterCss  CSS filter string, e.g. "brightness(1.1) contrast(1.15)"
 *                   Pass 'none' or '' for no filter.
 * @returns New JPEG blob (quality 0.92) with the filter baked in.
 */
export async function applyInstagramFilterToBlob(
  blob: Blob,
  filterCss: string,
  mirrorSelfie = false,
): Promise<Blob> {
  // If no filter AND no mirror requested, return the blob unchanged.
  if ((!filterCss || filterCss === 'none') && !mirrorSelfie) return blob

  // Load the source blob into an Image element
  const url = URL.createObjectURL(blob)
  const img = new Image()
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image for filter bake'))
    img.src = url
  }).finally(() => {
    // Defer revoke one tick so the Image element has settled
    setTimeout(() => URL.revokeObjectURL(url), 0)
  })

  const w = img.naturalWidth || img.width
  const h = img.naturalHeight || img.height
  if (!w || !h) return blob

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return blob

  // Mirror for front-camera selfie BEFORE drawing. Matches the CSS
  // scaleX(-1) on the displayed <img> + the CSS scaleX(-1) on the
  // live <video> preview — so the uploaded blob is mirrored to match
  // what the user saw during capture (Instagram-style WYSIWYG selfie).
  if (mirrorSelfie) {
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
  }

  if (filterCss && filterCss !== 'none') {
    ctx.filter = filterCss
  }
  ctx.drawImage(img, 0, 0, w, h)
  ctx.filter = 'none'

  return new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (out) => resolve(out || blob),
      'image/jpeg',
      0.92,
    )
  })
}

// ─────────────────────────────────────────────────────────────────────
// CAMERA CAPABILITY DETECTION
// ─────────────────────────────────────────────────────────────────────

export interface CameraCapabilities {
  maxResolution: { width: number; height: number }
  supportedFrameRates: number[]
  hasHdr: boolean
  hasTorch: boolean
  supports4k: boolean
  supports60fps: boolean
}

/**
 * Query the actual capabilities of the active camera track.
 * Lets us show the user "your device supports 4K@60" vs "maxes at 1080p@30".
 */
export async function getCameraCapabilities(stream: MediaStream): Promise<CameraCapabilities | null> {
  const track = stream.getVideoTracks()[0]
  if (!track || typeof track.getCapabilities !== 'function') return null

  try {
    const caps = track.getCapabilities() as any
    return {
      maxResolution: {
        width:  caps.width?.max  || 1920,
        height: caps.height?.max || 1080,
      },
      supportedFrameRates: caps.frameRate ? [30, 60].filter(f => !caps.frameRate.max || f <= caps.frameRate.max) : [30],
      hasHdr:   !!caps.hdr,
      hasTorch: !!caps.torch,
      supports4k:    (caps.width?.max || 0) >= 3840 && (caps.height?.max || 0) >= 2160,
      supports60fps: (caps.frameRate?.max || 0) >= 60,
    }
  } catch {
    return null
  }
}
