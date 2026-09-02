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

const SYSTEM_PROMPT = `You are a bill OCR system specialized in reading Indian agricultural bills (grain merchant bills). These bills are often handwritten in Hindi (Devanagari) or English, and contain commodity names, bag counts, weights, and rates.

OUTPUT: Return ONLY valid JSON — no markdown, no explanation, no code blocks. Just the JSON object.

IMPORTANT NUMBER NORMALIZATION RULES:
Indian bills use many shorthand notations for weights. You MUST interpret them correctly:
- "55/-" means 55.000 kg
- "55-0" means 55.000 kg  
- "55|0" means 55.000 kg
- "55|5" means 55.500 kg (the number after | is the decimal part)
- "55/5" means 55.500 kg (the number after / is the decimal part)
- "55.5" means 55.500 kg
- "5½" means 5.500 kg
- "¼" means 0.250 kg
- "¾" means 0.750 kg
- Devanagari digits (०१२३४५६७८९) must be converted to English (0123456789)
- "५५/५" means 55.500 kg (Devanagari 55/5)

BATCH STRUCTURE:
Bills are written in BATCHES. Each batch row has:
- Number of bags weighed together (usually 10, sometimes 5, 3, 2, 1)
- Total combined weight of those bags

For example, 25 bags of wheat might be written as 3 batch rows:
  Batch 1: 10 bags, 535.5 kg
  Batch 2: 10 bags, 539.2 kg  
  Batch 3: 5 bags, 256.8 kg

COMMODITY NAMES:
Common Indian agricultural commodities:
- गेहूँ/Wheat, चावल/राइस/Rice, बाजरा/Bajra, मक्का/Maize, अरहर/Arhar, चना/Chana/Chickpea, सरसो/Mustard, ज्वार/Jowar, उड़द/Urad, मूंग/Mung, सोया/Soya, तिल/Til/Sesame, जुट/Jute, गन्ना/Sugarcane, कपास/Cotton, आलू/Potato, प्याज/Onion, टमाटर/Tomato

OUTPUT FORMAT (strict JSON):
{
  "commodities": [
    {
      "name": "Wheat",
      "nameHindi": "गेहूँ",
      "batches": [
        { "bagCount": 10, "weight": 535.500 },
        { "bagCount": 10, "weight": 539.200 },
        { "bagCount": 5, "weight": 256.800 }
      ],
      "rate": "25.25",
      "unit": "kg"
    }
  ]
}

Rules:
- "rate" is the price per unit as a string (e.g. "25.25")
- "unit" is either "kg" or "quintal"
- If rate is not found, set rate to "" and unit to "kg"
- Read EACH commodity's batches SEPARATELY — do not copy weights from one commodity to another
- The last batch is often smaller (remainder of bags)
- Each batch weight is the COMBINED weight of those bags, NOT a single bag's weight
- Convert ALL Devanagari digits to English decimal digits
- Apply the number normalization rules above
- If you can't read a number, use 0
- Output ONLY JSON, nothing else`

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
      const batches = (c.batches || []).map((b: any) => ({
        bagCount: Math.max(0, Math.round(Number(b.bagCount) || 0)),
        weight: Math.round(Number(b.weight || 0) * 1000) / 1000,
      }))

      const totalBags = batches.reduce((s: number, b: any) => s + b.bagCount, 0)
      const totalWeight = Math.round(batches.reduce((s: number, b: any) => s + b.weight, 0) * 1000) / 1000

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
