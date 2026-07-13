import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'
import { apiSuccess } from '@/lib/api-response'

/**
 * Z-AI vision API configuration.
 *
 * Reads from env vars (set on Vercel → Settings → Environment Variables):
 *   ZAI_BASE_URL  e.g. https://internal-api.z.ai/v1
 *   ZAI_API_KEY   e.g. Z.ai
 *   ZAI_CHAT_ID   (optional)
 *   ZAI_USER_ID   (optional)
 *   ZAI_TOKEN     (optional JWT)
 *
 * Falls back to reading ./z-ai-config.json or /etc/.z-ai-config for local dev.
 */
interface ZaiConfig {
    baseUrl: string
    apiKey: string
    chatId?: string
    userId?: string
    token?: string
}

async function loadZaiConfig(): Promise<ZaiConfig> {
    // 1. Env vars (production / Vercel)
    if (process.env.ZAI_BASE_URL && process.env.ZAI_API_KEY) {
        return {
            baseUrl: process.env.ZAI_BASE_URL,
            apiKey: process.env.ZAI_API_KEY,
            chatId: process.env.ZAI_CHAT_ID,
            userId: process.env.ZAI_USER_ID,
            token: process.env.ZAI_TOKEN,
        }
    }
    // 2. Local config file (dev)
    const fs = await import('fs')
    const path = await import('path')
    const os = await import('os')
    const candidates = [
        path.join(process.cwd(), '.z-ai-config'),
        path.join(process.cwd(), 'z-ai-config.json'),
        path.join(os.homedir(), '.z-ai-config'),
        '/etc/.z-ai-config',
    ]
    for (const p of candidates) {
        try {
            const cfg = JSON.parse(fs.readFileSync(p, 'utf-8'))
            if (cfg.baseUrl && cfg.apiKey) return cfg
        } catch { /* try next */ }
    }
    throw new Error(
        'Z-AI not configured. Set ZAI_BASE_URL + ZAI_API_KEY env vars (Vercel → Settings → Environment Variables), or create .z-ai-config locally.',
    )
}

/**
 * Call the Z-AI vision model directly via fetch (bypasses the z-ai-web-dev-sdk,
 * which only reads from a .z-ai-config file and doesn't work on Vercel's
 * read-only serverless filesystem).
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
        throw new Error(`Z-AI vision API failed (${res.status}): ${errText.slice(0, 500)}`)
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

        const zaiConfig = await loadZaiConfig()

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
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Failed to process bill image' },
            { status: 500 },
        )
    }
}
