import { test, expect } from '@playwright/test'
import { INVITE_PATH } from './helpers'

// Signed out, the portal sends you to sign in and the private API refuses you.
const PORTAL = ['/dashboard', '/invoices', '/clients', '/reminders', '/new-invoice', '/settings', '/tutorial', '/onboarding']

for (const path of PORTAL) {
  test(`${path} needs sign-in`, async ({ page }) => {
    await page.goto(path)
    await expect(page).toHaveURL(/\/auth\/login/)
  })
}

const PRIVATE_API: [string, string][] = [
  ['GET', '/api/clients'],
  ['GET', '/api/invoices'],
  ['GET', '/api/profile'],
  ['GET', '/api/reminders'],
  ['GET', '/api/invoices/sample-pdf'],
  ['POST', '/api/email/send'],
  ['POST', '/api/reminders/send-now'],
  ['POST', '/api/team/invite'],
  ['DELETE', '/api/clients/00000000-0000-4000-8000-000000000000'],
  ['GET', '/api/cron/reminders'],
]

test('private API routes refuse signed-out requests', async ({ request }) => {
  for (const [method, url] of PRIVATE_API) {
    const res = await request.fetch(url, { method, data: method === 'GET' ? undefined : {} })
    expect(res.status(), `${method} ${url}`).toBe(401)
  }
})

test('the leaked-password check is open to sign-up (signed out)', async ({ request }) => {
  const res = await request.post('/api/auth/check-password', { data: { password: 'a-long-random-test-password-48291' } })
  expect(res.status()).toBe(200)
  expect(typeof (await res.json()).pwned).toBe('boolean')
})

test('an invite link survives switching from sign in to sign up', async ({ page }) => {
  const invite = encodeURIComponent(INVITE_PATH)
  await page.goto(`/auth/login?redirect=${invite}`)
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveURL(new RegExp(`/auth/signup\\?redirect=${invite.replace(/%/g, '%')}`))
})

test('a redirect to anywhere but an invite is ignored', async ({ page }) => {
  await page.goto('/auth/login?redirect=https%3A%2F%2Fevil.example')
  await page.getByRole('link', { name: 'Create an account' }).click()
  await expect(page).toHaveURL(/\/auth\/signup$/)
})
