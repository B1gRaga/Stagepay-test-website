import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripTags, stripTagsOrNull } from '@/lib/sanitize'

const ALLOWED = [
  'name', 'firm_name', 'phone', 'address', 'city', 'country',
  'vat_number', 'default_currency', 'tax_label', 'default_vat_rate',
  'invoice_theme', 'brand_color_primary', 'brand_color_header',
] as const

const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i
const VALID_THEMES  = new Set(['dark-modern', 'clean-light', 'minimal', 'charcoal', 'bold-emerald'])

export async function GET() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('name, firm_name, email, phone, address, city, country, vat_number, logo_url, plan, default_currency, tax_label, default_vat_rate, two_fa_enabled, invoice_theme, brand_color_primary, brand_color_header')
    .eq('id', user.id)
    .single()

  if (error) return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  return NextResponse.json({ profile: data })
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    } else if (key === 'invoice_theme') {
      const v = String(body[key] ?? '')
      if (!VALID_THEMES.has(v)) return NextResponse.json({ error: 'Invalid invoice_theme' }, { status: 400 })
      updates[key] = v
    } else if (key === 'brand_color_primary' || key === 'brand_color_header') {
      if (body[key] === null) { updates[key] = null; continue }
      const v = String(body[key])
      if (v !== '' && !HEX_COLOR_RE.test(v)) return NextResponse.json({ error: `${key} must be a hex colour like #10B981` }, { status: 400 })
      updates[key] = v === '' ? null : v
    } else {
      updates[key] = body[key] === null ? null : stripTags(body[key])
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields provided' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  return NextResponse.json({ profile: data })
}
