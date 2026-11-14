import { NextRequest, NextResponse } from 'next/server'
import { getAccount, canManage, accountProfileClient } from '@/lib/account'
import { stripTags } from '@/lib/sanitize'
import { cleanMethod, MAX_METHODS } from '@/lib/payment-methods'
import { hasVatNumber, VAT_NEEDS_NUMBER } from '@/lib/vat'
import { cleanReminderDays } from '@/lib/reminder-days'
import { headers } from 'next/headers'
import { sameMethods } from '@/lib/emails/payment-details-changed'
import { notifyPaymentDetailsChanged } from '@/lib/notify-payment-change'

const ALLOWED = [
  'name', 'firm_name', 'phone', 'address', 'city', 'country',
  'vat_number', 'default_currency', 'tax_label', 'default_vat_rate',
  'invoice_theme', 'brand_color_primary', 'brand_color_header',
  'whatsapp_reminders_enabled', 'business_type',
  'payment_methods', 'default_due_days', 'invoice_paper_size', 'reminder_days',
] as const

const VALID_BUSINESS_TYPES = new Set(['tuition_centre', 'school', 'contractor', 'freelancer', 'salon', 'agency', 'other'])

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i
const VALID_THEMES  = new Set(['dark-modern', 'clean-light', 'minimal', 'charcoal', 'bold-amber'])

export async function GET() {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = await accountProfileClient(account)

  const { data, error } = await supabase
    .from('profiles')
    .select('name, firm_name, email, phone, address, city, country, vat_number, logo_url, signature_url, signature_name, plan, default_currency, tax_label, default_vat_rate, two_fa_enabled, invoice_theme, brand_color_primary, brand_color_header, whatsapp_reminders_enabled, business_type, payment_methods, default_due_days, invoice_paper_size')
    .eq('id', account.accountId)
    .single()

  if (error) return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  return NextResponse.json({ profile: data }, {
    headers: { 'Cache-Control': 'private, max-age=10' },
  })
}

export async function PATCH(req: NextRequest) {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(account)) return NextResponse.json({ error: 'Only the owner or an admin can change business settings' }, { status: 403 })
  const supabase = await accountProfileClient(account)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  for (const key of ALLOWED) {
    if (body[key] === undefined) continue
    if (key === 'default_vat_rate') {
      const n = Number(body[key])
      if (isNaN(n) || n < 0 || n > 100) return NextResponse.json({ error: 'default_vat_rate must be 0–100' }, { status: 400 })
      updates[key] = n
    } else if (key === 'payment_methods') {
      if (!Array.isArray(body[key])) return NextResponse.json({ error: 'payment_methods must be a list' }, { status: 400 })
      const list = (body[key] as unknown[]).map(cleanMethod).filter(Boolean)
      if (list.length > MAX_METHODS) return NextResponse.json({ error: `At most ${MAX_METHODS} payment methods` }, { status: 400 })
      updates[key] = list
    } else if (key === 'default_due_days') {
      const n = Number(body[key])
      if (!Number.isInteger(n) || n < 0 || n > 365) return NextResponse.json({ error: 'default_due_days must be a whole number from 0 to 365' }, { status: 400 })
      updates[key] = n
    } else if (key === 'invoice_paper_size') {
      const v = String(body[key] ?? '')
      if (v !== 'A4' && v !== 'A5') return NextResponse.json({ error: 'invoice_paper_size must be A4 or A5' }, { status: 400 })
      updates[key] = v
    } else if (key === 'invoice_theme') {
      const v = String(body[key] ?? '')
      if (!VALID_THEMES.has(v)) return NextResponse.json({ error: 'Invalid invoice_theme' }, { status: 400 })
      updates[key] = v
    } else if (key === 'brand_color_primary' || key === 'brand_color_header') {
      if (body[key] === null) { updates[key] = null; continue }
      const v = String(body[key])
      if (v !== '' && !HEX_COLOR_RE.test(v)) return NextResponse.json({ error: `${key} must be a hex colour like #F2A900` }, { status: 400 })
      updates[key] = v === '' ? null : v
    } else if (key === 'reminder_days') {
      const days = cleanReminderDays(body[key])
      if (!days) return NextResponse.json({ error: 'reminder_days must be a list of days from 3, 7, 14 and 30' }, { status: 400 })
      updates[key] = days
    } else if (key === 'whatsapp_reminders_enabled') {
      updates[key] = Boolean(body[key])
    } else if (key === 'business_type') {
      if (body[key] === null) { updates[key] = null; continue }
      const v = String(body[key])
      if (!VALID_BUSINESS_TYPES.has(v)) return NextResponse.json({ error: 'Invalid business_type' }, { status: 400 })
      updates[key] = v
    } else {
      updates[key] = body[key] === null ? null : stripTags(body[key])
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  // VAT needs a VAT number. Removing the number turns VAT off for new invoices.
  if (updates.vat_number !== undefined || Number(updates.default_vat_rate) > 0) {
    let vatNo = updates.vat_number as string | null | undefined
    if (vatNo === undefined) {
      const { data: cur } = await supabase.from('profiles').select('vat_number').eq('id', account.accountId).single()
      vatNo = cur?.vat_number
    }
    if (!hasVatNumber(vatNo)) {
      if (Number(updates.default_vat_rate) > 0) return NextResponse.json({ error: VAT_NEEDS_NUMBER }, { status: 400 })
      updates.default_vat_rate = 0
    }
  }

  // Payment details: remember what they were, to tell the owner if they change.
  let before: { payment_methods: unknown } | null = null
  if (updates.payment_methods !== undefined) {
    const { data: cur } = await supabase.from('profiles').select('payment_methods').eq('id', account.accountId).single()
    before = cur ?? { payment_methods: [] }
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates as import('@/lib/supabase/types').ProfileUpdate)
    .eq('id', account.accountId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })

  if (before && !sameMethods(before.payment_methods, data.payment_methods)) {
    await notifyPaymentDetailsChanged({
      accountId: account.accountId,
      businessName: data.firm_name || data.name || 'your business',
      changedBy: (await headers()).get('x-user-email') || 'someone signed in to your account',
      methods: data.payment_methods,
    })
  }
  return NextResponse.json({ profile: data })
}
