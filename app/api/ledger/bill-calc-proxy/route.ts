import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, unauthorized } from '@/lib/auth'

/**
 * Thin Node.js proxy to the Z-AI vision API.
 *
 * Why this exists:
 *   - The Z-AI vision API does NOT return Access-Control-Allow-Origin headers,
 *     so the browser cannot call it directly (CORS-blocked).
 *   - Public CORS proxies (corsproxy.io, allorigins.win) either 403 the
 *     request or reject large payloads (413).
 *   - We tried Edge runtime but it crashed with "internal error" on every
 *     request — likely a Vercel Edge runtime bug with this specific
 *     Next.js version. Switched to Node.js runtime.
 *
 * The browser uploads the image to Cloudinary FIRST, then sends only the
 * Cloudinary URL to this proxy. This keeps the request body small.
 *
 * On Vercel Hobby, Node.js functions have a 10s timeout by default but
 * can be extended to 60s with `export const maxDuration = 60` IF the
 * project is on Pro. On Hobby, the function may still get killed at 10s,
 * but at least it won't crash with "internal error" like Edge did.
 */

// Try to extend the timeout — works on Pro, ignored on Hobby (caps at 10s)
export const maxDuration = 60
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ZAI_CONFIG = {
    baseUrl: 'https://internal-api.z.ai/v1',
    apiKey: 'Z.ai',
    chatId: 'chat-7fcc4e40-ad01-4ab0-a83e-bad8f1cf2840',
    userId: 'e255a2b5-f0be-4835-9279-65e7282d8a50',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTI1NWEyYjUtZjBiZS00ODM1LTkyNzktNjVlNzI4MmQ4YTUwIiwiY2hhdF9pZCI6ImNoYXQtN2ZjYzRlNDAtYWQwMS00YWIwLWE4M2UtYmFkOGYxY2YyODQwIiwicGxhdGZvcm0iOiJ6YWkifQ._LiPn8RNbsG86TBREaaZYvI5LSZf4hBot3muo19pb4o',
}

export async function POST(req: NextRequest) {
    const t0 = Date.now()
    const log = (msg: string, extra?: unknown) => {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
        console.log(`[bill-calc-proxy ${elapsed}s] ${msg}`, extra === undefined ? '' : JSON.stringify(extra).slice(0, 300))
    }

    try {
        log('received request')
        const auth = authenticateRequest(req)
        if (!auth) {
            log('auth failed')
            return unauthorized()
        }
        log('auth ok', { userId: auth.user.userId })

        const body = await req.json()
        log('parsed body', { hasImageUrl: !!body.imageUrl, hasMessages: !!body.messages, promptLength: body.prompt?.length || 0 })

        let messages: unknown[]
        if (body.imageUrl) {
            messages = [{
                role: 'user',
                content: [
                    { type: 'text', text: body.prompt || 'Extract the text from this image.' },
                    { type: 'image_url', image_url: { url: body.imageUrl } },
                ],
            }]
        } else if (body.messages) {
            messages = body.messages
        } else {
            log('missing imageUrl or messages')
            return NextResponse.json(
                { error: 'Missing imageUrl or messages in request body' },
                { status: 400 },
            )
        }

        const zaiUrl = `${ZAI_CONFIG.baseUrl}/chat/completions/vision`
        log('calling Z-AI', { url: zaiUrl })
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
        log('Z-AI responded', { status: zaiRes.status })

        if (!zaiRes.ok) {
            const errText = await zaiRes.text().catch(() => '')
            log('Z-AI error', { status: zaiRes.status, body: errText.slice(0, 200) })
            return NextResponse.json(
                {
                    error: `Z-AI API returned ${zaiRes.status}`,
                    detail: errText.slice(0, 500),
                },
                { status: 502 },
            )
        }

        const data = await zaiRes.json()
        log('Z-AI success', { contentLength: data.choices?.[0]?.message?.content?.length || 0 })
        return NextResponse.json(data)
    } catch (err) {
        const elapsed = ((Date.now() - t0) / 1000).toFixed(2)
        const msg = err instanceof Error ? err.message : String(err)
        const stack = err instanceof Error ? err.stack?.slice(0, 500) : ''
        console.error(`[bill-calc-proxy ${elapsed}s] ERROR:`, msg, stack)
        return NextResponse.json(
            {
                error: `Proxy error after ${elapsed}s: ${msg}`,
                errorType: err instanceof Error ? err.constructor.name : typeof err,
                stack: stack || undefined,
            },
            { status: 500 },
        )
    }
}
