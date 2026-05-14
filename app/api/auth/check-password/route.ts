import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'

// k-anonymity: only the first 5 hex chars of the SHA-1 hash are sent to
// HaveIBeenPwned. The real password never leaves this server.
export async function POST(req: NextRequest) {
  let body: { password?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const password = body?.password
  if (!password || typeof password !== 'string' || password.length > 1024) {
    return NextResponse.json({ error: 'Missing password' }, { status: 400 })
  }

  const hash   = createHash('sha1').update(password).digest('hex').toUpperCase()
  const prefix = hash.slice(0, 5)
  const suffix = hash.slice(5)

  try {
    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(4000),
    })

    if (!res.ok) {
      return NextResponse.json({ pwned: false })
    }

    const text  = await res.text()
    const pwned = text.split('\n').some(line => {
      const sep   = line.indexOf(':')
      const lSuffix = line.slice(0, sep).trim()
      const count   = parseInt(line.slice(sep + 1).trim(), 10)
      return lSuffix === suffix && count > 0
    })

    return NextResponse.json({ pwned })
  } catch {
    // HIBP unreachable — fail open so sign-up still works
    return NextResponse.json({ pwned: false })
  }
}
