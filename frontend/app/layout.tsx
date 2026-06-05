import type { CSSProperties } from "react"
import type { Metadata } from "next"
import "./globals.css"

const fontVariables: CSSProperties = {
  ["--font-body" as string]: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  ["--font-display" as string]: '"Aptos", "Trebuchet MS", "Segoe UI", sans-serif',
}

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
      <body className="antialiased" style={fontVariables}>
        {children}
        <NotificationToast />
      </body>
    </html>
  )
}
