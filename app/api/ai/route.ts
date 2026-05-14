import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { checkRateLimit as rateLimit } from '@/lib/rate-limit'

// Only haiku is allowed via this proxy — prevents clients from selecting
// expensive models (opus/sonnet) and draining the API budget.
const ALLOWED_MODEL = 'claude-haiku-4-5'
const MAX_TOKENS_CAP = 1024

// Per-user daily cap — prevents a single account from burning unlimited
// API credits by cycling through the per-minute window repeatedly.
const DAILY_LIMIT = 50
const DAY_MS      = 24 * 60 * 60 * 1000

export async function POST(req: NextRequest) {
  const { user } = await getAuthContext(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Per-minute burst limit
  if (!(await rateLimit(user.id, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Per-day limit — keyed separately so the windows don't interfere
  if (!(await rateLimit(`daily:${user.id}`, DAILY_LIMIT, DAY_MS))) {
    return NextResponse.json({ error: 'Daily AI request limit reached. Try again tomorrow.' }, { status: 429 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: { message: 'API key not configured' } }, { status: 500 })
  }

  let body: { messages?: unknown; max_tokens?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: { message: 'Invalid request body' } }, { status: 400 })
  }

  if (!body.messages) {
    return NextResponse.json({ error: { message: 'messages is required' } }, { status: 400 })
  }

  // Model and max_tokens are server-controlled; system prompt is never
  // forwarded — both prevent cost drain and prompt injection.
  const payload = {
    model:      ALLOWED_MODEL,
    messages:   body.messages,
    max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS_CAP, MAX_TOKENS_CAP),
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
