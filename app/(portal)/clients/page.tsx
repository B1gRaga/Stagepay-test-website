import { redirect } from 'next/navigation'
import { createClient, getCachedUser, getCachedProfile } from '@/lib/supabase/server'
import ClientsGrid from '@/components/portal/ClientsGrid'
import type { ClientStats } from '@/components/portal/ClientsGrid'

export default async function ClientsPage() {
  const user = await getCachedUser()
  if (!user) redirect('/auth/login')

  const supabase = await createClient()
  const [{ data: clients }, { data: invoices }, profile] = await Promise.all([
    supabase
      .from('clients')
      .select('id, name, email, phone, address, vat_number, notes, created_at')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name'),
    supabase
      .from('invoices')
      .select('client_id, client_name, total, currency, status, issue_date, created_at')
      .eq('user_id', user.id)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(2000),
    getCachedProfile(user.id),
  ])

  // Invoices created before the client record existed are linked by name.
  const nameToId: Record<string, string> = {}
  for (const c of clients ?? []) nameToId[c.name.toLowerCase()] = c.id

  // Newest first, so each client's currency is the one on their latest invoice;
  // only amounts in that currency are added up, never Pula and Rand together.
  const stats: Record<string, ClientStats> = {}
  for (const inv of invoices ?? []) {
    const id = inv.client_id ?? nameToId[(inv.client_name || '').toLowerCase()]
    if (!id) continue
    const cur = inv.currency || profile?.default_currency || 'P'
    const s = stats[id] ?? (stats[id] = { currency: cur, invoices: 0, billed: 0, owes: 0, late: 0, lateCount: 0, lastIssued: inv.issue_date })
    s.invoices++
    if (cur !== s.currency) continue
    const total = Number(inv.total || 0)
    if (inv.status !== 'draft') s.billed += total
    if (inv.status === 'sent' || inv.status === 'pending' || inv.status === 'overdue') s.owes += total
    if (inv.status === 'overdue') { s.late += total; s.lateCount++ }
  }

  return <ClientsGrid clients={clients ?? []} stats={stats} currency={profile?.default_currency || 'P'} />
}
