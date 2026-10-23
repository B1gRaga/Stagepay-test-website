import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

// Public routes (waitlist, password check) call this first, so a Redis that
// can't be reached must not turn every request into a 500.
describe('checkRateLimit', () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

  it('falls back to the in-memory limit when Redis cannot be reached', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://gone.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token')
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('fetch failed')))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await checkRateLimit('test:unreachable', 2, 60_000)).toBe(true)
    expect(await checkRateLimit('test:unreachable', 2, 60_000)).toBe(true)
    expect(await checkRateLimit('test:unreachable', 2, 60_000)).toBe(false)
  })

  it('uses the Redis count when Redis answers', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://ok.upstash.io')
    vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'token')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([{ result: 6 }, { result: 1 }]))))

    expect(await checkRateLimit('test:redis', 5, 60_000)).toBe(false)
  })
})
