const inflightRequests = new Map<string, Promise<Response>>()

function getRequestKey(url: string, options: RequestInit = {}): string {
  const method = (options.method || 'GET').toUpperCase()
  if (method === 'GET') return `GET:${url}`
  return '' // Only deduplicate GET requests
}

// ── Cookie helpers ────────────────────────────────────────────────
// The login endpoint sets the JWT as an httpOnly cookie alongside the
// localStorage token. httpOnly cookies can't be read by JS, so we use
// them only as a fallback signal: if localStorage is empty (e.g. user
// came back to the site and Safari ITP wiped it) but the cookie still
// exists, the server-side authenticateRequest() will still accept the
// request. This makes sessions survive localStorage wipes.
//
// We also expose a non-httpOnly "session" marker cookie so the client
// can detect "user has a session" without needing to read the actual
// JWT (which is httpOnly).

/** Returns true if a session marker cookie is present. */
function hasSessionCookie(): boolean {
  if (typeof document === 'undefined') return false
  return document.cookie.split('; ').some(c => c.startsWith('agrieasy_session='))
}

/** Read the CSRF token from the csrf_token cookie (set by middleware). */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null
  const c = document.cookie.split('; ').find(x => x.startsWith('csrf_token='))
  return c ? c.split('=')[1] : null
}

// ── Token refresh state ───────────────────────────────────────────
// Track in-flight refresh so concurrent 401s don't trigger multiple
// refresh attempts.
let refreshPromise: Promise<string | null> | null = null

/**
 * Try to refresh the JWT by calling /api/auth/session-token.
 * This only works for Google-login users (who have a NextAuth session
 * cookie). For phone+password users, there's no refresh — they must
 * re-login. Returns the new token, or null if refresh failed.
 *
 * IMPORTANT: This function does NOT use authFetch (would infinite-loop
 * on 401). It uses plain fetch with credentials: 'include'.
 */
async function tryRefreshToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise
  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/auth/session-token', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (!res.ok) return null
      const data = await res.json()
      if (data?.registered === true && data?.token) {
        // Persist the refreshed token to localStorage
        if (typeof window !== 'undefined') {
          localStorage.setItem('token', data.token)
          localStorage.setItem('userId', data.userId)
          localStorage.setItem('userEmail', data.email || '')
          localStorage.setItem('userRole', data.role || 'buyer')
        }
        return data.token as string
      }
      return null
    } catch {
      return null
    } finally {
      // Allow future refresh attempts after a short cooldown
      setTimeout(() => { refreshPromise = null }, 30_000)
    }
  })()
  return refreshPromise
}

// ── Redirect to login with ?expired=1 ─────────────────────────────
let expiredRedirectScheduled = false
function redirectToLoginExpired() {
  if (expiredRedirectScheduled) return
  if (typeof window === 'undefined') return
  expiredRedirectScheduled = true
  // Clear stale localStorage so the login page doesn't try to use it
  localStorage.removeItem('token')
  localStorage.removeItem('userId')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userRole')
  // Redirect after a short delay so any in-flight UI can settle
  setTimeout(() => {
    const current = window.location.pathname
    // Don't redirect if already on an auth page
    if (current.startsWith('/auth/')) return
    const loginUrl = `/auth/login?expired=1&next=${encodeURIComponent(current)}`
    window.location.href = loginUrl
  }, 100)
}

// ── Main authFetch ────────────────────────────────────────────────
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  // CSRF protection: for state-changing requests, attach the X-CSRF-Token
  // header from the csrf_token cookie set by the middleware.
  const method = (options.method || 'GET').toUpperCase()
  if (method !== 'GET' && method !== 'HEAD') {
    const csrfToken = getCsrfToken()
    if (csrfToken) {
      headers.set('X-CSRF-Token', csrfToken)
    }
  }

  const key = getRequestKey(url, options)
  // Don't deduplicate if a signal is provided (abort controller needs unique requests)
  if (key && !options.signal && inflightRequests.has(key)) {
    return inflightRequests.get(key)!
  }

  const promise = fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  }).then(async (res) => {
    // ── 401 auto-refresh ──────────────────────────────────────────
    // If we get a 401, try refreshing the token ONCE. If refresh
    // succeeds, retry the original request with the new token. If it
    // fails, redirect to login with ?expired=1.
    //
    // Skip this for the refresh endpoint itself (would infinite-loop)
    // and for auth endpoints (login/register/send-otp/verify-otp).
    if (res.status === 401 && !url.startsWith('/api/auth/')) {
      const newToken = await tryRefreshToken()
      if (newToken) {
        // Retry the original request with the new token
        const retryHeaders = new Headers(options.headers || {})
        retryHeaders.set('Authorization', `Bearer ${newToken}`)
        const csrf = getCsrfToken()
        if (csrf && method !== 'GET' && method !== 'HEAD') {
          retryHeaders.set('X-CSRF-Token', csrf)
        }
        return fetch(url, {
          ...options,
          headers: retryHeaders,
          credentials: 'include',
        })
      }
      // Refresh failed → redirect to login
      redirectToLoginExpired()
    }
    return res
  })

  if (key && !options.signal) {
    inflightRequests.set(key, promise)
    promise.finally(() => inflightRequests.delete(key))
  }

  return promise
}

export function getUserInfo(): { userId: string | null; userEmail: string | null; userRole: string | null } {
  if (typeof window === 'undefined') return { userId: null, userEmail: null, userRole: null }
  return {
    userId: localStorage.getItem('userId'),
    userEmail: localStorage.getItem('userEmail'),
    userRole: localStorage.getItem('userRole'),
  }
}

/** Returns true if the user has any sign of a session (localStorage OR cookie). */
export function hasSession(): boolean {
  if (typeof window === 'undefined') return false
  if (localStorage.getItem('token')) return true
  return hasSessionCookie()
}

export async function logout(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    // Send the CSRF header so the server's verifyCsrf() check passes.
    // The csrf_token cookie is httpOnly:false (set by middleware) so we can
    // read it from document.cookie and echo it as the X-CSRF-Token header.
    const csrfCookie = document.cookie
      .split('; ')
      .find(c => c.startsWith('csrf_token='))
    const csrfToken = csrfCookie ? csrfCookie.split('=')[1] : ''
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : {},
    })
  } catch { /* ignore — client-side cleanup runs regardless */ }
  localStorage.removeItem('userId')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userRole')
  localStorage.removeItem('token')
  // Also clear the non-httpOnly session-marker cookie (best-effort —
  // the httpOnly `token` cookie can only be cleared by the server).
  document.cookie = 'agrieasy_session=; Max-Age=0; path=/; SameSite=Lax'
  window.location.href = '/'
}

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
