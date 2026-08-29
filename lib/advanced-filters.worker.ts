/**
 * Web Worker for advanced filter processing.
 *
 * Runs the pixel-level operations from lib/advanced-filters.ts off the
 * main thread, so the UI stays at 60fps during filter application even
 * on large 1080p images.
 *
 * The worker receives:
 *  - The image data as a transferable ImageData (or rasterized from blob)
 *  - The full FilterDefinition (serialized via structured clone)
 *  - Output dimensions (cap at 1920px on the long edge for perf)
 *
 * The worker returns the processed ImageData, also transferable.
 *
 * Note: some operations (vignette, light leak, bloom, orton) require a
 * Canvas2D context. Workers have OffscreenCanvas, but browser support is
 * uneven. For maximum compatibility, those canvas-composite ops are
 * executed on the main thread AFTER the worker returns the pixel-processed
 * result. The worker handles ONLY the pure-pixel operations:
 *   - whiteBalance, exposure, toneCurve, splitTone, hslBands, grain,
 *     masterAdjust (saturation/contrast/brightness).
 */

/// <reference lib="webworker" />

import {
  applyWhiteBalance,
  applyExposure,
  applyToneCurves,
  applySplitTone,
  applyHSLBands,
  applyFilmGrain,
  applyMasterAdjust,
  type FilterDefinition,
} from '../lib/advanced-filters'

interface WorkerRequest {
  imageData: ImageData
  filter: FilterDefinition
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { imageData, filter } = e.data
  const data = imageData.data
  const w = imageData.width
  const h = imageData.height

  if (filter.whiteBalance) applyWhiteBalance(data, filter.whiteBalance)
  if (filter.exposure !== undefined) applyExposure(data, filter.exposure)
  if (filter.toneCurve) applyToneCurves(data, filter.toneCurve)
  if (filter.splitTone) applySplitTone(data, filter.splitTone)
  if (filter.hslBands && filter.hslBands.length > 0) applyHSLBands(data, filter.hslBands)
  if (filter.grain) applyFilmGrain(data, w, h, filter.grain)
  applyMasterAdjust(
    data,
    filter.saturation ?? 1,
    filter.contrast ?? 1,
    filter.brightness ?? 1,
  )

  // Transfer back the modified ImageData buffer
  // (Uint8ClampedArray.buffer is the underlying ArrayBuffer)
  ;(self as unknown as Worker).postMessage(
    { imageData, filterId: filter.id },
    [imageData.data.buffer],
  )
}
