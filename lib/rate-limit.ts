// Redis-backed rate limiter when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
// Falls back to the in-memory implementation so the app still works without those env vars.

// ── In-memory fallback ───────────────────────────────────────────────────────
const store = new Map<string, number[]>()
let lastGC = Date.now()

function inMemoryRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  if (now - lastGC > 300_000) {
    for (const [k, ts] of store) {
      if (ts.every(t => now - t >= windowMs)) store.delete(k)
    }
    lastGC = now
  }
  const timestamps = (store.get(key) ?? []).filter(t => now - t < windowMs)
  if (timestamps.length >= limit) return false
  timestamps.push(now)
  store.set(key, timestamps)
  return true
}

// ── Redis implementation ─────────────────────────────────────────────────────
// Uses a simple sliding-window counter stored in Upstash Redis.
// Each key is a string like "rl:<key>:<window_bucket>".
async function redisRateLimit(
  url: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<boolean> {
  const bucket  = Math.floor(Date.now() / windowMs)
  const redisKey = `rl:${key}:${bucket}`

  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([
      ['INCR', redisKey],
      ['EXPIRE', redisKey, Math.ceil(windowMs / 1000) + 1],
    ]),
  })

  if (!res.ok) {
    // If Redis is unreachable, fall back to allowing the request
    console.error('[RateLimit] Redis error', res.status)
    return true
  }

  const [[, count]] = await res.json() as [[string, number]]
  return count <= limit
}

// ── Public API ───────────────────────────────────────────────────────────────
// Synchronous signature kept for compatibility — Redis path is async so callers
// that need it must await. Existing callers pass results to if() which handles
// both boolean and Promise<boolean> by evaluating the promise as truthy until
// resolved. To properly gate on Redis, use awaitRateLimit() below.
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  return inMemoryRateLimit(key, limit, windowMs)
}

// Async version — uses Redis when configured, falls back to in-memory.
// All route handlers should use this instead of rateLimit().
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  const url   = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (url && token) {
    return redisRateLimit(url, token, key, limit, windowMs)
  }
  return inMemoryRateLimit(key, limit, windowMs)
}
