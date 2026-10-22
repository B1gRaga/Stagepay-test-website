import { test, expect, type Page } from '@playwright/test'
import { watchErrors } from './helpers'

// Every portal screen, signed in. Needs E2E_EMAIL and E2E_PASSWORD for a test
// account without two-step sign-in; skipped without them. Read-only: nothing
// is created, sent or changed.
const email = process.env.E2E_EMAIL
const password = process.env.E2E_PASSWORD

async function signIn(page: Page) {
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill(email!)
  await page.getByLabel('Password', { exact: true }).fill(password!)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/)
}

const SCREENS = [
  { path: '/dashboard' },
  { path: '/invoices', heading: 'Invoices' },
  { path: '/clients', heading: 'Clients' },
  { path: '/reminders', heading: 'Reminders' },
  { path: '/new-invoice' },
  { path: '/settings' },
  { path: '/tutorial', heading: 'Getting started' },
]

test.describe('signed in', () => {
  test.skip(!email || !password, 'Set E2E_EMAIL and E2E_PASSWORD to run')
  test.describe.configure({ mode: 'serial' })

  for (const { path, heading } of SCREENS) {
    test(`${path} loads without errors`, async ({ page }) => {
      await signIn(page)
      const w = watchErrors(page)
      const res = await page.goto(path)
      expect(res?.status()).toBeLessThan(400)
      if (heading) await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
      await page.waitForLoadState('networkidle')
      w.expectClean()
    })
  }

  test('the Branding preview draws the sample PDF', async ({ page }) => {
    await signIn(page)
    await page.goto('/settings?panel=brand')
    await expect(page.locator('.brand-pdf-box canvas')).toBeVisible({ timeout: 20_000 })
  })
})
