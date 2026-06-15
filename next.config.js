/** @type {import('next').NextConfig} */
const { withSentryConfig } = require('@sentry/nextjs')

const securityHeaders = [
  { key: 'X-Frame-Options',           value: 'DENY' },
  { key: 'X-Content-Type-Options',    value: 'nosniff' },
  { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Permissions-Policy',        value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https://www.googletagmanager.com https://va.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.anthropic.com https://www.google-analytics.com https://analytics.google.com https://www.googletagmanager.com https://o*.ingest.sentry.io https://*.sentry.io https://vitals.vercel-insights.com https://va.vercel-scripts.com",
      "worker-src blob:",
      "frame-src 'none'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }]
  },
  async redirects() {
    return [
      { source: '/favicon.ico', destination: '/favicon.svg', permanent: true },
    ]
  },
}

module.exports = withSentryConfig(nextConfig, {
  org:     process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent:  true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
  hideSourceMaps: true,
  disableLogger:  true,
  automaticVercelMonitors: false,
})
