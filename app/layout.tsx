import type React from "react"
import type { Metadata, Viewport } from "next"
import { Figtree, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { PwaRegister } from "@/components/pwa-register"
import "./globals.css"

const figtree = Figtree({
  subsets: ["latin"],
  variable: "--font-figtree",
  weight: ["400", "500", "600", "700"],
})

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  weight: ["400", "500", "600"],
})

export const metadata: Metadata = {
  title: "Auralink",
  description: "A focused AI workspace for thinking, writing, research, and creation.",
  applicationName: "Auralink",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Auralink",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0f1014" },
  ],
  colorScheme: "dark light",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${figtree.variable} ${geistMono.variable} font-sans antialiased overflow-hidden`}
      >
        {children}
        <PwaRegister />
        <Analytics />
      </body>
    </html>
  )
}
