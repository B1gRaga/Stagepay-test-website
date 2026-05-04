import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "StagePay — Turn your work into an invoice in 30 seconds",
  description: "AI-powered invoicing for freelancers and small businesses in Botswana. Describe your work, AI builds the invoice in 30 seconds.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:ital,wght@0,300;0,400;0,500;0,600;1,400&family=Instrument+Serif:ital@1&display=swap" rel="stylesheet"/>
      </head>
      <body>{children}</body>
    </html>
  )
}
