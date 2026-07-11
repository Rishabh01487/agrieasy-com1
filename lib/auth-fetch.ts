const inflightRequests = new Map<string, Promise<Response>>()

function getRequestKey(url: string, options: RequestInit = {}): string {
  const method = (options.method || 'GET').toUpperCase()
  if (method === 'GET') return `GET:${url}`
  return '' // Only deduplicate GET requests
}

export function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers = new Headers(options.headers || {})

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const key = getRequestKey(url, options)
  if (key && inflightRequests.has(key)) {
    return inflightRequests.get(key)!
  }

  const promise = fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  })

  if (key) {
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

export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}