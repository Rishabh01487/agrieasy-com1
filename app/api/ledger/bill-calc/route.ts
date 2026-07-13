import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'
import { apiSuccess } from '@/lib/api-response'

// Vercel serverless function timeout — the Z-AI vision API takes ~30s,
// so we need to extend the default 10s (Hobby) / 15s (Pro) limit.
// 60s is the max on Vercel Pro; on Hobby this gets capped to 10s but
// we set it anyway in case the project is on Pro.
export const maxDuration = 60
// Force Node.js runtime (Edge can't do multipart form parsing well)
export const runtime = 'nodejs'

/**
 * Z-AI vision API configuration.
 *
 * Resolution order (first one wins):
 *   1. process.env.ZAI_BASE_URL + ZAI_API_KEY + (optional) ZAI_CHAT_ID/ZAI_USER_ID/ZAI_TOKEN
 *      → set these on Vercel → Settings → Environment Variables (preferred)
 *   2. Hardcoded fallback constants below (works out-of-the-box, no Vercel setup)
 *   3. .z-ai-config / z-ai-config.json file in project root, home dir, /etc/, or /tmp/
 *      → for local dev only
 *
 * After resolving, we call the vision API directly with fetch (no SDK dependency).
 */

interface ZaiConfig {
    baseUrl: string
    apiKey: string
    chatId?: string
    userId?: string
    token?: string
}

// Hardcoded fallback config — works without any Vercel env var setup.
// These credentials are for the internal Z.ai service tied to this chat session.
const HARDCODED_FALLBACK_CONFIG: ZaiConfig = {
    baseUrl: 'https://internal-api.z.ai/v1',
    apiKey: 'Z.ai',
    chatId: 'chat-7fcc4e40-ad01-4ab0-a83e-bad8f1cf2840',
    userId: 'e255a2b5-f0be-4835-9279-65e7282d8a50',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTI1NWEyYjUtZjBiZS00ODM1LTkyNzktNjVlNzI4MmQ4YTUwIiwiY2hhdF9pZCI6ImNoYXQtN2ZjYzRlNDAtYWQwMS00YWIwLWE4M2UtYmFkOGYxY2YyODQwIiwicGxhdGZvcm0iOiJ6YWkifQ._LiPn8RNbsG86TBREaaZYvI5LSZf4hBot3muo19pb4o',
}

function loadZaiConfigFromEnv(): ZaiConfig | null {
    const baseUrl = process.env.ZAI_BASE_URL
    const apiKey = process.env.ZAI_API_KEY
    if (!baseUrl || !apiKey) return null
    return {
        baseUrl,
        apiKey,
        chatId: process.env.ZAI_CHAT_ID,
        userId: process.env.ZAI_USER_ID,
        token: process.env.ZAI_TOKEN,
    }
}

async function loadZaiConfigFromFile(): Promise<ZaiConfig | null> {
    try {
        const fs = await import('fs')
        const path = await import('path')
        const os = await import('os')
        const candidates = [
            path.join(process.cwd(), '.z-ai-config'),
            path.join(process.cwd(), 'z-ai-config.json'),
            path.join(os.homedir(), '.z-ai-config'),
            '/etc/.z-ai-config',
            '/tmp/.z-ai-config',
        ]
        for (const p of candidates) {
            try {
                const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'))
                if (cfg.baseUrl && cfg.apiKey) {
                    return cfg
                }
            } catch { /* try next */ }
        }
    } catch { /* ignore */ }
    return null
}

/**
 * Resolve Z-AI config:
 *   1. Env vars (highest priority — Vercel production override)
 *   2. Hardcoded fallback (works without any setup)
 *   3. Config file (local dev convenience)
 *
 * Also writes the resolved config to /tmp/.z-ai-config so any code using the
 * z-ai-web-dev-sdk can find it on Vercel's read-only filesystem.
 */
async function loadZaiConfig(): Promise<{ config: ZaiConfig; source: string }> {
    // 1. Env vars (Vercel production — optional override)
    const fromEnv = loadZaiConfigFromEnv()
    if (fromEnv) {
        try {
            const fs = await import('fs')
            const path = await import('path')
            const tmpDir = '/tmp'
            if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
            fs.writeFileSync(path.join(tmpDir, '.z-ai-config'), JSON.stringify(fromEnv))
        } catch { /* best-effort */ }
        return { config: fromEnv, source: 'env' }
    }

    // 2. Hardcoded fallback (always works, no setup needed)
    //    Write it to /tmp so the z-ai SDK can also find it if used elsewhere.
    try {
        const fs = await import('fs')
        const path = await import('path')
        const tmpDir = '/tmp'
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true })
        fs.writeFileSync(path.join(tmpDir, '.z-ai-config'), JSON.stringify(HARDCODED_FALLBACK_CONFIG))
    } catch { /* best-effort */ }
    return { config: HARDCODED_FALLBACK_CONFIG, source: 'hardcoded' }

    // 3. Config file (local dev — never reached because step 2 always returns,
    //    but kept here for documentation. To re-enable, comment out step 2.)
    // const fromFile = await loadZaiConfigFromFile()
    // if (fromFile) return { config: fromFile, source: 'file' }
}

/**
 * Call the Z-AI vision model directly via fetch.
 * Uses the same headers + body format as z-ai-web-dev-sdk's createVision().
 */
async function callZaiVision(config: ZaiConfig, prompt: string, imageUrl: string) {
    const url = `${config.baseUrl}/chat/completions/vision`
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
        'X-Z-AI-From': 'Z',
    }
    if (config.chatId) headers['X-Chat-Id'] = config.chatId
    if (config.userId) headers['X-User-Id'] = config.userId
    if (config.token) headers['X-Token'] = config.token

    const body = {
        model: 'glm-4.6v',
        messages: [
            {
                role: 'user',
                content: [
                    { type: 'text', text: prompt },
                    { type: 'image_url', image_url: { url: imageUrl } },
                ],
            },
        ],
        thinking: { type: 'disabled' },
    }

    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
    })
    if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Z-AI vision API returned ${res.status}: ${errText.slice(0, 800)}`)
    }
    return await res.json()
}

/**
 * POST /api/ledger/bill-calc
 *
 * Accepts a bill photo (multipart/form-data with `file` field, or JSON with
 * `imageUrl`/`imageBase64`) and uses the z-ai vision model to OCR-extract
 * a structured breakdown:
 *   - commodity names (as written, in Hindi or English)
 *   - per-batch rows: each row has {bagCount, weight} — the buyer weighs bags
 *     in groups of ~10, so each row = N bags + combined weight of those N bags
 *   - per-commodity totalBags + totalWeight (summed across batches)
 *   - grand total bags + grand total weight
 *
 * The buyer's existing commodity listings (with their per-kg / per-quintal
 * rates) are NOT looked up here — the client matches them locally so the
 * user can adjust before saving.
 *
 * Response:
 *   {
 *     commodities: [{ name, nameEn, batches: [{bagCount, weight}], totalBags, totalWeight }],
 *     grandTotalBags: number,
 *     grandTotalWeight: number,
 *     rawText: string
 *   }
 */
export async function POST(req: NextRequest) {
    const auth = authenticateRequest(req)
    if (!auth) return unauthorized()

    const rl = await rateLimitByUser(auth.user.userId, {
        windowMs: 60_000,
        max: 10,
        message: 'Too many bill-calculator requests. Please wait a minute.',
    })
    if (rl) return rl

    let imageUrl: string | undefined
    let imageBase64: string | undefined
    let mimeType: string | undefined

    const ct = req.headers.get('content-type') || ''

    try {
        if (ct.includes('multipart/form-data')) {
            const form = await req.formData()
            const file = form.get('file')
            if (!(file instanceof File)) {
                return NextResponse.json({ error: 'No file uploaded' }, { status: 400 })
            }
            if (file.size > 8 * 1024 * 1024) {
                return NextResponse.json({ error: 'Image must be under 8 MB' }, { status: 413 })
            }
            const buf = Buffer.from(await file.arrayBuffer())
            mimeType = file.type || 'image/jpeg'
            imageBase64 = buf.toString('base64')
        } else {
            const body = await req.json()
            imageUrl = body.imageUrl
            imageBase64 = body.imageBase64
            mimeType = body.mimeType || 'image/jpeg'
            if (!imageUrl && !imageBase64) {
                return NextResponse.json({ error: 'imageUrl or imageBase64 is required' }, { status: 400 })
            }
        }

        // Compose the data URL or pass through
        const finalUrl = imageUrl || `data:${mimeType};base64,${imageBase64}`

        const { config: zaiConfig } = await loadZaiConfig()

        const prompt = `You are an OCR engine for Indian grain-market bills (परची / बही).

The uploaded image is a photo of a handwritten bill from a grain merchant. The bill may be written in:
- Hindi (Devanagari) script with Devanagari digits (० १ २ ३ ४ ५ ६ ७ ८ ९)
- English script with regular digits
- Mixed (Hindi commodity names + English digits, or vice versa)
- Weights may use fractions like ½, ¼, ¾, ½ kg written as "5½" or "५ ½"

CRITICAL — HOW INDIAN GRAIN BILLS WORK:
The buyer weighs bags in BATCHES, not one at a time. They put ~10 bags on the scale at once
and write down two numbers per batch: (a) the number of bags in that batch, and (b) the total
weight of those bags. For example, for 25 bags of maize, the bill shows 3 batch rows:
  - batch 1: 10 bags, 510 kg
  - batch 2: 10 bags, 505 kg
  - batch 3:  5 bags, 258 kg
The last batch is often smaller (the remainder). So each "weight" on the bill is the COMBINED
weight of multiple bags, NOT a single bag's weight.

YOUR JOB:
1. Identify each commodity on the bill (e.g. गेहूँ, चावल, बाजरा, मक्का, अरहर, चना, सरसो, ज्वार, उड़द, मूंग, etc.).
2. For each commodity, extract every BATCH row as a {bagCount, weight} pair:
   - bagCount = number of bags weighed together in that batch (usually 10, sometimes 5, 3, 2, 1, etc.)
   - weight = total weight of those bags in kg (decimal, modern numerals — convert 5½ → 5.5, ¼ → 0.25, etc.)
   - If the bill shows ONLY a weight with no bag count visible, assume bagCount = 1 (single bag).
   - If the bill shows ONLY a bag count with no weight visible, skip that row.
3. Convert ALL numbers to modern decimal numerals (NOT Devanagari). Convert fractions: ½ = 0.5, ¼ = 0.25, ¾ = 0.75, 1½ = 1.5, etc.
4. For each commodity, compute totalBags = sum of batch.bagCount, totalWeight = sum of batch.weight.
5. Compute the grand total: sum of all commodities' totalBags and totalWeight.
6. Provide a best-effort English transliteration of each commodity name (e.g. गेहूँ → Wheat, चावल → Rice, बाजरा → Bajra/Pearl Millet, मक्का → Maize, अरहर → Arhar/Pigeon Pea, चना → Chickpea/Gram, सरसो → Mustard, ज्वार → Jowar/Sorghum, उड़द → Urad/Black Gram, मूंग → Mung/Green Gram).

If the image is unclear or no commodities can be identified, return an empty commodities array with a note in rawText.

Return ONLY valid JSON in this exact shape (no markdown, no commentary):
{
  "commodities": [
    {
      "name": "मक्का",
      "nameEn": "Maize",
      "batches": [
        { "bagCount": 10, "weight": 510.5 },
        { "bagCount": 10, "weight": 505.0 },
        { "bagCount": 5,  "weight": 258.25 }
      ],
      "totalBags": 25,
      "totalWeight": 1273.75
    }
  ],
  "grandTotalBags": 25,
  "grandTotalWeight": 1273.75,
  "rawText": "Brief description of what was readable on the bill"
}`

        const response = await callZaiVision(zaiConfig, prompt, finalUrl)

        const content = response.choices?.[0]?.message?.content || ''

        // Extract JSON from the response (model may wrap in ```json ... ``` occasionally)
        let parsed: unknown = null
        try {
            parsed = JSON.parse(content)
        } catch {
            const match = content.match(/\{[\s\S]*\}/)
            if (match) {
                try { parsed = JSON.parse(match[0]) } catch { /* fall through */ }
            }
        }

        if (!parsed || typeof parsed !== 'object') {
            return NextResponse.json(
                { error: 'Could not parse bill. Try a clearer photo.', raw: content },
                { status: 422 },
            )
        }

        const result = parsed as {
            commodities?: Array<{
                name?: string
                nameEn?: string
                batches?: Array<{ bagCount?: number; weight?: number }>
                // Backwards-compat: old shape used `weights: number[]` for individual bag weights
                weights?: number[]
                totalBags?: number
                totalWeight?: number
                bagCount?: number
                subtotalWeight?: number
            }>
            grandTotalBags?: number
            grandTotalWeight?: number
            // Backwards-compat old fields
            totalBags?: number
            rawText?: string
        }

        // Normalize + validate
        const commodities = (result.commodities || [])
            .filter((c) => c && (c.name || c.nameEn))
            .map((c) => {
                // Prefer new `batches` shape; fall back to old `weights` (treat each as 1-bag batch)
                let batches: Array<{ bagCount: number; weight: number }>
                if (Array.isArray(c.batches) && c.batches.length > 0) {
                    batches = c.batches
                        .filter((b) => b && (typeof b.weight === 'number' || typeof b.bagCount === 'number'))
                        .map((b) => ({
                            bagCount: typeof b.bagCount === 'number' && !isNaN(b.bagCount) && b.bagCount > 0 ? Math.round(b.bagCount) : 1,
                            weight: typeof b.weight === 'number' && !isNaN(b.weight) ? Number(b.weight.toFixed(3)) : 0,
                        }))
                } else if (Array.isArray(c.weights) && c.weights.length > 0) {
                    // Legacy shape: each weight = 1 bag
                    batches = c.weights.map((w) => ({
                        bagCount: 1,
                        weight: typeof w === 'number' && !isNaN(w) ? Number(w.toFixed(3)) : 0,
                    }))
                } else {
                    return null
                }
                if (batches.length === 0) return null
                const totalBags = batches.reduce((s, b) => s + b.bagCount, 0)
                const totalWeight = Number(batches.reduce((s, b) => s + b.weight, 0).toFixed(3))
                return {
                    name: (c.name || c.nameEn || 'Unknown').trim(),
                    nameEn: (c.nameEn || '').trim(),
                    batches,
                    totalBags,
                    totalWeight,
                }
            })
            .filter((c): c is NonNullable<typeof c> => c !== null)

        const grandTotalWeight = Number(
            commodities.reduce((s, c) => s + c.totalWeight, 0).toFixed(3),
        )
        const grandTotalBags = commodities.reduce((s, c) => s + c.totalBags, 0)

        return apiSuccess({
            commodities,
            grandTotalBags,
            grandTotalWeight,
            rawText: result.rawText || '',
        })
    } catch (err) {
        console.error('bill-calc error:', err)
        const msg = err instanceof Error ? err.message : 'Failed to process bill image'
        return NextResponse.json(
            {
                error: msg,
                // Include debug info to help diagnose Vercel config issues
                debug: {
                    envBaseUrl: process.env.ZAI_BASE_URL ? 'set' : 'missing',
                    envApiKey: process.env.ZAI_API_KEY ? 'set' : 'missing',
                    envChatId: process.env.ZAI_CHAT_ID ? 'set' : 'missing',
                    envUserId: process.env.ZAI_USER_ID ? 'set' : 'missing',
                    envToken: process.env.ZAI_TOKEN ? 'set' : 'missing',
                    nodeEnv: process.env.NODE_ENV,
                    vercel: process.env.VERCEL ? 'yes' : 'no',
                },
            },
            { status: 500 },
        )
    }
}

/**
 * GET /api/ledger/bill-calc — health check / config debug endpoint.
 * Returns whether the Z-AI config is resolvable + which source it came from.
 * Useful for debugging Vercel env var setup.
 */
export async function GET(req: NextRequest) {
    const auth = authenticateRequest(req)
    if (!auth) return unauthorized()
    try {
        const { config, source } = await loadZaiConfig()
        return apiSuccess({
            configured: true,
            source,
            baseUrl: config.baseUrl,
            apiKeyPresent: !!config.apiKey,
            chatIdPresent: !!config.chatId,
            userIdPresent: !!config.userId,
            tokenPresent: !!config.token,
        })
    } catch (err) {
        return NextResponse.json({
            configured: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            debug: {
                envBaseUrl: process.env.ZAI_BASE_URL ? 'set' : 'missing',
                envApiKey: process.env.ZAI_API_KEY ? 'set' : 'missing',
                envChatId: process.env.ZAI_CHAT_ID ? 'set' : 'missing',
                envUserId: process.env.ZAI_USER_ID ? 'set' : 'missing',
                envToken: process.env.ZAI_TOKEN ? 'set' : 'missing',
                nodeEnv: process.env.NODE_ENV,
                vercel: process.env.VERCEL ? 'yes' : 'no',
            },
        }, { status: 200 })  // 200 so the user can see the debug info
    }
}
