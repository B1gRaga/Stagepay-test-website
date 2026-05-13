import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import RemindersClient from '@/components/portal/RemindersClient'

export default async function RemindersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [{ data: invoices }, { data: reminders }, { data: profile }] = await Promise.all([
    (supabase as any)
      .from('invoices')
      .select('id, invoice_number, client_name, client_phone, client_email, project, due_date, total, currency, status')
      .eq('user_id', user.id)
      .in('status', ['sent', 'overdue'])
      .order('due_date'),
    (supabase as any)
      .from('reminders')
      .select('id, invoice_id, status, send_at, channel, sent_at')
      .eq('user_id', user.id),
    (supabase as any)
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
