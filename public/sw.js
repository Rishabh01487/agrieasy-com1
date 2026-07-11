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

// Install — pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).catch(() => {})
  )
  self.skipWaiting()
})

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// Fetch — network-first for navigations, cache-first for static assets,
// never cache API calls (they need fresh data).
self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  // Skip non-GET requests
  if (req.method !== 'GET') return

  // Skip API calls — always hit the network
  if (url.pathname.startsWith('/api/')) return

  // Skip cross-origin requests (Cloudinary, Nominatim, OpenStreetMap tiles, etc.)
  if (url.origin !== self.location.origin) return

  // Network-first for HTML navigations — so users get fresh content when online
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

  // Cache-first for static assets (JS, CSS, icons, images)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached
      return fetch(req).then((res) => {
        // Only cache successful, same-origin responses
        if (!res || res.status !== 200 || res.type !== 'basic') return res
        const copy = res.clone()
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {})
        return res
      })
    })
  )
})
