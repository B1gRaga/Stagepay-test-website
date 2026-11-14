import { createServiceClient } from '@/lib/supabase/server'

// Business verification (migration 053). A business must be approved before
// it can send from StagePay's own WhatsApp number: one-off sends and bulk
// sends. Automatic reminders don't need it (they follow invoices the business
// already delivered itself). Sending from the person's own WhatsApp never does.

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'declined'

export type Verification = {
  status: VerificationStatus
  registration_number?: string
  registered_name?: string
  submitter_name?: string
  submitter_role?: string | null
  submitted_at?: string
  reviewed_at?: string | null
  decision_note?: string | null
}

export const VERIFY_NEEDED_MSG =
  'To send from StagePay’s WhatsApp number, verify your business first: Settings → Verification. You can still send from your own WhatsApp.'

export const VERIFICATION_BUCKET = 'verification-docs'

export async function getVerification(accountId: string): Promise<Verification> {
  const { data } = await createServiceClient()
    .from('business_verifications')
    .select('status, registration_number, registered_name, submitter_name, submitter_role, submitted_at, reviewed_at, decision_note')
    .eq('account_id', accountId)
    .maybeSingle()
  return data ? (data as Verification) : { status: 'none' }
}

export async function isBusinessVerified(accountId: string): Promise<boolean> {
  return (await getVerification(accountId)).status === 'approved'
}

/** StagePay staff who review verifications: STAGEPAY_ADMIN_EMAILS="a@x.com,b@y.com" */
export function isStagePayAdmin(email?: string | null): boolean {
  if (!email) return false
  const list = (process.env.STAGEPAY_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  return list.includes(email.trim().toLowerCase())
}

// CIPA registration numbers: letters, digits and a few separators, e.g. BW00001234567.
export function cleanRegistrationNumber(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toUpperCase().replace(/\s+/g, '')
  return /^[A-Z0-9/-]{3,40}$/.test(s) ? s : null
}
