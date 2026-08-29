import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

/**
 * AgriEasy Bill OCR Proxy — Z-AI GLM-4.6V Vision Model
 * Uses the z-ai-web-dev-sdk to call the free Z-AI vision API.
 * No auth required — works with or without login.
 * Error messages are user-friendly — never exposes internal API errors.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Z-AI config ───────────────────────────────────────────────────────
// SECURITY: previously held a hardcoded JWT token — removed because it
// was leaked into git history. Credentials MUST come from env vars now.
// If env vars are missing, the route returns 503 — it never falls back
// to embedded credentials.
interface ZaiConfig {
    baseUrl: string
    apiKey: string
    chatId?: string
    userId?: string
    token?: string
}

function loadZaiConfigFromEnv(): ZaiConfig | null {
    const baseUrl = process.env.ZAI_BASE_URL
    const apiKey = process.env.ZAI_API_KEY
    // SECURITY: fail-closed — no hardcoded fallback.
    if (!baseUrl || !apiKey) return null
    return {
        baseUrl,
        apiKey,
        chatId: process.env.ZAI_CHAT_ID,
        userId: process.env.ZAI_USER_ID,
        token: process.env.ZAI_TOKEN,
    }
}

// ── OCR prompt ──
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

    // SECURITY: refuse to run without configured credentials — the
    // previously hardcoded Z-AI JWT was leaked into git history. Return
    // a clean 503 instead of falling back to embedded creds.
    const zaiConfig = loadZaiConfigFromEnv()
    if (!zaiConfig) {
      return NextResponse.json(
        { error: 'Bill scanner service unavailable — ZAI_BASE_URL / ZAI_API_KEY env vars are not set.' },
        { status: 503 },
      )
    }

    // Write Z-AI config to /tmp so the SDK can find it
    try {
      const tmpDir = '/tmp'
      await mkdir(tmpDir, { recursive: true }).catch(() => {})
      await writeFile(join(tmpDir, '.z-ai-config'), JSON.stringify(zaiConfig))
    } catch { /* best-effort */ }

    // Dynamically import the SDK (Node.js runtime only)
    const ZAIModule = await import('z-ai-web-dev-sdk')
    const ZAI = (ZAIModule as any).default || ZAIModule
    const zai = await ZAI.create()

    // Build the image URL
    const imageUrl = body.imageBase64
      ? `data:${body.mimeType || 'image/jpeg'};base64,${body.imageBase64}`
      : body.imageUrl

    // Call Z-AI vision model
    const response = await zai.chat.completions.createVision({
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: OCR_PROMPT },
            { type: 'image_url', image_url: { url: imageUrl } },
          ],
        },
      ],
    })

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    console.log(`[bill-calc-proxy] Z-AI OCR succeeded in ${elapsed}s`)

    // Return in OpenAI-compatible format (what the client expects)
    return NextResponse.json({
      choices: response.choices || [{ message: { content: response.choices?.[0]?.message?.content || '' } }],
      _model: 'zai-glm-4.6v',
    })

  } catch (err) {
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
    const errStr = err instanceof Error ? err.message : String(err)
    console.error(`[bill-calc-proxy] Error after ${elapsed}s:`, errStr)

    // Map internal errors to user-friendly messages
    if (errStr.includes('abort') || errStr.includes('timeout') || errStr.includes('Timeout')) {
      return NextResponse.json(
        { error: 'The scan took too long. Please try a smaller or clearer photo.' },
        { status: 504 },
      )
    }
    if (errStr.includes('429') || errStr.includes('rate')) {
      return NextResponse.json(
        { error: 'Too many bill scans. Please wait a minute and try again.' },
        { status: 429 },
      )
    }
    if (errStr.includes('401') || errStr.includes('403') || errStr.includes('auth')) {
      return NextResponse.json(
        { error: 'Bill scanner service needs reconfiguration. Please contact support.' },
        { status: 503 },
      )
    }

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
    model: 'zai-glm-4.6v (via z-ai-web-dev-sdk)',
  })
}
