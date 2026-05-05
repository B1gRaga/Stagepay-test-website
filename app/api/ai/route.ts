import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(req: NextRequest) {
  const { user } = await getAuthContext(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!rateLimit(user.id, 20, 60_000)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: { message: 'API key not configured' } }, { status: 500 })
  }

  let body: { model?: string; messages?: unknown; max_tokens?: number; system?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: { message: 'Invalid request body' } }, { status: 400 })
  }

  if (!body.model || !body.messages) {
    return NextResponse.json({ error: { message: 'model and messages are required' } }, { status: 400 })
  }

  // Only forward known safe fields to Anthropic
  const payload = {
    model: body.model,
    messages: body.messages,
    max_tokens: body.max_tokens ?? 1024,
    ...(body.system ? { system: body.system } : {}),
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
