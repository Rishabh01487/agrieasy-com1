import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/ledger/bill-ocr
 *
 * Server-side OCR using Qwen3-VL via OpenRouter.
 * Sends the bill image + a structured prompt → gets clean JSON back.
 * The AI handles reading messy handwritten Hindi/English bills.
 * The deterministic calculation is done client-side.
 *
 * Body: { image: "base64_string" }
 * Response: { commodities: [...], grandTotalBags, grandTotalWeight }
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = 'qwen/qwen3-vl-32b-instruct'

const SYSTEM_PROMPT = `You are a bill OCR system specialized in reading Indian agricultural bills. These bills are handwritten in Hindi (Devanagari) or English.

OUTPUT: Return ONLY valid JSON. No markdown, no explanation.

NUMBER NORMALIZATION:
- "55/-" = 55.000 kg
- "55-0" = 55.000 kg
- "55|0" = 55.000 kg
- "55|5" = 55.500 kg (pipe = decimal separator)
- "55/5" = 55.500 kg (slash = decimal separator)
- "55.5" = 55.500 kg
- "5½" = 5.500 kg, "¼" = 0.250 kg, "¾" = 0.750 kg
- Convert Devanagari digits (०-९) to English (0-9): "५५/५" = 55.500

TWO BILL FORMATS — detect which one this bill uses:

FORMAT A — INDIVIDUAL BAG WEIGHTS:
Each number is a SINGLE BAG's weight. The bill lists individual bag weights
in a column, and the number of bags is written separately (e.g. "16 bags").
Example: "16 bags" + column of numbers: 55|0, 51|0, 56|0, 52|0...
Each number = 1 bag. Total bags = count of numbers.

FORMAT B — BATCH WEIGHTS:
Numbers are grouped in batch rows. Each row has a bag count + combined weight.
Example: "10 bags 535.5 kg", "10 bags 539.2 kg", "5 bags 256.8 kg"
Each row's weight is the COMBINED weight of those bags.

OUTPUT FORMAT:
{
  "commodities": [
    {
      "name": "Wheat",
      "nameHindi": "गेहूँ",
      "format": "individual",
      "individualWeights": [55.0, 51.0, 56.0, 52.0],
      "batches": [],
      "rate": "25",
      "unit": "kg"
    },
    {
      "name": "Rice",
      "nameHindi": "चावल",
      "format": "batch",
      "individualWeights": [],
      "batches": [
        { "bagCount": 10, "weight": 535.500 },
        { "bagCount": 5, "weight": 256.800 }
      ],
      "rate": "28.50",
      "unit": "kg"
    }
  ]
}

Rules:
- "format": "individual" if each number is 1 bag's weight
- "format": "batch" if numbers are combined batch totals
- "individualWeights": array of numbers (for individual format)
- "batches": array of {bagCount, weight} (for batch format)
- "rate": price per unit as string (e.g. "25" or "21.10")
- "unit": "kg" or "quintal"
- Read EACH commodity separately — do NOT copy data between commodities
- Convert all Devanagari digits to English
- Apply number normalization rules
- If unreadable, use 0
- Output ONLY JSON`

export async function POST(req: NextRequest) {
  try {
    if (!OPENROUTER_API_KEY) {
      return NextResponse.json(
        { error: 'OCR service not configured. Set OPENROUTER_API_KEY env var.' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { image } = body

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { error: 'Image (base64) is required' },
        { status: 400 }
      )
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'https://agrieasy.site',
        'X-Title': 'AgriEasy Bill OCR',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Read this bill image and extract all commodities, their batches (bag counts + weights), and rates. Return ONLY valid JSON. Apply all number normalization rules (55/- = 55.000, 55|5 = 55.500, etc.). Remember each batch weight is the COMBINED weight of those bags.'
              },
              {
                type: 'image_url',
                image_url: { url: `data:image/jpeg;base64,${image}` }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('[bill-ocr] OpenRouter error:', response.status, errText.slice(0, 200))
      return NextResponse.json(
        { error: `OCR API returned ${response.status}` },
        { status: 502 }
      )
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content || ''

    let parsed: any
    try {
      let cleaned = content.trim()
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      }
      parsed = JSON.parse(cleaned)
    } catch {
      console.error('[bill-ocr] Failed to parse JSON:', content.slice(0, 300))
      return NextResponse.json(
        { error: 'OCR returned invalid JSON', raw: content.slice(0, 500) },
        { status: 500 }
      )
    }

    if (!parsed.commodities || !Array.isArray(parsed.commodities)) {
      return NextResponse.json(
        { error: 'No commodities found in OCR response' },
        { status: 422 }
      )
    }

    let grandTotalBags = 0
    let grandTotalWeight = 0

    const commodities = parsed.commodities.map((c: any) => {
      const isIndividual = c.format === 'individual' || (c.individualWeights && c.individualWeights.length > 0 && (!c.batches || c.batches.length === 0))

      let batches: { bagCount: number; weight: number; individualWeights?: number[] }[] = []
      let totalBags = 0
      let totalWeight = 0

      if (isIndividual && c.individualWeights && c.individualWeights.length > 0) {
        // Individual bag weights — each number is 1 bag
        const weights = c.individualWeights.map((w: any) => Math.round(Number(w || 0) * 1000) / 1000)
        totalBags = weights.length
        totalWeight = Math.round(weights.reduce((s: number, w: number) => s + w, 0) * 1000) / 1000
        // Store as a single batch with all individual weights
        batches = [{
          bagCount: weights.length,
          weight: totalWeight,
          individualWeights: weights,
        }]
      } else {
        // Batch format — each row has bagCount + combined weight
        batches = (c.batches || []).map((b: any) => ({
          bagCount: Math.max(0, Math.round(Number(b.bagCount) || 0)),
          weight: Math.round(Number(b.weight || 0) * 1000) / 1000,
        }))
        totalBags = batches.reduce((s: number, b: any) => s + b.bagCount, 0)
        totalWeight = Math.round(batches.reduce((s: number, b: any) => s + b.weight, 0) * 1000) / 1000)
      }

      grandTotalBags += totalBags
      grandTotalWeight += totalWeight

      return {
        name: c.name || c.nameHindi || 'Unknown',
        nameEn: c.name && c.name !== c.nameHindi ? c.name : (c.nameHindi || c.name || ''),
        batches,
        totalBags,
        totalWeight,
      }
    })

    return NextResponse.json({
      commodities,
      grandTotalBags,
      grandTotalWeight: Math.round(grandTotalWeight * 1000) / 1000,
      rawText: content,
    })

  } catch (error) {
    console.error('[bill-ocr] Error:', error)
    return NextResponse.json(
      { error: 'OCR request failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: OPENROUTER_API_KEY ? 'configured' : 'not_configured',
    model: MODEL,
    message: OPENROUTER_API_KEY
      ? 'Qwen3-VL OCR proxy is ready. POST a base64 image to /api/ledger/bill-ocr'
      : 'Set OPENROUTER_API_KEY env var to enable Qwen3-VL OCR',
  })
}
