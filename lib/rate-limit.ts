const store = new Map<string, number[]>()
let lastGC = Date.now()

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()

  // Periodic GC every 5 minutes — removes keys whose entire timestamp window has expired
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
