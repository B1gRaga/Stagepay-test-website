import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripTagsOrNull } from '@/lib/sanitize'
import { checkRateLimit } from '@/lib/rate-limit'
import { BUSINESS_TYPES } from '@/lib/business-types'
import { WAITLIST_TOWNS, CURRENT_METHODS, WOULD_PAY, REFERRAL_CODE_RE } from '@/lib/waitlist'

const BUSINESS_VALUES: readonly string[] = BUSINESS_TYPES.map(b => b.value)
const TOWNS: readonly string[] = WAITLIST_TOWNS
const METHOD_VALUES: readonly string[] = CURRENT_METHODS.map(m => m.value)
const PAY_VALUES: readonly string[] = WOULD_PAY.map(p => p.value)
const WHATSAPP_RE = /^\+?[0-9]{7,15}$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// POST /api/waitlist — public, unauthenticated signup capture
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!(await checkRateLimit(`waitlist:${ip}`, 5, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
  const fullName = str(body.full_name)
  const whatsapp = str(body.whatsapp).replace(/[^\d+]/g, '')
  const email = str(body.email)
  const businessType = str(body.business_type)
  const town = str(body.town)
  const currentMethod = str(body.current_method)
  const wouldPay = str(body.would_pay)
  const note = stripTagsOrNull(body.note)
  const consent = body.consent === true
  const source = str(body.source).slice(0, 40) || null
  // A bad referral code is dropped rather than rejected — it came from a link, not the person.
  const referredBy = REFERRAL_CODE_RE.test(str(body.referred_by)) ? str(body.referred_by) : null

  if (fullName.length < 2 || fullName.length > 120) {
    return NextResponse.json({ error: 'Enter your name.' }, { status: 400 })
  }
  if (!WHATSAPP_RE.test(whatsapp)) {
    return NextResponse.json({ error: 'Enter a valid WhatsApp number.' }, { status: 400 })
  }
  if (email && (!EMAIL_RE.test(email) || email.length > 200)) {
    return NextResponse.json({ error: 'Check the email address.' }, { status: 400 })
  }
  if (!BUSINESS_VALUES.includes(businessType)) {
    return NextResponse.json({ error: 'Choose your type of business.' }, { status: 400 })
  }
  if (!TOWNS.includes(town)) {
    return NextResponse.json({ error: 'Choose your town.' }, { status: 400 })
  }
  if (!METHOD_VALUES.includes(currentMethod)) {
    return NextResponse.json({ error: 'Tell us how you invoice today.' }, { status: 400 })
  }
  if (!PAY_VALUES.includes(wouldPay)) {
    return NextResponse.json({ error: 'Choose an answer about the price.' }, { status: 400 })
  }
  if (note && note.length > 600) {
    return NextResponse.json({ error: 'Keep the note under 600 characters.' }, { status: 400 })
  }
  if (!consent) {
    return NextResponse.json({ error: 'Tick the box so we can contact you.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase.from('waitlist_signups').insert({
    full_name: fullName,
    whatsapp,
    email: email || null,
    business_type: businessType,
    town,
    current_method: currentMethod,
    would_pay: wouldPay,
    note,
    consent: true,
    source,
    referred_by: referredBy,
  }).select('referral_code').single()

  if (error) {
    if (error.code === '23505' && error.message.includes('whatsapp')) {
      return NextResponse.json({ alreadyExists: true })
    }
    console.error('[Waitlist] insert failed:', error.message)
    return NextResponse.json({ error: 'Your details didn’t save. Check your connection and try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, referral_code: data.referral_code }, { status: 201 })
}
