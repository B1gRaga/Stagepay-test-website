import * as Sentry from '@sentry/nextjs'

type LogData = Record<string, unknown>

export function log(event: string, data: LogData = {}) {
  console.log(JSON.stringify({ event, ...data, ts: Date.now() }))
}

export function logError(event: string, error: unknown, data: LogData = {}) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(JSON.stringify({ event, error: message, ...data, ts: Date.now() }))
  Sentry.captureException(error, { extra: { event, ...data } })
}

export function logWarn(event: string, data: LogData = {}) {
  console.warn(JSON.stringify({ event, ...data, ts: Date.now() }))
}

// Pings a Cronitor monitor so you get alerted if the cron stops running.
// Set CRONITOR_KEY in env to enable. Silently skips if not configured.
export async function cronitorPing(monitorKey: string, state: 'run' | 'complete' | 'fail' = 'complete') {
  const key = process.env.CRONITOR_KEY
  if (!key) return
  try {
    await fetch(`https://cronitor.link/p/${key}/${monitorKey}?state=${state}`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000),
    })
  } catch {
    // Never let a monitoring ping take down a cron run
  }
}
