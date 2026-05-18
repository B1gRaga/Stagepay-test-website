import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import InvoicesTable from '@/components/portal/InvoicesTable'

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: invoices, count } = await (supabase as any)
    .from('invoices')
    .select('id, invoice_number, client_name, client_email, client_phone, project, issue_date, total, status, currency', { count: 'exact' })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range(0, 49)

  return <InvoicesTable initialInvoices={invoices ?? []} totalCount={count ?? 0} />
}
