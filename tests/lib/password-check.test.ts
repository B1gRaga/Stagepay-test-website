import { describe, it, expect, vi, afterEach } from 'vitest'
import { isPasswordLeaked } from '@/lib/password-check'

afterEach(() => vi.unstubAllGlobals())

function stubFetch(impl: () => Promise<Response>) {
  const fetchMock = vi.fn(impl)
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

describe('isPasswordLeaked', () => {
  it('is true when the check says the password was in a breach', async () => {
    const f = stubFetch(async () => Response.json({ pwned: true }))
    expect(await isPasswordLeaked('password123')).toBe(true)
    expect(f).toHaveBeenCalledWith('/api/auth/check-password', expect.objectContaining({ method: 'POST' }))
  })

  it('is false for a password that was not found', async () => {
    stubFetch(async () => Response.json({ pwned: false }))
    expect(await isPasswordLeaked('a-long-unusual-passphrase')).toBe(false)
  })

  it('does not block the person when the check is rate limited or down', async () => {
    stubFetch(async () => Response.json({ error: 'Too many requests' }, { status: 429 }))
    expect(await isPasswordLeaked('anything')).toBe(false)
    stubFetch(async () => { throw new TypeError('fetch failed') })
    expect(await isPasswordLeaked('anything')).toBe(false)
  })
})
