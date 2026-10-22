import { describe, it, expect } from 'vitest'
import { safeRedirect, redirectQuery } from '@/lib/safe-redirect'

const TOKEN = 'a'.repeat(64)

describe('safeRedirect', () => {
  it('allows a team invite link', () => {
    expect(safeRedirect(`/join/${TOKEN}`)).toBe(`/join/${TOKEN}`)
  })

  it('refuses anything that could leave the site or reach another page', () => {
    for (const bad of [
      'https://evil.example/join/abcdefgh',
      '//evil.example/join/abcdefgh',
      '/dashboard',
      '/join/',
      '/join/short',
      `/join/${TOKEN}/../../settings`,
      `/join/${TOKEN}?next=https://evil.example`,
      `/join/${TOKEN}#x`,
      'javascript:alert(1)',
      '',
      null,
      undefined,
    ]) expect(safeRedirect(bad)).toBeNull()
  })
})

describe('redirectQuery', () => {
  it('builds the query string for a valid invite link only', () => {
    expect(redirectQuery(`/join/${TOKEN}`)).toBe(`?redirect=${encodeURIComponent(`/join/${TOKEN}`)}`)
    expect(redirectQuery('/settings')).toBe('')
  })
})
