/* AgriEasy Service Worker
 *
 * Caches the app shell so the PWA loads instantly even on flaky 2G/3G
 * connections (critical for farmers in rural areas). Uses:
 *   - Network-first for navigations (always get fresh HTML when online)
 *   - Stale-while-revalidate for static assets (serve cached instantly,
 *     but always fetch the new version in background so the NEXT visit
 *     gets the updated code — fixes the "stuck on old version" issue)
 */

const CACHE_VERSION = 'agrieasy-v8'
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

// Allow the page to force the SW to activate immediately (no waiting)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  if (req.method !== 'GET') return

  if (url.pathname.startsWith('/api/')) return

  if (url.origin !== self.location.origin) return

  // Network-first for HTML navigations — always get fresh HTML when online
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

  // Stale-while-revalidate for static assets (JS, CSS, images):
  // 1. Serve from cache IMMEDIATELY (fast load)
  // 2. Fetch the new version IN PARALLEL (background)
  // 3. Update the cache with the new version
  // → Next time the user visits, they get the fresh code
  // This is critical for shipping bug fixes — without it, users would be
  // stuck on old JS chunks for days after a deploy.
  event.respondWith(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.match(req).then((cachedResponse) => {
        const fetchPromise = fetch(req).then((networkResponse) => {
          // Only cache valid responses (skip error responses, opaque, etc.)
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            cache.put(req, networkResponse.clone()).catch(() => {})
          }
          return networkResponse
        }).catch(() => cachedResponse)  // network failed — fall back to cache (or undefined)

        // Return cached immediately if available, otherwise wait for network
        return cachedResponse || fetchPromise
      })
    })
  )
})

