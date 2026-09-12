/**
 * AgriEasy Bill OCR — Cloudflare Worker
 *
 * Acts as a CORS proxy to the Z-AI vision API for bill OCR.
 * Reads ALL credentials from Cloudflare Worker environment variables
 * (set via dash.cloudflare.com → Workers → agrieasy-ocr → Settings → Variables).
 *
 * SECURITY: No credentials are hardcoded in this file. All secrets are
 * read from the `env` parameter passed to the fetch handler by the
 * Cloudflare Workers runtime.
 *
 * ── REQUIRED ENVIRONMENT VARIABLES (set in Cloudflare dashboard) ──
 *
 *   ZAI_BASE_URL   — e.g. https://internal-api.z.ai/v1
 *   ZAI_API_KEY    — API key (e.g. "Z.ai")
 *   ZAI_CHAT_ID    — Chat session ID
 *   ZAI_USER_ID    — User ID
 *   ZAI_TOKEN      — JWT auth token
 *
 * ── HOW TO DEPLOY ──
 * 1. Go to https://dash.cloudflare.com → Workers & Pages → agrieasy-ocr
 * 2. Settings → Variables → Add each env var above (mark as Secret)
 * 3. Deploy (auto-deploys on every push to main via Workers Builds)
 *
 * Cloudflare Workers:
 *   - Free tier: 100,000 requests/day
 *   - 30 second CPU time limit (plenty for OCR)
 *   - Works in India
 *   - Returns CORS headers (browser allows the response)
 */

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
}

export default {
    async fetch(request, env) {
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: CORS_HEADERS })
        }

        if (request.method !== 'POST') {
            return new Response(JSON.stringify({ error: 'Use POST' }), {
                status: 405,
                headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
            })
        }

        // Read ALL credentials from env vars — nothing hardcoded
        const baseUrl = env.ZAI_BASE_URL
        const apiKey = env.ZAI_API_KEY
        const chatId = env.ZAI_CHAT_ID
        const userId = env.ZAI_USER_ID
        const token  = env.ZAI_TOKEN

        // Fail fast if any env var is missing
        if (!baseUrl || !apiKey || !chatId || !userId || !token) {
            const missing = [
                !baseUrl && 'ZAI_BASE_URL',
                !apiKey && 'ZAI_API_KEY',
                !chatId && 'ZAI_CHAT_ID',
                !userId && 'ZAI_USER_ID',
                !token && 'ZAI_TOKEN',
            ].filter(Boolean).join(', ')
            return new Response(JSON.stringify({
                error: `Missing env vars: ${missing}. Set them in Cloudflare dashboard → Workers → agrieasy-ocr → Settings → Variables.`,
            }), {
                status: 503,
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

            const zaiRes = await fetch(`${baseUrl}/chat/completions/vision`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                    'X-Z-AI-From': 'Z',
                    'X-Chat-Id': chatId,
                    'X-User-Id': userId,
                    'X-Token': token,
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
