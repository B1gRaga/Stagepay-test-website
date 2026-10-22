import { test, expect } from '@playwright/test'
import { PUBLIC_PAGES, watchErrors } from './helpers'

// Every public page loads, shows its heading, and throws no errors.
for (const { path, heading } of PUBLIC_PAGES) {
  test(`${path} loads cleanly`, async ({ page }) => {
    const w = watchErrors(page)
    const res = await page.goto(path)
    expect(res?.status(), `status of ${path}`).toBeLessThan(400)
    await expect(page.getByRole('heading', { level: 1 })).toContainText(heading)
    await page.waitForLoadState('networkidle')
    w.expectClean()
  })
}

test('an unknown page is a 404, not a crash', async ({ page }) => {
  const w = watchErrors(page)
  const res = await page.goto('/this-page-does-not-exist')
  expect(res?.status()).toBe(404)
  w.expectClean()
})
