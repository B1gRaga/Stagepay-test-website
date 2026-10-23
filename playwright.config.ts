import { defineConfig, devices } from '@playwright/test'

// End-to-end tests (e2e/). Locally they use the dev server already running on
// :3000, or start one; in CI they build and start the production server.
// Optional, from environment variables:
//   E2E_BASE_URL        test another address instead (e.g. a Vercel preview)
//   E2E_INVOICE_TOKEN   a real client invoice link token, for the /invoice tests
//   E2E_EMAIL, E2E_PASSWORD   a test account WITHOUT two-step sign-in, for the
//                             signed-in screen tests
const PORT = 3000
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : {
    command: process.env.CI ? 'npm run build && npm run start' : 'npm run dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    // Sign-up is closed before launch (lib/launch.ts); the tests still cover it.
    env: { NEXT_PUBLIC_SIGNUPS_OPEN: 'true' },
  },
})
