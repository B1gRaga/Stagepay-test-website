import { createClient, getCachedUser } from '@/lib/supabase/server'
import InvoicesTable from '@/components/portal/InvoicesTable'

export default async function InvoicesPage() {
  const user = await getCachedUser()
  if (!user) return null

  const supabase = await createClient()
  const { data: invoices, count } = await supabase
    .from('invoices')
    .select('id, invoice_number, client_name, project, issue_date, total, status, currency', { count: 'estimated' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(0, 49)

  return <InvoicesTable initialInvoices={invoices ?? []} totalCount={count ?? 0} />
}
