import type { MetadataRoute } from 'next'

/**
 * AgriEasy sitemap — served automatically by Next.js at /sitemap.xml
 * based on the canonical production domain.
 *
 * The list below covers all user-facing static routes. Dynamic routes
 * (e.g. /buyer/billing/[id], /agrisocial/post/[postId]) are intentionally
 * omitted because they require a database ID we can't enumerate at
 * build time. Search engines will discover them via internal links.
 */
const BASE_URL = 'https://agrieasy.site'

const STATIC_ROUTES = [
  '',                                       // home
  '/auth/login',
  '/auth/register',
  '/farmer/dashboard',
  '/farmer/search-buyers',
  '/farmer/my-bookings',
  '/farmer/book-vehicle',
  '/farmer/setup-location',
  '/buyer/dashboard',
  '/buyer/create-listing',
  '/buyer/bookings',
  '/buyer/my-vehicles',
  '/buyer/profile',
  '/buyer/payment',
  '/buyer/billing',
  '/transporter/dashboard',
  '/transporter/my-vehicles',
  '/transporter/add-vehicle',
  '/transporter/bookings',
  '/agrisocial',
  '/agrisocial/clips',
  '/agrisocial/create',
  '/agrisocial/explore',
  '/agrisocial/dm',
  '/agrisocial/notifications',
  '/agrisocial/saved',
  '/agrisocial/search',
  '/ledger',
  '/ledger/bill-calculator',
  '/agripay',
  '/privacy',
  '/terms',
  '/tracking',
  '/settings',
]

const LAST_MODIFIED = new Date()

export default function sitemap(): MetadataRoute.Sitemap {
  return STATIC_ROUTES.map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: LAST_MODIFIED,
    // Home + auth pages change often; role dashboards + ledger change
    // weekly; static content (privacy/terms) changes rarely.
    changeFrequency: path === '' || path.startsWith('/auth/') ? 'daily'
      : path.startsWith('/agrisocial') || path === '/ledger' ? 'hourly'
      : path === '/privacy' || path === '/terms' ? 'yearly'
      : 'weekly',
    // 1.0 = highest priority for home + main dashboards
    priority: path === '' ? 1.0
      : path.startsWith('/auth/') ? 0.9
      : path.endsWith('/dashboard') ? 0.9
      : path.startsWith('/agrisocial') || path.startsWith('/ledger') ? 0.8
      : path === '/privacy' || path === '/terms' ? 0.3
      : 0.7,
  }))
}
