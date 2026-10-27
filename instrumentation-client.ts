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
})

// Replay (rrweb) is the largest part of Sentry and records every DOM change,
// so it's fetched from Sentry's CDN once the page is idle instead of being in
// every page's first-load bundle.
if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_SENTRY_DSN) {
  const loadReplay = () => {
    Sentry.lazyLoadIntegration('replayIntegration')
      .then(replayIntegration => Sentry.addIntegration(replayIntegration({ maskAllText: true, blockAllMedia: true })))
      .catch(() => {})
  }
  if ('requestIdleCallback' in window) window.requestIdleCallback(loadReplay, { timeout: 5000 })
  else setTimeout(loadReplay, 3000)
}

// Page-to-page navigation timings in the app.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
