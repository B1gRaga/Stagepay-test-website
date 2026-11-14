import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { getAccount, canManage, accountProfileClient } from '@/lib/account'
import { createServiceClient } from '@/lib/supabase/server'
import { stripTags } from '@/lib/sanitize'
import { checkRateLimit } from '@/lib/rate-limit'
import { getVerification, cleanRegistrationNumber, VERIFICATION_BUCKET } from '@/lib/verification'
import { emailNewSubmission } from '@/lib/emails/verification'

// GET  /api/verification → this business's verification status
// POST /api/verification (multipart) → send the CIPA certificate for review:
//   certificate=<PDF or photo>, registration_number, registered_name,
//   submitter_name, submitter_role?
// Owners and admins only. The certificate goes to a private bucket.

const MAX_BYTES = 5 * 1024 * 1024
const MAGIC: Record<string, { ext: string; ok: (b: Uint8Array) => boolean }> = {
  'application/pdf': { ext: 'pdf', ok: b => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46 },
  'image/png':       { ext: 'png', ok: b => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 },
  'image/jpeg':      { ext: 'jpg', ok: b => b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF },
  'image/webp':      { ext: 'webp', ok: b => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 },
}

const text = (v: FormDataEntryValue | null, max: number) => (typeof v === 'string' ? stripTags(v).trim().slice(0, max) : '')

export async function GET() {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ verification: await getVerification(account.accountId) })
}

export async function POST(req: NextRequest) {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!canManage(account)) return NextResponse.json({ error: 'Only the owner or an admin can verify the business' }, { status: 403 })
  if (!(await checkRateLimit(`verify:${account.accountId}`, 5, 60 * 60_000))) {
    return NextResponse.json({ error: 'Too many attempts. Try again in an hour.' }, { status: 429 })
  }

  const current = await getVerification(account.accountId)
  if (current.status === 'approved') return NextResponse.json({ error: 'This business is already verified' }, { status: 409 })

  let form: FormData
  try { form = await req.formData() } catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }) }

  const registration_number = cleanRegistrationNumber(form.get('registration_number'))
  const registered_name = text(form.get('registered_name'), 120)
  const submitter_name = text(form.get('submitter_name'), 80)
  const submitter_role = text(form.get('submitter_role'), 60) || null
  if (!registration_number) return NextResponse.json({ error: 'Enter the registration number from your CIPA certificate, e.g. BW00001234567' }, { status: 400 })
  if (registered_name.length < 2) return NextResponse.json({ error: 'Enter the business name exactly as it is on the certificate' }, { status: 400 })
  if (submitter_name.length < 2) return NextResponse.json({ error: 'Enter your name' }, { status: 400 })

  const file = form.get('certificate')
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: 'Add your CIPA certificate (PDF or photo)' }, { status: 400 })
  const kind = MAGIC[file.type]
  if (!kind) return NextResponse.json({ error: 'The certificate must be a PDF, JPG, PNG or WebP' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'The certificate must be under 5 MB' }, { status: 400 })
  const bytes = await file.arrayBuffer()
  if (!kind.ok(new Uint8Array(bytes, 0, 12))) return NextResponse.json({ error: 'That file isn’t a readable PDF or image' }, { status: 400 })

  const svc = createServiceClient()
  const path = `${account.accountId}/certificate-${Date.now()}.${kind.ext}`
  const { error: upErr } = await svc.storage.from(VERIFICATION_BUCKET).upload(path, bytes, { contentType: file.type, upsert: false })
  if (upErr) return NextResponse.json({ error: 'Couldn’t upload the certificate. Try again.' }, { status: 500 })

  const { error: dbErr } = await svc.from('business_verifications').upsert({
    account_id: account.accountId, status: 'pending',
    registration_number, registered_name, submitter_name, submitter_role,
    certificate_path: path, submitted_by: account.userId, submitted_at: new Date().toISOString(),
    reviewed_at: null, reviewed_by: null, decision_note: null,
  })
  if (dbErr) {
    await svc.storage.from(VERIFICATION_BUCKET).remove([path])
    return NextResponse.json({ error: 'Couldn’t save that. Try again.' }, { status: 500 })
  }

  const { data: profile } = await (await accountProfileClient(account)).from('profiles').select('firm_name, name').eq('id', account.accountId).single()
  const who = (await headers()).get('x-user-email') || ''
  await emailNewSubmission({
    businessName: profile?.firm_name || profile?.name || registered_name,
    registeredName: registered_name, registrationNumber: registration_number,
    submitter: [submitter_name, submitter_role, who].filter(Boolean).join(' · '),
  })

  return NextResponse.json({ verification: await getVerification(account.accountId) }, { status: 201 })
}
