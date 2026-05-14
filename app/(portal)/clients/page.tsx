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
      .select('client_id, client_name, total, currency')
      .eq('user_id', user.id),
  ])

  // Build a lookup from lowercase name → client id for fallback matching
  const nameToId: Record<string, string> = {}
  for (const c of (clients || [])) {
    nameToId[c.name.toLowerCase()] = c.id
  }

  const statsMap: Record<string, ClientStats> = {}
  for (const inv of (invSummaries || [])) {
    // Match by client_id if set, otherwise fall back to client_name match
    const clientId = inv.client_id ?? nameToId[(inv.client_name || '').toLowerCase()]
    if (!clientId) continue
    const s = statsMap[clientId] ?? { count: 0, total: 0, currency: inv.currency || 'P' }
    s.count++
    s.total += Number(inv.total || 0)
    statsMap[clientId] = s
  }

  return <ClientsGrid clients={clients ?? []} statsMap={statsMap} />
}
