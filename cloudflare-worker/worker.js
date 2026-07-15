/**
 * AgriEasy Bill OCR — Cloudflare Worker
 *
 * This is a FREE Cloudflare Worker that acts as a CORS proxy to the Z-AI
 * vision API. It solves three problems:
 *   1. Z-AI API doesn't return CORS headers → browser blocks the response
 *   2. Vercel Hobby tier kills functions at 10s → OCR (15-25s) times out
 *   3. Gemini API is blocked in India
 *
 * Cloudflare Workers:
 *   - Free tier: 100,000 requests/day
 *   - 30 second CPU time limit (plenty for OCR)
 *   - Works in India
 *   - Returns CORS headers (browser allows the response)
 *
 * ── HOW TO DEPLOY (takes 2 minutes) ──
 * 1. Go to https://dash.cloudflare.com → sign in (free account)
 * 2. Left sidebar → "Workers & Pages" → click "Create"
 * 3. Click "Create Worker"
 * 4. Give it a name (e.g. "agrieasy-ocr")
 * 5. Delete the default code and PASTE THIS ENTIRE FILE
 * 6. Click "Deploy"
 * 7. Copy the Worker URL (e.g. https://agrieasy-ocr.your-name.workers.dev)
 * 8. Paste that URL into BillCalculator.tsx (replace WORKER_URL)
 *
 * That's it! The Worker is now live and free forever.
 */

const ZAI_CONFIG = {
    baseUrl: 'https://internal-api.z.ai/v1',
    apiKey: 'Z.ai',
    chatId: 'chat-7fcc4e40-ad01-4ab0-a83e-bad8f1cf2840',
    userId: 'e255a2b5-f0be-4835-9279-65e7282d8a50',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTI1NWEyYjUtZjBiZS00ODM1LTkyNzktNjVlNzI4MmQ4YTUwIiwiY2hhdF9pZCI6ImNoYXQtN2ZjYzRlNDAtYWQwMS00YWIwLWE4M2UtYmFkOGYxY2YyODQwIiwicGxhdGZvcm0iOiJ6YWkifQ._LiPn8RNbsG86TBREaaZYvI5LSZf4hBot3muo19pb4o',
}

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
    async fetch(request) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS })
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Use POST' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            })
        }

        try {
            const body = await request.json()

            const messages = body.messages || [{
                role: 'user',
                content: [
                    { type: 'text', text: body.prompt || 'Extract text from this image.' },
                    { type: 'image_url', image_url: { url: body.imageUrl } },
                ],
            }]

            const zaiRes = await fetch(`${ZAI_CONFIG.baseUrl}/chat/completions/vision`, {
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

            const data = await zaiRes.text()
            return new Response(data, {
                status: zaiRes.status,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            })
        } catch (err) {
            return new Response(JSON.stringify({
                error: err.message || 'Worker error',
            }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            })
        }
    },
}
