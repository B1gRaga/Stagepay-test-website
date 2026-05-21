import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import RemindersClient from '@/components/portal/RemindersClient'

export default async function RemindersPage() {
  const user = await getCachedUser()
  if (!user) redirect('/auth/login')

  const supabase = await createClient()
  const [{ data: invoices }, { data: reminders }, { data: profile }] = await Promise.all([
    (supabase )
      .from('invoices')
      .select('id, invoice_number, client_name, client_phone, client_email, project, due_date, total, currency, status')
      .eq('user_id', user.id)
      .in('status', ['sent', 'overdue'])
      .order('due_date'),
    (supabase )
      .from('reminders')
      .select('id, invoice_id, status, send_at, channel, sent_at')
      .eq('user_id', user.id),
    (supabase )
      .from('profiles')
      .select('firm_name, name, whatsapp_reminders_enabled')
      .eq('id', user.id)
      .single(),
  ])

  const firmName = profile?.firm_name || profile?.name || 'Your Firm'

  return (
    <RemindersClient
      initialInvoices={invoices ?? []}
      initialReminders={reminders ?? []}
      firmName={firmName}
      initialWaOn={profile?.whatsapp_reminders_enabled ?? false}
    />
  )
}
