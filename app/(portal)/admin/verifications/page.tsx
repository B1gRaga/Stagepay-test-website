import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { createServiceClient } from '@/lib/supabase/server'
import { isStagePayAdmin, VERIFICATION_BUCKET, REMOVED } from '@/lib/verification'
import { methodList, describeMethod } from '@/lib/emails/payment-details-changed'
import VerificationReview from '@/components/portal/VerificationReview'

// StagePay staff only (STAGEPAY_ADMIN_EMAILS): businesses waiting to be
// verified, with their certificate or Omang and the payment details on their
// invoices. An Omang photo is gone once decided (only the last 4 digits stay).

export const dynamic = 'force-dynamic'

export default async function VerificationsAdmin() {
  if (!isStagePayAdmin((await headers()).get('x-user-email'))) notFound()
  const svc = createServiceClient()

  const { data: rows } = await svc.from('business_verifications')
    .select('account_id, status, kind, registration_number, registered_name, submitter_name, submitter_role, certificate_path, submitted_at, reviewed_at, reviewed_by, decision_note')
    .order('status', { ascending: false }) // pending first (p > d > a)
    .order('submitted_at', { ascending: false })
    .limit(60)

  const ids = (rows ?? []).map(r => r.account_id)
  const { data: profiles } = ids.length
    ? await svc.from('profiles').select('id, firm_name, name, phone, payment_methods').in('id', ids)
    : { data: [] as { id: string; firm_name: string | null; name: string | null; phone: string | null; payment_methods: unknown }[] }
  const byId = new Map((profiles ?? []).map(p => [p.id, p]))

  const items = await Promise.all((rows ?? []).map(async r => {
    const p = byId.get(r.account_id)
    const { data: signed } = r.certificate_path && r.certificate_path !== REMOVED
      ? await svc.storage.from(VERIFICATION_BUCKET).createSignedUrl(r.certificate_path, 60 * 60)
      : { data: null }
    return {
      accountId: r.account_id,
      status: r.status as 'pending' | 'approved' | 'declined',
      kind: (r.kind === 'individual' ? 'individual' : 'company') as 'company' | 'individual',
      businessName: p?.firm_name || p?.name || '(no business name)',
      phone: p?.phone ?? null,
      registrationNumber: r.registration_number,
      registeredName: r.registered_name,
      submitter: [r.submitter_name, r.submitter_role].filter(Boolean).join(', '),
      submittedAt: r.submitted_at,
      reviewed: r.reviewed_at ? `${r.reviewed_by ?? ''} · ${new Date(r.reviewed_at).toLocaleDateString('en-GB')}` : null,
      note: r.decision_note,
      certificateUrl: signed?.signedUrl ?? null,
      payTo: methodList(p?.payment_methods).map(describeMethod),
    }
  }))

  return <VerificationReview items={items} />
}
