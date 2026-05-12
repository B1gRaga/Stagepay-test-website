import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { checkRateLimit as rateLimit } from '@/lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

// Static — never interpolated, so the API caches this block across all users.
// User-specific values (currency, VAT) travel in the user message instead.
const STATIC_SYSTEM_PROMPT = `You are an invoice generation assistant for StagePay, a global invoicing platform for professionals.

Extract structured invoice data from the user's plain-English description and return it as JSON.

Rules:
- Use the currency, VAT rate, and tax label supplied in the "User preferences" block
- deposit_amount is the amount already paid, not a percentage; if a percentage is mentioned (e.g. "50% deposit paid") calculate the actual amount from the subtotal
- due_days is the payment term in days (e.g. "Net 30" → 30, "due in 7 days" → 7)
- Break compound work into separate line items where logical
- quantities should reflect hours, units, visits, etc — not always 1
- Return null for optional fields that are not mentioned`

const INVOICE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    client_name:    { type: 'string' },
    client_email:   { type: ['string', 'null'] },
    client_phone:   { type: ['string', 'null'] },
    project:        { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity:    { type: 'number' },
          unit_price:  { type: 'number' },
        },
        required: ['description', 'quantity', 'unit_price'],
        additionalProperties: false,
      },
    },
    vat_rate:        { type: 'number' },
    deposit_amount:  { type: 'number' },
    due_days:        { type: ['number', 'null'] },
    notes:           { type: ['string', 'null'] },
    currency:        { type: 'string' },
  },
  required: ['client_name', 'project', 'items', 'vat_rate', 'deposit_amount', 'currency'],
  additionalProperties: false,
}

export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuthContext(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await rateLimit(user.id, 20, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let prompt: string
  try {
    const body = await req.json()
    prompt = body.prompt
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!prompt?.trim()) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('default_currency, tax_label, default_vat_rate')
    .eq('id', user.id)
    .single()

  const currency = String(profile?.default_currency ?? 'BWP')
  const taxLabel = String(profile?.tax_label        ?? 'VAT')
  const vatRate  = Number(profile?.default_vat_rate  ?? 14)

  // User-specific values go here so the system prompt stays fully static (cacheable)
  const userMessage =
    `User preferences: currency=${currency}, default ${taxLabel} rate=${vatRate}%\n\n${prompt}`

  try {
    const response = await (client.messages.create as any)(
      {
        model:      'claude-haiku-4-5',
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: STATIC_SYSTEM_PROMPT,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [{ role: 'user', content: userMessage }],
        output_config: {
          format: {
            type: 'json_schema',
            json_schema: {
              name:   'invoice',
              schema: INVOICE_JSON_SCHEMA,
              strict: true,
            },
          },
        },
      },
      {
        headers: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
      }
    )

    const text = response.content?.[0]?.text ?? ''
    const invoice = JSON.parse(text)
    return NextResponse.json({ invoice })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
