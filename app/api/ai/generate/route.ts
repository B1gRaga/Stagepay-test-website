import { NextRequest, NextResponse } from 'next/server'
import { getAuthContext } from '@/lib/supabase/server'
import { checkRateLimit as rateLimit } from '@/lib/rate-limit'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

const STATIC_SYSTEM_PROMPT = `You are an invoice generation assistant for StagePay, a global invoicing platform for professionals.

Extract structured invoice data from the user's plain-English description and call the create_invoice tool.

Rules:
- Use the currency, VAT rate, and tax label supplied in the "User preferences" block
- deposit_amount is the amount already paid, not a percentage; if a percentage is mentioned (e.g. "50% deposit paid") calculate the actual amount from the subtotal
- due_days is the payment term in days (e.g. "Net 30" → 30, "due in 14 days" → 14)
- Break compound work into separate line items where logical
- quantities should reflect hours, units, visits, sessions, subjects, etc — not always 1
- Return null for optional fields that are not mentioned
- Always populate items — never return an empty items array`

const INVOICE_TOOL: Anthropic.Tool = {
  name: 'create_invoice',
  description: 'Create a structured invoice from the user description',
  input_schema: {
    type: 'object' as const,
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
  },
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

  const userMessage =
    `User preferences: currency=${currency}, default ${taxLabel} rate=${vatRate}%\n\n${prompt}`

  try {
    const response = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system:     STATIC_SYSTEM_PROMPT,
      tools:      [INVOICE_TOOL],
      tool_choice: { type: 'tool', name: 'create_invoice' },
      messages:   [{ role: 'user', content: userMessage }],
    })

    const toolBlock = response.content.find(b => b.type === 'tool_use')
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('Model did not return invoice data')
    }

    return NextResponse.json({ invoice: toolBlock.input })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
