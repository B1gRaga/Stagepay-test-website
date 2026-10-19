import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { stripTagsOrNull } from '@/lib/sanitize'
import { checkRateLimit } from '@/lib/rate-limit'

const BUSINESS_TYPES = ['Solo tutor', 'Tutoring centre', 'School', 'Other']
const STUDENT_RANGES = ['1–10', '11–50', '51+', 'Not sure']
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

  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : ''
  const whatsapp = typeof body.whatsapp === 'string' ? body.whatsapp.replace(/[^\d+]/g, '') : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const businessType = typeof body.business_type === 'string' ? body.business_type : ''
  const studentRange = typeof body.student_range === 'string' ? body.student_range : ''
  const note = stripTagsOrNull(body.note)
  const consent = body.consent === true
  const source = typeof body.source === 'string' ? body.source.slice(0, 40) : null

  if (fullName.length < 2 || fullName.length > 120) {
    return NextResponse.json({ error: 'Enter your name.' }, { status: 400 })
  }
  if (!WHATSAPP_RE.test(whatsapp)) {
    return NextResponse.json({ error: 'Enter a valid WhatsApp number.' }, { status: 400 })
  }
  if (email && (!EMAIL_RE.test(email) || email.length > 200)) {
    return NextResponse.json({ error: 'Check the email address.' }, { status: 400 })
  }
  if (!BUSINESS_TYPES.includes(businessType)) {
    return NextResponse.json({ error: 'Choose a business type.' }, { status: 400 })
  }
  if (studentRange && !STUDENT_RANGES.includes(studentRange)) {
    return NextResponse.json({ error: 'Invalid student range.' }, { status: 400 })
  }
  if (!consent) {
    return NextResponse.json({ error: 'Tick the box so we can contact you.' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('waitlist_signups').insert({
    full_name: fullName,
    whatsapp,
    email: email || null,
    business_type: businessType,
    student_range: studentRange || null,
    note,
    consent: true,
    source,
  })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ alreadyExists: true })
    }
    console.error('[Waitlist] insert failed:', error.message)
    return NextResponse.json({ error: 'Your details didn’t save. Check your connection and try again.' }, { status: 500 })
  }

  return NextResponse.json({ success: true }, { status: 201 })
}
