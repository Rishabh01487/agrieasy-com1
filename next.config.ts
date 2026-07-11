import type { NextConfig } from "next";

import dns from "dns";

dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);

const nextConfig: NextConfig = {
  devIndicators: false,
  // ─── Performance & Scalability ──────────────────────────────
  compress: true,                   // Gzip compression for all responses
  poweredByHeader: false,           // Don't expose Next.js version in headers

  // ─── Image Optimization ─────────────────────────────────────
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,         // Cache images for 24 hours
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' }, // Google profile pics
    ],
  },

  // ─── HTTP Headers (Security + Performance) ───────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
      {
        source: '/icons/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      {
        source: '/manifest.json',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=86400' }],
      },
      {
        source: '/.well-known/assetlinks.json',
        headers: [{ key: 'Content-Type', value: 'application/json' }],
      },
    ];
  },

  // ─── Redirects ───────────────────────────────────────────────
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/auth/login',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;

// Force fresh deployment - 2026-07-08T01:54:55Z
// Trigger fresh deploy 2026-07-11T05:30:13Z
