import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "./providers";
import PWABootstrap from "./components/PWABootstrap";
import BottomTabBar from "./components/BottomTabBar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
    "theme-color": "#2563eb",
  }
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#2563eb",
  viewportFit: "cover",  // Safe-area aware (notches, etc.)
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
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          {children}
          <PWABootstrap />
          <BottomTabBar />
        </AuthProvider>
      </body>
    </html>
  );
}
