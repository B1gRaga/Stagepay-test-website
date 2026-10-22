import * as Sentry from '@sentry/nextjs'

// Browser-side Sentry. Next.js 16 (Turbopack) loads this file; the old
// sentry.client.config.ts was never picked up, so browser errors weren't sent.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  tracesSampleRate: 0.1,
  debug: false,
  // Replays only around errors and for a small share of sessions; every bit
  // of text is masked and images blocked, so no client details are recorded.
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.05,
  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],
})

// Page-to-page navigation timings in the app.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
