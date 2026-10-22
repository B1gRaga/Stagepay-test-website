import { test, expect } from '@playwright/test'
import { watchErrors } from './helpers'

// The sign-in and sign-up screens, used for real but without creating or
// changing anything.

test('a wrong password shows an error and stays on sign in', async ({ page }) => {
  const w = watchErrors(page)
  await page.goto('/auth/login')
  await page.getByLabel('Email address').fill('nobody-e2e@example.invalid')
  await page.getByLabel('Password', { exact: true }).fill('not-the-right-password-123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.locator('.ac-error')).toBeVisible()
  await expect(page).toHaveURL(/\/auth\/login/)
  w.expectClean()
})

test('sign-up step one leads to the business type step', async ({ page }) => {
  await page.goto('/auth/signup')
  await page.getByLabel('Full name').fill('E2E Tester')
  await page.getByLabel('Email address').fill('e2e-tester@example.invalid')
  await page.getByLabel('Password', { exact: true }).fill('a-long-random-test-password-48291')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.getByText('What kind of business is it?')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Tuition Centre' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create free account' })).toBeDisabled()
})

test('sign-up refuses a short password before going on', async ({ page }) => {
  await page.goto('/auth/signup')
  await page.getByLabel('Full name').fill('E2E Tester')
  await page.getByLabel('Email address').fill('e2e-tester@example.invalid')
  await page.getByLabel('Password', { exact: true }).fill('short')
  await page.getByRole('button', { name: 'Continue' }).click()
  await expect(page.locator('.ac-error')).toContainText('at least 8 characters')
})

test('sign-in forms post, so credentials never go in the address bar', async ({ page }) => {
  for (const path of ['/auth/login', '/auth/signup', '/auth/forgot-password']) {
    await page.goto(path)
    await expect(page.locator('form').first()).toHaveAttribute('method', 'post')
  }
})
