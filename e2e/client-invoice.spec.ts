import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

// The page a client opens from WhatsApp. Needs E2E_INVOICE_TOKEN (the code at
// the end of a real invoice link); skipped without it.
const token = process.env.E2E_INVOICE_TOKEN

test.describe('client invoice page', () => {
  test.skip(!token, 'Set E2E_INVOICE_TOKEN to run')

  test('shows the amount and the invoice, without errors', async ({ page }) => {
    const w = watchErrors(page)
    await page.goto(`/invoice/${token}`)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expect(page.locator('.pi-amount')).toContainText(/\d/)
    await expect(page.getByRole('link', { name: 'Download PDF' })).toBeVisible()
    w.expectClean()
  })

  test('the PDF downloads', async ({ request }) => {
    const res = await request.get(`/invoice/${token}/pdf`)
    expect(res.status()).toBe(200)
    expect(res.headers()['content-type']).toContain('application/pdf')
    expect((await res.body()).subarray(0, 5).toString()).toBe('%PDF-')
  })
})

test('an invoice link that does not exist is a 404', async ({ request }) => {
  const res = await request.get('/invoice/0000000000000000000000000000dead')
  expect(res.status()).toBe(404)
})
