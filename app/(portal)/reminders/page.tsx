import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getAccount, accountProfileClient } from '@/lib/account'
import { isWhatsAppConfigured } from '@/lib/whatsapp'
import RemindersClient from '@/components/portal/RemindersClient'

export default async function RemindersPage() {
  const account = await getAccount()
  if (!account) redirect('/auth/login')

  const supabase = await createClient()
  const profileDb = await accountProfileClient(account)
  const [{ data: invoices }, { data: reminders }, { data: profile }] = await Promise.all([
    (supabase )
      .from('invoices')
      .select('id, invoice_number, client_name, client_phone, client_email, project, due_date, total, currency, status, public_token')
      .eq('user_id', account.accountId)
      .in('status', ['sent', 'overdue'])
      .order('due_date'),
    (supabase )
      .from('reminders')
      .select('id, invoice_id, status, send_at, channel, sent_at, days_after_due, error_message')
      .eq('user_id', account.accountId),
    profileDb
      .from('profiles')
      .select('firm_name, name, whatsapp_reminders_enabled, default_currency, reminder_days')
      .eq('id', account.accountId)
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
      initialDays={profile?.reminder_days ?? undefined}
      waConfigured={isWhatsAppConfigured()}
    />
  )
}
