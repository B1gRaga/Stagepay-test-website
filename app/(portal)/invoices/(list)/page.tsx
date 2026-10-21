import { createClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'
import InvoicesTable from '@/components/portal/InvoicesTable'

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const account = await getAccount()
  if (!account) return null

  const supabase = await createClient()
  const { data: invoices, count } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_name, project, issue_date, due_date, total, status, currency', { count: 'estimated' })
    .eq('user_id', account.accountId)
    .order('created_at', { ascending: false })
    .range(0, 49)

  // Reminders that actually went out, per invoice: drives the second tick.
  const ids = (invoices ?? []).map(i => i.id)
  const remindersSent: Record<string, number> = {}
  if (ids.length) {
    const { data: sent } = await supabase
      .from('reminders')
      .select('invoice_id')
      .in('invoice_id', ids)
      .eq('status', 'sent')
    for (const r of sent ?? []) remindersSent[r.invoice_id] = (remindersSent[r.invoice_id] ?? 0) + 1
  }

  const rows = (invoices ?? []).map(i => ({ ...i, reminders_sent: remindersSent[i.id] ?? 0 }))
  const { q } = await searchParams
  return <InvoicesTable initialInvoices={rows} totalCount={count ?? 0} initialSearch={q ?? ''} />
}
