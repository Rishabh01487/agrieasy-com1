/**
 * Shared authenticated fetch helper.
 * Reads the JWT from localStorage and attaches it as a Bearer token header.
 * Also sends credentials (cookies) so httpOnly cookie auth also works.
 */
export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })
}

/**
 * Helper to get the current user info from localStorage.
 */
export function getUserInfo(): { userId: string | null; userEmail: string | null; userRole: string | null } {
  if (typeof window === 'undefined') return { userId: null, userEmail: null, userRole: null }
  return {
    userId: localStorage.getItem('userId'),
    userEmail: localStorage.getItem('userEmail'),
    userRole: localStorage.getItem('userRole'),
  }
}

/**
 * Proper logout: clear localStorage and call server to clear cookie.
 */
export async function logout(): Promise<void> {
  if (typeof window === 'undefined') return
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
  } catch { /* ignore */ }
  localStorage.removeItem('userId')
  localStorage.removeItem('userEmail')
  localStorage.removeItem('userRole')
  localStorage.removeItem('token')
  window.location.href = '/'
}

/**
 * Escape special regex characters in a string (prevents ReDoS).
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}