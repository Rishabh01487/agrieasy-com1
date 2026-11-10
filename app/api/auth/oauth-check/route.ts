import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * GET /api/auth/oauth-check — self-diagnosing Google OAuth configuration report.
 *
 * WHY THIS EXISTS (2026-11-10):
 * The user configured the Google Cloud Console but Google still showed
 * "Error 400: redirect_uri_mismatch". The /api/auth/providers endpoint only
 * proves that env vars exist — it can NOT tell you whether Google actually
 * ACCEPTS the redirect_uri for the client_id being used. This endpoint does:
 * it performs the exact same authorization request a real "Continue with
 * Google" click performs, and reports whether Google accepts or rejects it.
 *
 * Safety: exposes NO secrets (client secret is never read into the response,
 * only its presence as a boolean). The client ID and redirect URI are public
 * by design — they are visible in every browser address bar during OAuth.
 * Responses are cached for 60s so the endpoint can't be used to hammer Google.
 */

const CACHE_TTL_MS = 60_000
let cached: { body: Record<string, unknown>; at: number } | null = null

/** Decode Google's base64 `authError` payload and find the machine error code. */
function classifyGoogleError(location: string): { code: string; detail: string } {
    const match = location.match(/authError=([^&]+)/)
    let decoded = ''
    if (match) {
        try {
            const b64 = match[1].replace(/-/g, '+').replace(/_/g, '/')
            decoded = Buffer.from(b64, 'base64').toString('utf8')
        } catch {
            decoded = ''
        }
    }
    // Fallback: the query itself sometimes carries ?error=<code>
    if (!decoded) decoded = location

    if (decoded.includes('redirect_uri_mismatch')) {
        return {
            code: 'redirect_uri_mismatch',
            detail: 'Google rejected the callback URL: it is NOT in the Authorized redirect URIs list of the OAuth client shown above.',
        }
    }
    if (decoded.includes('invalid_client')) {
        return {
            code: 'invalid_client',
            detail: 'Google does not recognise this client_id — GOOGLE_CLIENT_ID is wrong (typo, whitespace, or a deleted client).',
        }
    }
    if (decoded.includes('admin_policy_enforced')) {
        return {
            code: 'admin_policy_enforced',
            detail: 'A Google Workspace admin policy is blocking this app for that account.',
        }
    }
    if (decoded.includes('access_denied')) {
        return {
            code: 'access_denied',
            detail: 'OAuth consent screen may be unverified or the app was denied.',
        }
    }
    const snippet = decoded.replace(/[^\x20-\x7E]/g, ' ').slice(0, 200)
    return { code: 'unknown_google_error', detail: snippet || 'Google returned an unrecognized error page.' }
}

export async function GET() {
    // 60s cache so bots can't hammer Google through this endpoint
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
        return NextResponse.json({ ...cached.body, cached: true })
    }

    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim()
    const clientSecretSet = !!process.env.GOOGLE_CLIENT_SECRET
    const nextAuthUrl = (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')

    if (!clientId || !clientSecretSet) {
        const body = {
            status: 'FAIL',
            problem: 'not_configured',
            message: 'GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are not set in this deployment.',
            fix: [
                'Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel → Settings → Environment Variables.',
                'Redeploy after saving (env changes do NOT apply to the running deployment until you redeploy).',
            ],
            checkedAt: new Date().toISOString(),
        }
        cached = { body, at: Date.now() }
        return NextResponse.json(body)
    }

    if (!nextAuthUrl) {
        const body = {
            status: 'FAIL',
            problem: 'missing_nextauth_url',
            clientId,
            message: 'NEXTAUTH_URL is not set — NextAuth may derive the redirect_uri from the request host, which can differ between domains.',
            fix: ['Set NEXTAUTH_URL=https://agrieasy.site in Vercel env vars and redeploy.'],
            checkedAt: new Date().toISOString(),
        }
        cached = { body, at: Date.now() }
        return NextResponse.json(body)
    }

    const redirectUri = `${nextAuthUrl}/api/auth/callback/google`

    // Build the exact same authorization request a real sign-in performs.
    const state = randomBytes(16).toString('hex')
    const codeChallenge = randomBytes(32).toString('base64url')
    const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
        `&scope=openid%20email%20profile&response_type=code` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&state=${state}&code_challenge=${codeChallenge}&code_challenge_method=S256`

    let status: 'PASS' | 'FAIL' | 'ERROR'
    let problem = ''
    let message = ''
    let fix: string[] = []

    try {
        const res = await fetch(authUrl, {
            redirect: 'manual',
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; AgriEasy-OAuthCheck/1.0)' },
            signal: AbortSignal.timeout(10_000),
        })
        const location = res.headers.get('location') || ''

        if (res.status === 200) {
            status = 'PASS'
            message = 'Google ACCEPTS this redirect_uri for this client_id. The OAuth client is configured correctly — if the browser still shows an error, clear cache or the consent screen may be in Testing mode (add yourself as a Test user).'
        } else if ((res.status === 302 || res.status === 303) && (location.includes('/signin/oauth/error') || location.includes('authError='))) {
            const cls = classifyGoogleError(location)
            status = 'FAIL'
            problem = cls.code
            message = cls.detail
            if (cls.code === 'redirect_uri_mismatch') {
                fix = [
                    `In Google Cloud Console → APIs & Services → Credentials, open the OAuth client whose Client ID is exactly: ${clientId}`,
                    `Check the PROJECT selector (top bar) — the client may live in a different project than the one you edited.`,
                    `Confirm "Application type" is "Web application" (Desktop/iOS/Android clients ignore the redirect URI list).`,
                    `Under "Authorized redirect URIs" click ADD URI and paste EXACTLY: ${redirectUri} (no trailing slash, https, correct domain).`,
                    `Click SAVE, wait ~5 minutes, then reload this page — it should flip to PASS.`,
                    `Alternative: create a NEW Web application client, add the URI there, then update GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in Vercel AND redeploy.`,
                ]
            } else {
                fix = [`Open Google Cloud Console → Credentials and verify the OAuth client ${clientId} exists and its secret is copied verbatim into GOOGLE_CLIENT_SECRET, then redeploy.`]
            }
        } else if ((res.status === 302 || res.status === 303) && location.includes('error=')) {
            const code = (() => {
                try { return new URL(location).searchParams.get('error') || 'oauth_error' } catch { return 'oauth_error' }
            })()
            status = 'FAIL'
            problem = code
            message = `Google returned OAuth error: ${code}.`
            fix = [`Search Google's OAuth docs for "${code}" — usually a consent-screen publishing / test-user issue.`]
        } else if (res.status === 302 || res.status === 303) {
            status = 'PASS'
            message = 'Google redirected to its sign-in flow (params accepted). The OAuth client is configured correctly.'
        } else {
            status = 'ERROR'
            problem = `http_${res.status}`
            message = `Unexpected HTTP ${res.status} from Google while probing the authorization endpoint.`
        }
    } catch {
        status = 'ERROR'
        problem = 'network'
        message = 'Could not reach accounts.google.com from the server. Try again in a minute.'
    }

    const body: Record<string, unknown> = {
        status,
        ...(problem ? { problem } : {}),
        clientId,
        redirectUri,
        nextAuthUrl,
        clientSecretSet: true,
        message,
        ...(fix.length ? { fix } : {}),
        checkedAt: new Date().toISOString(),
    }
    cached = { body, at: Date.now() }
    return NextResponse.json(body)
}
