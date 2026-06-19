// Retries transient failures (network errors, 5xx) with exponential backoff.
// Does not retry errors the caller marks as non-transient (e.g. validation
// failures like an invalid phone number) — those should fail immediately.

export class NonRetryableError extends Error {}

export async function withRetry<T>(
  fn: () => Promise<T>,
  { attempts = 3, baseDelayMs = 500 }: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (err instanceof NonRetryableError || i === attempts - 1) throw err
      await new Promise(resolve => setTimeout(resolve, baseDelayMs * 2 ** i))
    }
  }
  throw lastErr
}
