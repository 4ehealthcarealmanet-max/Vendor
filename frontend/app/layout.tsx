import type { Metadata } from "next"
import { Manrope, Space_Grotesk } from "next/font/google"
import "./globals.css"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
})

export const metadata: Metadata = {
  title: "MedVendor | Premium Healthcare Procurement Marketplace",
  description: "Premium healthcare procurement marketplace for buyers, suppliers, and live tender workflows.",
}

import NotificationToast from "@/components/common/NotificationToast"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={`${manrope.variable} ${spaceGrotesk.variable} antialiased`}>
        {children}
        <NotificationToast />
      </body>
    </html>
  )
}
