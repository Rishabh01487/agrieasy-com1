import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest, unauthorized } from '@/lib/auth'

/**
 * Bill OCR proxy with JOB-BASED POLLING.
 *
 * Problem: Vercel Hobby caps serverless functions at 10s. Z-AI OCR takes 15-25s.
 * Solution: Split into 2 endpoints:
 *   POST /api/ledger/bill-calc-proxy  → starts OCR, returns {jobId} in <1s
 *   GET  /api/ledger/bill-calc-proxy?jobId=xxx  → returns {status, result} in <1s
 *
 * The OCR runs in a global promise that outlives the POST request.
 * The browser polls GET every 2s until status='done' or 'error'.
 *
 * Each HTTP request is <1s → well within Vercel's 10s limit.
 * The OCR itself can take as long as it needs (runs in the background).
 */

export const maxDuration = 10
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ZAI_CONFIG = {
    baseUrl: 'https://internal-api.z.ai/v1',
    apiKey: 'Z.ai',
    chatId: 'chat-7fcc4e40-ad01-4ab0-a83e-bad8f1cf2840',
    userId: 'e255a2b5-f0be-4835-9279-65e7282d8a50',
    token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZTI1NWEyYjUtZjBiZS00ODM1LTkyNzktNjVlNzI4MmQ4YTUwIiwiY2hhdF9pZCI6ImNoYXQtN2ZjYzRlNDAtYWQwMS00YWIwLWE4M2UtYmFkOGYxY2YyODQwIiwicGxhdGZvcm0iOiJ6YWkifQ._LiPn8RNbsG86TBREaaZYvI5LSZf4hBot3muo19pb4o',
}

interface Job {
    status: 'pending' | 'done' | 'error'
    result?: unknown
    error?: string
    createdAt: number
}
const jobs = new Map<string, Job>()

// Clean up jobs older than 5 minutes
setInterval(() => {
    const cutoff = Date.now() - 5 * 60 * 1000
    for (const [id, job] of jobs) {
        if (job.createdAt < cutoff) jobs.delete(id)
    }
}, 60_000)

// ── GET: poll for job status ──
export async function GET(req: NextRequest) {
    const auth = authenticateRequest(req)
    if (!auth) return unauthorized()

    const jobId = new URL(req.url).searchParams.get('jobId')
    if (!jobId) {
        return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 })
    }

    const job = jobs.get(jobId)
    if (!job) {
        return NextResponse.json({ status: 'pending', note: 'Job not found on this instance, keep polling' })
    }

    return NextResponse.json(job)
}

// ── POST: start the OCR job ──
export async function POST(req: NextRequest) {
    const auth = authenticateRequest(req)
    if (!auth) return unauthorized()

    try {
        const body = await req.json()

        const jobId = 'job-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
        jobs.set(jobId, { status: 'pending', createdAt: Date.now() })

        const messages = body.messages || [{
            role: 'user',
            content: [
                { type: 'text', text: body.prompt || 'Extract text.' },
                { type: 'image_url', image_url: { url: body.imageUrl } },
            ],
        }]

        // Start OCR in the BACKGROUND (don't await — return immediately)
        void (async () => {
            try {
                console.log(`[bill-calc-proxy job=${jobId}] starting OCR`)
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

                if (!zaiRes.ok) {
                    const errText = await zaiRes.text()
                    console.error(`[bill-calc-proxy job=${jobId}] Z-AI error ${zaiRes.status}`)
                    jobs.set(jobId, { status: 'error', error: `Z-AI returned ${zaiRes.status}: ${errText.slice(0, 300)}`, createdAt: Date.now() })
                    return
                }

                const data = await zaiRes.json()
                console.log(`[bill-calc-proxy job=${jobId}] OCR done`)
                jobs.set(jobId, { status: 'done', result: data, createdAt: Date.now() })
            } catch (err) {
                console.error(`[bill-calc-proxy job=${jobId}] error:`, err)
                jobs.set(jobId, { status: 'error', error: err instanceof Error ? err.message : String(err), createdAt: Date.now() })
            }
        })()

        // Return jobId IMMEDIATELY (<1s)
        return NextResponse.json({ jobId, status: 'pending' })
    } catch (err) {
        return NextResponse.json(
            { error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500 },
        )
    }
}
