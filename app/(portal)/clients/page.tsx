import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ClientsGrid from '@/components/portal/ClientsGrid'
import type { ClientStats } from '@/components/portal/ClientsGrid'

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: clients }, { data: invSummaries }] = await Promise.all([
    (supabase as any)
      .from('clients')
      .select('id, name, email, phone, address, vat_number, notes, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name'),
    (supabase as any)
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
