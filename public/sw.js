/* AgriEasy Service Worker
 *
 * Caches the app shell so the PWA loads instantly even on flaky 2G/3G
 * connections (critical for farmers in rural areas). Network-first for
 * navigations (so users always get fresh HTML when online), cache-first
 * for static assets.
 */

const CACHE_VERSION = 'agrieasy-v1'
const APP_SHELL = [
  '/',
  '/auth/login',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  if (req.method !== 'GET') return

  if (url.pathname.startsWith('/api/')) return

  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {})
          return res
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match('/')))
    )
    return
  }

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req).then((res) => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res
        const copy = res.clone()
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {})
        return res
      })
    })
  )
})
