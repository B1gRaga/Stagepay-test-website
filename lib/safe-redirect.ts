// Where to go after signing in, when a page asked for it (?redirect=...).
// Only a team invite link is allowed, so the parameter can't send anyone to
// another site or an arbitrary page.
export function safeRedirect(value: string | null | undefined): string | null {
  return value && /^\/join\/[A-Za-z0-9_-]{8,128}$/.test(value) ? value : null
}

// The ?redirect= query string to carry along, or ''.
export function redirectQuery(value: string | null | undefined): string {
  const r = safeRedirect(value)
  return r ? `?redirect=${encodeURIComponent(r)}` : ''
}
