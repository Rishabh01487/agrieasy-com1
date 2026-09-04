import type { Metadata, Viewport } from "next";
import { Poppins, Dancing_Script } from "next/font/google";
import "./globals.css";
import AuthProvider from "./providers";
import PWABootstrap from "./components/PWABootstrap";
import BottomTabBar from "./components/BottomTabBar";
import CookieConsent from "./components/CookieConsent";
import { ToastProvider } from "./components/Toast";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

// Only load the font weights actually used in the app to keep the
// initial CSS + woff2 payload small (improves Lighthouse LCP / TBT).
// Audit done 2026-09-05:
//   - Poppins weights used: 400, 500, 600, 700, 800 (5 weights)
//   - Poppins weights NOT used: 300, 900 (dropped — saves ~2 woff2 files)
//   - Dancing Script weights used: 400, 700 (2 weights — only on home page "Easy" hero word)
//   - Dancing Script weights NOT used: 500, 600 (dropped)
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgriEasy.com — India's Agricultural Marketplace",
  description: "Connecting farmers directly with buyers for seamless agricultural trade. End-to-end connectivity for the agricultural supply chain.",
  manifest: "/manifest.json",
  keywords: ["agriculture", "farmers", "buyers", "agri trade", "India farming", "crop selling"],
  // Canonical URL — tells search engines the primary domain
  alternates: {
    canonical: "https://agrieasy.site",
  },
  openGraph: {
    title: "AgriEasy.com",
    description: "India's #1 agricultural trading platform",
    type: "website",
    url: "https://agrieasy.site",
    siteName: "AgriEasy.com",
  },
  twitter: {
    card: "summary_large_image",
    title: "AgriEasy.com — India's Agricultural Marketplace",
    description: "Connecting farmers directly with buyers for seamless agricultural trade.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "AgriEasy",
    // Use the navy theme color — consistent with manifest.json
    "theme-color": "#31372B",
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#31372B",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icons/icon-512.png" />
        <link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://*.tile.openstreetmap.org" />
      </head>
      <body className={`${poppins.variable} ${dancingScript.variable} antialiased`} style={{ fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif" }}>
        <AuthProvider>
          <LanguageProvider>
            <ToastProvider>
              {children}
              <PWABootstrap />
              <BottomTabBar />
              <CookieConsent />
            </ToastProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
