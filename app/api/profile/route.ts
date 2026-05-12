import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripTags, stripTagsOrNull } from '@/lib/sanitize'

const ALLOWED = [
  'name', 'firm_name', 'phone', 'address', 'city', 'country',
  'vat_number', 'default_currency', 'tax_label', 'default_vat_rate',
] as const

export async function GET() {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('profiles')
    .select('name, firm_name, email, phone, address, city, country, vat_number, logo_url, plan, default_currency, tax_label, default_vat_rate, two_fa_enabled')
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
