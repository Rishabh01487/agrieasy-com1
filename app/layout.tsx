import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import AuthProvider from "./providers";
import PWABootstrap from "./components/PWABootstrap";
import BottomTabBar from "./components/BottomTabBar";
import CookieConsent from "./components/CookieConsent";
import { ToastProvider } from "./components/Toast";
import { LanguageProvider } from "@/lib/i18n/LanguageContext";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgriEasy.com — India's Agricultural Marketplace",
  description: "Connecting farmers directly with buyers for seamless agricultural trade. End-to-end connectivity for the agricultural supply chain.",
  manifest: "/manifest.json",
  keywords: ["agriculture", "farmers", "buyers", "agri trade", "India farming", "crop selling"],
  openGraph: {
    title: "AgriEasy.com",
    description: "India's #1 agricultural trading platform",
    type: "website",
  },
  other: {
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
    "apple-mobile-web-app-title": "AgriEasy",
    "theme-color": "#AC3B61",
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#AC3B61",
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
        <link rel="icon" href="/icons/icon-192.png" />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://nominatim.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://*.tile.openstreetmap.org" />
      </head>
      <body className={`${poppins.variable} antialiased`} style={{ fontFamily: "var(--font-poppins), 'Poppins', system-ui, sans-serif" }}>
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
