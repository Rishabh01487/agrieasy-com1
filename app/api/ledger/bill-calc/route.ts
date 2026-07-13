import { NextRequest, NextResponse } from 'next/server'
import ZAI from 'z-ai-web-dev-sdk'
import { authenticateRequest, unauthorized } from '@/lib/auth'
import { rateLimitByUser } from '@/lib/rate-limit'
import { apiSuccess } from '@/lib/api-response'

/**
 * POST /api/ledger/bill-calc
 *
 * Accepts a bill photo (multipart/form-data with `file` field, or JSON with
 * `imageUrl`/`imageBase64`) and uses the z-ai vision model to OCR-extract
 * a structured breakdown:
 *   - commodity names (as written, in Hindi or English)
 *   - per-bag weights, converted to decimal kg
 *   - per-commodity bag count + subtotal weight
 *   - grand total weight + total bag count
 *
 * The buyer's existing commodity listings (with their per-kg / per-quintal
 * rates) are NOT looked up here — the client matches them locally so the
 * user can adjust before saving.
 *
 * Response:
 *   {
 *     commodities: [{ name, nameEn, weights: [number], bagCount, subtotalWeight }],
 *     grandTotalWeight: number,
 *     totalBags: number,
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

        const zai = await ZAI.create()

        const prompt = `You are an OCR engine for Indian grain-market bills (परची / बही).

The uploaded image is a photo of a handwritten bill from a grain merchant. The bill may be written in:
- Hindi (Devanagari) script with Devanagari digits (० १ २ ३ ४ ५ ६ ७ ८ ९)
- English script with regular digits
- Mixed (Hindi commodity names + English digits, or vice versa)
- Weights may use fractions like ½, ¼, ¾, ½ kg written as "5½" or "५ ½"

Your job:
1. Identify each commodity on the bill (e.g. गेहूँ, चावल, बाजरा, मक्का, अरहर, चना, सरसो, ज्वार, उड़द, मूंग, etc.).
2. For each commodity, list every individual bag weight.
3. Convert ALL weights to decimal kilograms (kg) using modern numerals (NOT Devanagari). Convert fractions: ½ = 0.5, ¼ = 0.25, ¾ = 0.75, 1½ = 1.5, etc.
4. For each commodity, count the bags and sum the weights to get a subtotal.
5. Compute the grand total weight and total bag count across all commodities.
6. Also provide a best-effort English transliteration of each commodity name (e.g. गेहूँ → Wheat, चावल → Rice, बाजरा → Bajra/Pearl Millet, मक्का → Maize, अरहर → Arhar/Pigeon Pea, चना → Chickpea/Gram, सरसो → Mustard, ज्वार → Jowar/Sorghum, उड़द → Urad/Black Gram, मूंग → Mung/Green Gram).

If the image is unclear or no commodities can be identified, return an empty commodities array with a note in rawText.

Return ONLY valid JSON in this exact shape (no markdown, no commentary):
{
  "commodities": [
    {
      "name": "गेहूँ",
      "nameEn": "Wheat",
      "weights": [51.5, 49, 48.25],
      "bagCount": 3,
      "subtotalWeight": 148.75
    }
  ],
  "grandTotalWeight": 148.75,
  "totalBags": 3,
  "rawText": "Brief description of what was readable on the bill"
}`

        const response = await zai.chat.completions.createVision({
            model: 'glm-4.6v',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        { type: 'image_url', image_url: { url: finalUrl } },
                    ],
                },
            ],
            thinking: { type: 'disabled' },
        })

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
                weights?: number[]
                bagCount?: number
                subtotalWeight?: number
            }>
            grandTotalWeight?: number
            totalBags?: number
            rawText?: string
        }

        // Normalize + validate
        const commodities = (result.commodities || [])
            .filter((c) => c && (c.name || c.nameEn) && Array.isArray(c.weights) && c.weights.length > 0)
            .map((c) => {
                const weights = (c.weights || []).map((w) => (typeof w === 'number' && !isNaN(w) ? w : 0))
                return {
                    name: (c.name || c.nameEn || 'Unknown').trim(),
                    nameEn: (c.nameEn || '').trim(),
                    weights,
                    bagCount: weights.length,
                    subtotalWeight: Number(weights.reduce((s, w) => s + w, 0).toFixed(3)),
                }
            })

        const grandTotalWeight = Number(
            commodities.reduce((s, c) => s + c.subtotalWeight, 0).toFixed(3),
        )
        const totalBags = commodities.reduce((s, c) => s + c.bagCount, 0)

        return apiSuccess({
            commodities,
            grandTotalWeight,
            totalBags,
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
