import { redirect } from 'next/navigation'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { isWhatsAppConfigured } from '@/lib/whatsapp'
import RemindersClient from '@/components/portal/RemindersClient'

export default async function RemindersPage() {
  const user = await getCachedUser()
  if (!user) redirect('/auth/login')

  const supabase = await createClient()
  const [{ data: invoices }, { data: reminders }, { data: profile }] = await Promise.all([
    (supabase )
      .from('invoices')
      .select('id, invoice_number, client_name, client_phone, client_email, project, due_date, total, currency, status, public_token')
      .eq('user_id', user.id)
      .in('status', ['sent', 'overdue'])
      .order('due_date'),
    (supabase )
      .from('reminders')
      .select('id, invoice_id, status, send_at, channel, sent_at, days_after_due, error_message')
      .eq('user_id', user.id),
    (supabase )
      .from('profiles')
      .select('firm_name, name, whatsapp_reminders_enabled, default_currency')
      .eq('id', user.id)
      .single(),
  ])

  const firmName = profile?.firm_name || profile?.name || 'Your Firm'

  return (
    <RemindersClient
      initialInvoices={invoices ?? []}
      initialReminders={reminders ?? []}
      firmName={firmName}
      currency={profile?.default_currency || 'P'}
      initialWaOn={profile?.whatsapp_reminders_enabled ?? false}
      waConfigured={isWhatsAppConfigured()}
    />
  )
}
