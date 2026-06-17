import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import ClientsGrid from '@/components/portal/ClientsGrid'
import type { ClientStats } from '@/components/portal/ClientsGrid'

export default async function ClientsPage() {
  const user = await getCachedUser()
  if (!user) redirect('/auth/login')

  const supabase = await createClient()
  const [{ data: clients }, { data: invSummaries }] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, email, phone, address, vat_number, notes, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name'),
    // Only fetch invoices that are linked to a client — drops the 1000-row
    // full-table scan and eliminates the O(n) name-matching fallback loop.
    supabase
      .from('invoices')
      .select('client_id, total, currency')
      .eq('user_id', user.id)
      .not('client_id', 'is', null),
  ])

  const statsMap: Record<string, ClientStats> = {}
  for (const inv of (invSummaries || [])) {
    if (!inv.client_id) continue
    const s = statsMap[inv.client_id] ?? { count: 0, total: 0, currency: inv.currency || 'P' }
    s.count++
    s.total += Number(inv.total || 0)
    statsMap[inv.client_id] = s
  }

  return <ClientsGrid clients={clients ?? []} statsMap={statsMap} />
}
