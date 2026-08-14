import { NextRequest, NextResponse } from 'next/server'

/**
 * AgriEasy Bill OCR Proxy — Z-AI GLM-4.6V Vision Model
 *
 * Uses Z-AI's free vision API to OCR Indian grain market bills.
 * No auth required — works with or without login.
 *
 * Error messages are user-friendly — never exposes internal API errors.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Z-AI Vision API config (same credentials as the main bill-calc route) ──
const ZAI_BASE_URL = 'https://internal-api.z.ai/v1'
const ZAI_API_KEY = 'Z.ai'
const ZAI_CHAT_ID = 'chat-7fcc4e40-ad01-4ab0-a83e-bad8f1cf2840'
const ZAI_USER_ID = 'e255a2b5-f0be-4835-9279-65e7282d8a50'
const ZAI_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTI1NWEyYjUtZjBiZS00ODM1LTkyNzktNjVlNzI4MmQ4YTUwIiwiY2hhdF9pZCI6ImNoYXQtN2ZjYzRlNDAtYWQwMS00YWIwLWE4M2UtYmFkOGYxY2YyODQwIiwicGxhdGZvcm0iOiJ6YWkifQ._LiPn8RNbsG86TBREaaZYvI5LSZf4hBot3muo19pb4o'
const ZAI_MODEL = 'glm-4.6v'

// ── OCR prompt (explains Indian grain bill structure to the vision model) ──
const OCR_PROMPT = `You are an expert at reading Indian agricultural market bills (mandi parchi/bahī).

Analyze this bill image and extract ALL commodity information. Bills may be:
- In Hindi (Devanagari script ०-९), English, or mixed
- Handwritten or printed
- May have fractions (½ = 0.5, ¼ = 0.25)

Convert all Devanagari digits to modern numerals (०→0, १→1, २→2, etc.).

Bags are weighed in BATCHES (not individually). Each row has a bag count + combined weight.

Return ONLY valid JSON (no markdown, no explanation) in this exact format:
{
  "commodities": [
    {
      "name": "commodity name in Hindi (original script)",
      "nameEn": "English translation",
      "batches": [
        { "bagCount": 10, "weight": 510.5 }
      ],
      "totalBags": 10,
      "totalWeight": 510.5
    }
  ],
  "grandTotalBags": 10,
  "grandTotalWeight": 510.5,
  "rawText": "brief description of what was readable"
}`

async function callZaiVision(imageBase64: string, mimeType: string): Promise<any> {
    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`

    const url = `${ZAI_BASE_URL}/chat/completions/vision`
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ZAI_API_KEY}`,
        'X-Z-AI-From': 'Z',
        'X-Chat-Id': ZAI_CHAT_ID,
        'X-User-Id': ZAI_USER_ID,
        'X-Token': ZAI_TOKEN,
    }

    const body = {
        model: ZAI_MODEL,
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: OCR_PROMPT },
                    { type: 'image_url', image_url: { url: dataUrl } },
                ],
            },
        ],
    }

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25000),
    })

    if (!res.ok) {
      const errText = await res.text().catch(() => '')
      throw new Error(`ZAI_${res.status}`)
    }

    return await res.json()
}

export async function POST(req: NextRequest) {
  const t0 = Date.now()
  try {
    const body = await req.json()

    if (!body.imageBase64 && !body.imageUrl) {
      return NextResponse.json(
        { error: 'Please upload a bill image to scan.' },
        { status: 400 },
      )
    }

    // Call Z-AI GLM-4.6V vision model (free, no API key needed)
    const zaiRes = await callZaiVision(body.imageBase64, body.mimeType || 'image/jpeg')

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`[bill-calc-proxy] Z-AI OCR succeeded in ${elapsed}s`)

    // Tag the response so the client knows which model was used
    zaiRes._model = 'zai-glm-4.6v'
    return NextResponse.json(zaiRes)

  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.error(`[bill-calc-proxy] Error after ${elapsed}s:`, err)

    // Map internal errors to user-friendly messages
    const errStr = err instanceof Error ? err.message : String(err)

    // Timeout
    if (errStr.includes('AbortError') || errStr.includes('abort') || errStr.includes('timeout')) {
      return NextResponse.json(
        { error: 'The scan took too long. Please try a smaller or clearer photo.' },
        { status: 504 },
      )
    }

    // Z-AI API errors — map to friendly messages
    if (errStr.startsWith('ZAI_429')) {
      return NextResponse.json(
        { error: 'Too many bill scans. Please wait a minute and try again.' },
        { status: 429 },
      )
    }
    if (errStr.startsWith('ZAI_401') || errStr.startsWith('ZAI_403')) {
      return NextResponse.json(
        { error: 'Bill scanner service needs reconfiguration. Please contact support.' },
        { status: 503 },
      )
    }
    if (errStr.startsWith('ZAI_5')) {
      return NextResponse.json(
        { error: 'The bill scanner service is temporarily unavailable. Please try again in a moment.' },
        { status: 502 },
      )
    }

    // Generic fallback — NEVER expose internal error details
    return NextResponse.json(
      { error: 'Could not scan the bill. Please try again with a clearer photo.' },
      { status: 500 },
    )
  }
}

/**
 * GET /api/ledger/bill-calc-proxy — health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    model: 'zai-glm-4.6v (free, no API key needed)',
  })
}
