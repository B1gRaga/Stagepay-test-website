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
    supabase
      .from('invoices')
      .select('client_id, client_name, total, currency')
      .eq('user_id', user.id)
      .limit(1000),
  ])

  // Build a lookup from lowercase name → client id for invoices that were
  // created without being linked to a client record (client_id is null).
  const nameToId: Record<string, string> = {}
  for (const c of (clients || [])) {
    nameToId[c.name.toLowerCase()] = c.id
  }

  const statsMap: Record<string, ClientStats> = {}
  for (const inv of (invSummaries || [])) {
    const clientId = inv.client_id ?? nameToId[(inv.client_name || '').toLowerCase()]
    if (!clientId) continue
    const s = statsMap[clientId] ?? { count: 0, total: 0, currency: inv.currency || 'P' }
    s.count++
    s.total += Number(inv.total || 0)
    statsMap[clientId] = s
  }

  return <ClientsGrid clients={clients ?? []} statsMap={statsMap} />
}
