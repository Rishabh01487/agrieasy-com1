import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, unauthorized } from '@/lib/auth'

/**
 * Thin Edge-runtime proxy to the Z-AI vision API (glm-4.6v model).
 *
 * Why Z-AI glm-4.6v?
 *   - The OpenRouter free models (nvidia 12B, gemma) gave WRONG OCR results:
 *     misread "551" as "5510", duplicated data across commodities, skipped
 *     commodities. They're not capable enough for handwritten Hindi bills.
 *   - Z-AI glm-4.6v gave PERFECT results in testing (correctly read all 3
 *     commodities with accurate weights in ~15s).
 *
 * Why Edge runtime?
 *   - Vercel Hobby Node.js functions: 10s timeout (too short for 15-25s OCR)
 *   - Vercel Hobby Edge functions: 25s timeout (enough for most OCR)
 *   - Vercel Pro Edge functions: 30s timeout
 *
 * The browser uploads the image to Cloudinary first, then sends only the URL.
 * This keeps the request body small (~500 bytes) and avoids Edge body limits.
 */

export const runtime = 'edge'
export const dynamic = 'force-dynamic'
// 25s on Hobby Edge, 30s on Pro Edge — enough for Z-AI OCR (15-25s typically)
export const maxDuration = 30

const ZAI_CONFIG = {
    baseUrl: 'https://internal-api.z.ai/v1',
    apiKey: 'Z.ai',
    chatId: 'chat-7fcc4e40-ad01-4ab0-a83e-bad8f1cf2840',
    userId: 'e255a2b5-f0be-4835-9279-65e7282d8a50',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTI1NWEyYjUtZjBiZS00ODM1LTkyNzktNjVlNzI4MmQ4YTUwIiwiY2hhdF9pZCI6ImNoYXQtN2ZjYzRlNDAtYWQwMS00YWIwLWE4M2UtYmFkOGYxY2YyODQwIiwicGxhdGZvcm0iOiJ6YWkifQ._LiPn8RNbsG86TBREaaZYvI5LSZf4hBot3muo19pb4o',
}

export async function POST(req: NextRequest) {
    const t0 = Date.now()
    try {
        const auth = authenticateRequest(req)
        if (!auth) return unauthorized()

        const body = await req.json()
        const { imageUrl, prompt } = body

        if (!imageUrl || !prompt) {
            return NextResponse.json(
                { error: 'Missing imageUrl or prompt' },
                { status: 400 },
            )
        }

        const messages = [{
            role: 'user',
            content: [
                { type: 'text', text: prompt },
                { type: 'image_url', image_url: { url: imageUrl } },
            ],
        }]

        const zaiUrl = `${ZAI_CONFIG.baseUrl}/chat/completions/vision`
        const zaiRes = await fetch(zaiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ZAI_CONFIG.apiKey}`,
                'X-Z-AI-From': 'Z',
                'X-Chat-Id': ZAI_CONFIG.chatId,
                'X-User-Id': ZAI_CONFIG.userId,
                'X-Token': ZAI_CONFIG.token,
            },
            body: JSON.stringify({
                model: 'glm-4.6v',
                messages,
                thinking: { type: 'disabled' },
            }),
        })

        const elapsed = ((Date.now() - t0) / 1000).toFixed(1)

        if (!zaiRes.ok) {
            const errText = await zaiRes.text().catch(() => '')
            return NextResponse.json(
                { error: `Z-AI returned ${zaiRes.status} after ${elapsed}s`, detail: errText.slice(0, 500) },
                { status: 502 },
            )
        }

        const data = await zaiRes.json()
        return NextResponse.json(data)
    } catch (err) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(1)
        const msg = err instanceof Error ? err.message : String(err)
        return NextResponse.json(
            { error: `Proxy error after ${elapsed}s: ${msg}`, errorType: err instanceof Error ? err.constructor.name : typeof err },
            { status: 500 },
        )
    }
}
