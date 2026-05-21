import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import NewInvoiceClient from '@/components/portal/NewInvoiceClient'

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>
}) {
  const user = await getCachedUser()
  if (!user) redirect('/auth/login')

  const supabase = await createClient()

  const { edit: editId } = await searchParams

  const [{ data: profile }, { data: clients }] = await Promise.all([
    (supabase as any)
      .from('profiles')
      .select('name, firm_name, email, address, default_currency, default_vat_rate, tax_label')
      .eq('id', user.id)
      .single(),
    (supabase as any)
      .from('clients')
      .select('id, name, email, phone')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .order('name'),
  ])

  return (
    <NewInvoiceClient
      initialProfile={profile ?? null}
      initialClients={clients ?? []}
      editId={editId ?? null}
    />
  )
}
