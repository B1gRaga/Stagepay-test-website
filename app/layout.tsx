import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "StagePay — Invoice like a professional.",
  description:
    "AI-powered invoicing for African professionals. Describe your work, AI builds the invoice.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
