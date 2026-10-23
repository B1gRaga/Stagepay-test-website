// Asks our /api/auth/check-password route whether a password appears in a
// known data breach (Have I Been Pwned, k-anonymity — the password itself
// never leaves our server). Supabase's own leaked-password check needs a
// paid plan, so every place a password is set calls this instead.
// If the check can't run, it answers false rather than blocking the person.
export async function isPasswordLeaked(password: string): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/check-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    if (!res.ok) return false
    const { pwned } = await res.json()
    return pwned === true
  } catch {
    return false
  }
}

export const LEAKED_PASSWORD_MESSAGE =
  'This password has appeared in a known data breach. Please choose a different password.'
