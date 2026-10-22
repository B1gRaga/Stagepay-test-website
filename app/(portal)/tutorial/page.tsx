import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccount, accountProfileClient } from '@/lib/account'
import { GettingStarted } from '@/components/portal/GettingStarted'

export default async function TutorialPage() {
  const account = await getAccount()
  if (!account) redirect('/auth/login')
  const supabase = await createClient()
  const profileDb = await accountProfileClient(account)

  const count = (q: any) => q.then((r: { count: number | null }) => r.count ?? 0)
  const mine = () => supabase.from('invoices').select('id', { count: 'exact', head: true }).eq('user_id', account.accountId)
  const [{ data: p }, invoices, sent, paid, reminders] = await Promise.all([
    profileDb.from('profiles').select('firm_name, phone, address, payment_methods, logo_url').eq('id', account.accountId).single(),
    count(mine()),
    count(mine().neq('status', 'draft')),
    count(mine().eq('status', 'paid')),
    count(supabase.from('reminders').select('id', { count: 'exact', head: true }).eq('user_id', account.accountId)),
  ])

  return (
    <GettingStarted progress={{
      hasDetails: !!p?.firm_name && !!(p?.phone || p?.address),
      hasPayment: Array.isArray(p?.payment_methods) && p.payment_methods.length > 0,
      hasLogo: !!p?.logo_url,
      invoices, sent, paid, reminders,
    }} />
  )
}
