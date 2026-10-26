import { redirect, notFound } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAccount, accountProfileClient } from '@/lib/account'
import InvoicePreviewClient from '@/components/portal/InvoicePreviewClient'

type Params = { params: Promise<{ id: string }> }

export default async function InvoicePreviewPage({ params }: Params) {
  const account = await getAccount()
  if (!account) redirect('/auth/login')

  const { id } = await params
  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_name, client_email, client_phone, project, billed_for, issue_date, due_date, total, status, currency, public_token, email_sent_at, created_by, payment_claimed_at, payment_claim_ref')
    .eq('id', id)
    .eq('user_id', account.accountId)
    .single()

  if (!invoice) notFound()

  // The business type names the invoice's "billed for" line (Student, Project).
  const { data: profile } = await (await accountProfileClient(account)).from('profiles').select('business_type').eq('id', account.accountId).single()

  // Sent and upcoming reminders feed the invoice's timeline.
  const { data: reminders } = await supabase
    .from('reminders')
    .select('status, send_at, sent_at, channel')
    .eq('invoice_id', id)
    .in('status', ['sent', 'scheduled'])
    .order('send_at', { ascending: true })

  // Who made it, when that wasn't the business owner (a team member). Their name
  // lives on their own profile, which the access rules don't let colleagues read.
  let createdBy: string | null = null
  const creator = (invoice as { created_by?: string | null }).created_by
  if (creator && creator !== account.accountId) {
    const { data: person } = await createServiceClient().from('profiles').select('name, email').eq('id', creator).single()
    createdBy = person?.name || person?.email || 'a team member'
  }

  return <InvoicePreviewClient invoice={invoice} reminders={reminders ?? []} createdBy={createdBy} businessType={profile?.business_type ?? null} />
}
