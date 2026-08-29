/**
 * React hook that applies an advanced filter to an image blob
 * (or generates a live preview from a video frame / image element).
 *
 * Uses a Web Worker when available for off-main-thread processing.
 * Falls back to main-thread execution when Web Workers aren't supported
 * (older Safari, some embedded webviews).
 *
 * Usage:
 *   const { applyFilter, previewFilter, isProcessing } = useAdvancedFilter()
 *   const previewUrl = await previewFilter(blob, filterDef, { maxWidth: 480 })
 *   const fullBlob = await applyFilter(blob, filterDef)
 */

'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  applyAdvancedFilterToBlob,
  type FilterDefinition,
} from '@/lib/advanced-filters'

interface PreviewOptions {
  /** Max width or height of the preview (smaller = faster). Default 480. */
  maxWidth?: number
}

interface UseAdvancedFilterResult {
  /** Apply the full filter pipeline at full resolution. Use at upload time. */
  applyFilter: (blob: Blob, filter: FilterDefinition) => Promise<Blob>
  /**
   * Apply the filter at a smaller resolution for fast preview rendering.
   * Returns a blob URL. Caller must revoke the URL when done.
   */
  previewFilter: (
    blob: Blob,
    filter: FilterDefinition,
    opts?: PreviewOptions,
  ) => Promise<string>
  /** True when a worker or main-thread filter operation is in progress. */
  isProcessing: boolean
  /** Error message from the last failed filter operation, if any. */
  error: string | null
}

export function useAdvancedFilter(): UseAdvancedFilterResult {
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const workerRef = useRef<Worker | null>(null)

  useEffect(() => {
    // Lazily create the worker on mount. Don't fail if Worker is unsupported.
    try {
      // Next.js requires ?worker import syntax to get a Worker constructor.
      // The actual bundling is handled by Next's webpack config.
      // Using `new Worker(new URL('./advanced-filters.worker.ts', import.meta.url))`
      // is the modern, cross-bundler way.
      workerRef.current = new Worker(
        new URL('../lib/advanced-filters.worker.ts', import.meta.url),
      )
    } catch {
      workerRef.current = null
    }

    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
    }
  }, [])

  /**
   * Worker-based pixel processing. Takes a Blob, decodes to ImageData at
   * the given max width, runs pixel ops in the worker, then composites
   * the canvas-based ops (vignette, leak, bloom, orton) on the main thread.
   */
  const processViaWorker = useCallback(
    async (
      blob: Blob,
      filter: FilterDefinition,
      maxDim: number,
    ): Promise<Blob> => {
      if (!workerRef.current) {
        // Fall back to main thread
        return applyAdvancedFilterToBlob(blob, filter)
      }

      const url = URL.createObjectURL(blob)
      try {
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = url
        })

        let w = img.naturalWidth || img.width
        let h = img.naturalHeight || img.height
        // Scale down to maxDim on the longer edge
        const longest = Math.max(w, h)
        if (longest > maxDim) {
          const scale = maxDim / longest
          w = Math.round(w * scale)
          h = Math.round(h * scale)
        }

        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) throw new Error('Canvas context unavailable')

        // Step 0: Apply previewCss (CSS-level filter) first
        if (filter.previewCss && filter.previewCss !== 'none') {
          ctx.filter = filter.previewCss
        }
        ctx.drawImage(img, 0, 0, w, h)
        ctx.filter = 'none'

        // Step 1: Get ImageData to send to worker
        const imgData = ctx.getImageData(0, 0, w, h)

        // Step 2: Send to worker (transfer ownership of the buffer)
        const worker = workerRef.current
        const result = await new Promise<ImageData>((resolve, reject) => {
          const handler = (e: MessageEvent) => {
            worker.removeEventListener('message', handler)
            worker.removeEventListener('error', errHandler)
            if (e.data?.imageData) resolve(e.data.imageData)
            else reject(new Error('Worker returned no image data'))
          }
          const errHandler = (e: ErrorEvent) => {
            worker.removeEventListener('message', handler)
            worker.removeEventListener('error', errHandler)
            reject(new Error('Worker error: ' + e.message))
          }
          worker.addEventListener('message', handler)
          worker.addEventListener('error', errHandler)
          // We must clone the filter because the worker will mutate the
          // ImageData in place, but the filter itself should be safe to send
          worker.postMessage({ imageData: imgData, filter: structuredClone(filter) }, [
            imgData.data.buffer,
          ])
        })

        // Step 3: Put the processed ImageData back on the canvas
        ctx.putImageData(result, 0, 0)

        // Step 4: Apply canvas-composite ops on main thread
        // (Vignette, light leak, bloom, orton all need Canvas2D)
        const { applyVignette, applyLightLeak, applyBloomViaCanvas, applyOrton } =
          await import('@/lib/advanced-filters')
        if (filter.vignette) applyVignette(ctx, w, h, filter.vignette)
        if (filter.lightLeak) applyLightLeak(ctx, w, h, filter.lightLeak)
        if (filter.bloom) applyBloomViaCanvas(ctx, canvas, w, h, filter.bloom)
        if (filter.orton) applyOrton(ctx, canvas, w, h, filter.orton)

        // Step 5: Export as JPEG blob
        return new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (out) => out ? resolve(out) : reject(new Error('toBlob failed')),
            'image/jpeg',
            0.92,
          )
        })
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0)
      }
    },
    [],
  )

  const applyFilter = useCallback(
    async (blob: Blob, filter: FilterDefinition): Promise<Blob> => {
      setIsProcessing(true)
      setError(null)
      try {
        // Use a high max dimension for the final upload (preserve quality)
        return await processViaWorker(blob, filter, 2400)
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Filter application failed'
        setError(msg)
        // Fallback: try the synchronous main-thread version
        try {
          return await applyAdvancedFilterToBlob(blob, filter)
        } catch (e2) {
          setError(e2 instanceof Error ? e2.message : String(e2))
          return blob // last-resort: return original
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [processViaWorker],
  )

  const previewFilter = useCallback(
    async (
      blob: Blob,
      filter: FilterDefinition,
      opts?: PreviewOptions,
    ): Promise<string> => {
      const maxDim = opts?.maxWidth ?? 480
      try {
        const processed = await processViaWorker(blob, filter, maxDim)
        return URL.createObjectURL(processed)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Preview failed')
        // Fallback: just use the original blob
        return URL.createObjectURL(blob)
      }
    },
    [processViaWorker],
  )

  return { applyFilter, previewFilter, isProcessing, error }
}
