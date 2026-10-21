import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'
import InvoicePreviewClient from '@/components/portal/InvoicePreviewClient'

type Params = { params: Promise<{ id: string }> }

export default async function InvoicePreviewPage({ params }: Params) {
  const account = await getAccount()
  if (!account) redirect('/auth/login')

  const { id } = await params
  const supabase = await createClient()
  const { data: invoice } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_name, client_email, client_phone, project, issue_date, due_date, total, status, currency, public_token, email_sent_at')
    .eq('id', id)
    .eq('user_id', account.accountId)
    .single()

  if (!invoice) notFound()

  // Sent and upcoming reminders feed the invoice's timeline.
  const { data: reminders } = await supabase
    .from('reminders')
    .select('status, send_at, sent_at, channel')
    .eq('invoice_id', id)
    .in('status', ['sent', 'scheduled'])
    .order('send_at', { ascending: true })

  return <InvoicePreviewClient invoice={invoice} reminders={reminders ?? []} />
}
