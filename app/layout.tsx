import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { SpeedInsights } from "@vercel/speed-insights/next"
import localFont from 'next/font/local'
import Script from 'next/script'
import "./globals.css"

// Manrope (Latin, variable 400–800) is kept in the repo so builds never
// depend on downloading it from Google Fonts.
const manrope = localFont({
  src: './fonts/manrope-latin.woff2',
  weight: '400 800',
  display: 'swap',
  variable: '--font-manrope',
})

export const metadata: Metadata = {
  title: "StagePay — invoices on WhatsApp",
  description: "Fill in a few simple details. StagePay organises a professional invoice, sends it on WhatsApp and follows up until you're paid.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning data-theme="light" data-scroll-behavior="smooth"
      className={manrope.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('stagepay-theme');if(t==='dark')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme','light')}catch(e){}})()` }} />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover"/>
        <meta name="mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-capable" content="yes"/>
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"/>
        <meta name="apple-mobile-web-app-title" content="StagePay"/>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg"/>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png"/>
        <link rel="manifest" href="/manifest.json"/>
        <meta name="theme-color" content="#1F2A44"/>
      </head>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
        {/* lazyOnload: gtag is ~170KB, so it waits until the page has loaded. */}
        <Script strategy="lazyOnload" src="https://www.googletagmanager.com/gtag/js?id=G-BX4B6LZRYY" />
        <Script id="ga4-init" strategy="lazyOnload" dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-BX4B6LZRYY');
        `}} />
      </body>
    </html>
  )
}
