import { NextRequest, NextResponse } from 'next/server'

/**
 * Thin Edge-runtime proxy to the Z-AI vision API.
 *
 * Why this exists:
 *   - The Z-AI vision API does NOT return Access-Control-Allow-Origin headers,
 *     so the browser cannot call it directly (CORS-blocked).
 *   - Public CORS proxies (corsproxy.io, allorigins.win) either 403 the
 *     request or reject large payloads (413).
 *   - The Node.js serverless function times out at 10s on Vercel Hobby tier,
 *     but the OCR takes 15-30s.
 *
 * Solution: use Vercel's EDGE runtime, which has a 25s timeout on Hobby
 * tier (vs 10s for Node.js). This proxy just forwards the request to
 * Z-AI and streams the response back — no heavy processing on our side.
 *
 * The OCR happens on Z-AI's servers; we just wait for the response.
 * 25s is usually enough (OCR takes 15-25s typically).
 */

// Edge runtime = 25s timeout on Hobby, 30s on Pro
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

const ZAI_CONFIG = {
    baseUrl: 'https://internal-api.z.ai/v1',
    apiKey: 'Z.ai',
    chatId: 'chat-7fcc4e40-ad01-4ab0-a83e-bad8f1cf2840',
    userId: 'e255a2b5-f0be-4835-9279-65e7282d8a50',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTI1NWEyYjUtZjBiZS00ODM1LTkyNzktNjVlNzI4MmQ4YTUwIiwiY2hhdF9pZCI6ImNoYXQtN2ZjYzRlNDAtYWQwMS00YWIwLWE4M2UtYmFkOGYxY2YyODQwIiwicGxhdGZvcm0iOiJ6YWkifQ._LiPn8RNbsG86TBREaaZYvI5LSZf4hBot3muo19pb4o',
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

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
                messages: body.messages,
                thinking: { type: 'disabled' },
            }),
        })

        if (!zaiRes.ok) {
            const errText = await zaiRes.text()
            return NextResponse.json(
                { error: `Z-AI API returned ${zaiRes.status}: ${errText.slice(0, 500)}` },
                { status: 502 },
            )
        }

        const data = await zaiRes.json()
        return NextResponse.json(data)
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json(
            { error: `Proxy error: ${msg}` },
            { status: 500 },
        )
    }
}
