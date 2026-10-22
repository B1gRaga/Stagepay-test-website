import { expect, type Page } from '@playwright/test'

// Collects uncaught page errors and console errors while a test runs, so a
// test can assert the page loaded cleanly. Known development-only noise is
// ignored.
const NOISE = [
  /Download the React DevTools/,
  /\[HMR\]|\[Fast Refresh\]/,
  /Failed to load resource: the server responded with a status of 4\d\d/, // asserted separately where it matters
  /Encountered a script tag while rendering React component/, // dev-only warning from the theme script in the root layout
]

export function watchErrors(page: Page) {
  const errors: string[] = []
  page.on('pageerror', e => errors.push(`pageerror: ${e.message}`))
  page.on('console', m => {
    if (m.type() !== 'error') return
    const text = m.text()
    if (!NOISE.some(r => r.test(text))) errors.push(`console: ${text}`)
  })
  return {
    errors,
    expectClean: () => expect(errors, errors.join('\n')).toEqual([]),
  }
}

export const INVITE_PATH = `/join/${'a'.repeat(64)}`

export const PUBLIC_PAGES = [
  { path: '/', heading: /send the invoice/i },
  { path: '/auth/login', heading: /sign in to stagepay/i },
  { path: '/auth/signup', heading: /send your first invoice/i },
  { path: '/auth/forgot-password', heading: /reset your password/i },
  { path: INVITE_PATH, heading: /invited/i },
]
