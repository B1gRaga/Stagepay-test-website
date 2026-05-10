import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit as rateLimit } from '@/lib/rate-limit'

const BASE_SYSTEM_PROMPT = `You are an invoice generation assistant for StagePay, a global invoicing platform for professionals.

Extract structured invoice data from the user's plain-English description. Return ONLY valid JSON matching this exact shape:

{
  "client_name": string,
  "client_email": string | null,
  "client_phone": string | null,
  "project": string,
  "items": [
    { "description": string, "quantity": number, "unit_price": number }
  ],
  "vat_rate": number,
  "deposit_amount": number,
  "due_days": number | null,
  "notes": string | null,
  "currency": string
}

Rules:
- currency defaults to "{{DEFAULT_CURRENCY}}" unless another currency is clearly stated
- vat_rate defaults to {{DEFAULT_VAT_RATE}} (user's default {{TAX_LABEL}} rate) unless another rate is mentioned
- deposit_amount is the amount already paid, not a percentage
- If a percentage deposit is mentioned (e.g. "50% deposit paid"), calculate the actual amount from the subtotal
- due_days is the payment term in days (e.g. "Net 30" → 30, "due in 7 days" → 7)
- Break compound work into separate line items where logical
- quantities should reflect hours, units, visits, etc — not always 1
- Return only the JSON object, no markdown, no explanation`

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimit(user.id, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'API key not configured' }, { status: 500 })

  let prompt: string
  try {
    const body = await req.json()
    prompt = body.prompt
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

  // Load user's tax/currency preferences to personalise the AI prompt
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('default_currency, tax_label, default_vat_rate')
    .eq('id', user.id)
    .single()

  const currency = String(profile?.default_currency ?? 'P')
  const taxLabel = String(profile?.tax_label        ?? 'VAT')
  const vatRate  = Number(profile?.default_vat_rate  ?? 14)

  const systemPrompt = BASE_SYSTEM_PROMPT
    .replace('{{DEFAULT_CURRENCY}}', currency)
    .replace('{{DEFAULT_VAT_RATE}}', String(vatRate))
    .replace('{{TAX_LABEL}}',        taxLabel)

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         apiKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  const data = await res.json()
  if (!res.ok) return NextResponse.json({ error: data.error?.message ?? 'AI error' }, { status: res.status })

  const raw = data.content?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(raw)
    return NextResponse.json({ invoice: parsed })
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response', raw }, { status: 500 })
  }
}
