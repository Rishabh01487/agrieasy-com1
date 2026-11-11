import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'
import { verifyCsrf } from '@/lib/csrf'

/**
 * AgriEasy Bill OCR Proxy — GLM-4.6V Vision Model
 * Uses the SDK to call the vision API.
 *
 * SECURITY: requires authentication + per-user rate limit (10/min).
 * Previously this endpoint was unauthenticated ("No auth required —
 * works with or without login"), allowing anonymous internet users to
 * POST arbitrary base64 images and burn the server's Z-AI vision API
 * budget at will. Now: JWT required, CSRF required, max 10/min/user.
 * Error messages are user-friendly — never exposes internal API errors.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ── Vision config ──────────────────────────────────────────────────
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
  // SECURITY FIX (HIGH — anonymous cost abuse):
  // Require auth + CSRF + rate limit. See file header for rationale.
  if (!verifyCsrf(req)) {
    return NextResponse.json({ error: 'CSRF token invalid or missing' }, { status: 403 })
  }
  const auth = authenticateRequest(req)
  if (!auth) return unauthorized()
  const rl = await rateLimitByUser(auth.user.userId, { windowMs: 60_000, max: 10, message: 'Too many bill scans. Please slow down.' })
  if (rl) return rl

  const t0 = Date.now()
  try {
    let body: any = {}; try { body = await req.json() } catch { return NextResponse.json({ error: "Please upload a bill image to scan." }, { status: 400 }) }

    if (!body.imageBase64 && !body.imageUrl) {
      return NextResponse.json(
        { error: 'Please upload a bill image to scan.' },
        { status: 400 },
      )
    }

    // SECURITY: refuse to run without configured credentials — the
    // previously hardcoded provider JWT was leaked into git history. Return
    // a clean 503 instead of falling back to embedded creds.
    const zaiConfig = loadZaiConfigFromEnv()
    if (!zaiConfig) {
      return NextResponse.json(
        { error: 'Bill scanner service unavailable — ZAI_BASE_URL / ZAI_API_KEY env vars are not set.' },
        { status: 503 },
      )
    }

    // Write the config to /tmp so the SDK can find it
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
    // SECURITY (SSRF): only accept image URLs hosted on our own Cloudinary
    // account. Without this check, an unauthenticated attacker could submit
    // http://169.254.169.254/... (cloud metadata) or any internal IP and have
    // the vision model read the response back as text — full internal-network
    // SSRF. Mirrors the same allowlist in bill-calc/route.ts and the
    // Cloudflare Worker (cloudflare-worker/worker.js:95).
    let imageUrl: string
    if (body.imageBase64) {
        imageUrl = `data:${body.mimeType || 'image/jpeg'};base64,${body.imageBase64}`
    } else if (body.imageUrl) {
        const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
        const allowedHost = cloudName ? `${cloudName}.cloudinary.com` : 'res.cloudinary.com'
        let parsedUrl: URL
        try {
            parsedUrl = new URL(body.imageUrl)
        } catch {
            return NextResponse.json({ error: 'Please upload a valid bill image.' }, { status: 400 })
        }
        const isCloudinary =
            (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') &&
            parsedUrl.hostname === allowedHost
        if (!isCloudinary) {
            return NextResponse.json(
                { error: 'Please upload the bill image directly instead of providing a URL.' },
                { status: 400 },
            )
        }
        imageUrl = body.imageUrl
    } else {
        return NextResponse.json(
            { error: 'Please upload a bill image to scan.' },
            { status: 400 },
        )
    }

    // Call the vision model
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
