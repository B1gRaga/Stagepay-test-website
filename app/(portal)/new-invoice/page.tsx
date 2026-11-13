import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccount, accountProfileClient } from '@/lib/account'
import NewInvoiceClient from '@/components/portal/NewInvoiceClient'
import type { LastInvoice } from '@/components/portal/invoice-draft'
import { FREE_MONTHLY_LIMIT, startOfMonthUtc, canBulkSend } from '@/lib/plans'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; client?: string; class?: string }>
}) {
  const account = await getAccount()
  if (!account) redirect('/auth/login')

  const supabase = await createClient()
  const profileDb = await accountProfileClient(account)

  const { edit: editId, client: clientParam, class: classParam } = await searchParams

  const [{ data: profile }, { data: clients }, { data: initialInvoice }, { data: recent }, { count: madeThisMonth }] = await Promise.all([
    profileDb
      .from('profiles')
      .select('name, firm_name, email, address, default_currency, default_vat_rate, tax_label, default_due_days, business_type, plan')
      .eq('id', account.accountId)
      .single(),
    supabase
      .from('clients')
      .select('id, name, email, phone, class_name, billed_for')
      .eq('user_id', account.accountId)
      .is('deleted_at', null)
      .order('name'),
    editId
      ? supabase
          .from('invoices')
          .select('*, invoice_items(*)')
          .eq('id', editId)
          .eq('user_id', account.accountId)
          .single()
      : Promise.resolve({ data: null, error: null }),
    // Recent invoices with their items: "same as last time" per client, and remembered items.
    supabase
      .from('invoices')
      .select('id, client_id, client_name, project, billed_for, invoice_number, issue_date, currency, total, invoice_items(description, quantity, unit_price, sort_order)')
      .eq('user_id', account.accountId)
      .neq('status', 'cancelled')
      .order('created_at', { ascending: false })
      .limit(120),
    // Same count the free-plan limit uses: invoices created since the 1st.
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', account.accountId)
      .gte('created_at', startOfMonthUtc()),
  ])

  // Free accounts see how many invoices they have left before they start typing.
  const freeLeft = !editId && (profile?.plan ?? 'free') === 'free'
    ? Math.max(0, FREE_MONTHLY_LIMIT - (madeThisMonth ?? 0))
    : null

  type Recent = {
    id: string; client_id: string | null; client_name: string; project: string | null; billed_for: string | null; invoice_number: string
    issue_date: string | null; currency: string | null; total: number
    invoice_items: { description: string; quantity: number; unit_price: number; sort_order: number | null }[] | null
  }
  const rows = ((recent ?? []) as Recent[]).filter(r => r.id !== editId)

  // Latest invoice per client (by id, falling back to name).
  const lastByClient: Record<string, LastInvoice> = {}
  for (const r of rows) {
    const key = r.client_id ?? `name:${r.client_name.toLowerCase()}`
    if (lastByClient[key] || !r.invoice_items?.length) continue
    lastByClient[key] = {
      invoice_number: r.invoice_number, project: r.project, billed_for: r.billed_for, issue_date: r.issue_date, currency: r.currency, total: Number(r.total),
      items: [...r.invoice_items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
        .map(i => ({ desc: i.description, qty: Number(i.quantity), rate: Number(i.unit_price) })),
    }
  }

  // Items used before, most recent rate first, for description suggestions.
  const known = new Map<string, { desc: string; rate: number }>()
  for (const r of rows) for (const i of r.invoice_items ?? []) {
    const k = i.description.trim().toLowerCase()
    if (k && !known.has(k)) known.set(k, { desc: i.description.trim(), rate: Number(i.unit_price) })
  }

  return (
    <NewInvoiceClient
      initialProfile={profile ?? null}
      initialClients={clients ?? []}
      editId={editId ?? null}
      initialInvoice={initialInvoice ?? null}
      initialClientId={!editId && clientParam ? clientParam : null}
      initialClass={!editId && classParam?.trim() ? classParam.trim().slice(0, 40) : null}
      lastByClient={lastByClient}
      knownItems={[...known.values()].slice(0, 80)}
      freeLeft={freeLeft}
      bulkSend={canBulkSend(profile?.plan)}
      draftKey={`stagepay-invoice-draft:${account.userId}:${account.accountId}`}
    />
  )
}
