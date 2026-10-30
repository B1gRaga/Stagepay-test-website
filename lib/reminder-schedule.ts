import { createServiceClient } from '@/lib/supabase/server'
import { isWhatsAppConfigured } from '@/lib/whatsapp'
import { cleanReminderDays, DEFAULT_REMINDER_DAYS } from '@/lib/reminder-days'

type Planned = {
  channel: 'email' | 'whatsapp'
  days_after_due: number
  send_at: string
  recipient_email: string | null
  recipient_phone: string | null
}

// The reminders an invoice gets the moment it's sent: one per chosen day, on
// each channel the client can be reached by. They go out at 08:00 in Gaborone
// (06:00 UTC) on the day; days already past are skipped, so an invoice sent
// after its due date isn't chased several times at once.
export function plannedReminders(
  inv: { due_date: string | null; client_email: string | null; client_phone: string | null },
  days: number[],
  opts: { whatsapp: boolean; now?: Date },
): Planned[] {
  if (!inv.due_date) return []
  const now = opts.now ?? new Date()
  const channels: Planned['channel'][] = []
  if (inv.client_email?.trim()) channels.push('email')
  if (opts.whatsapp && inv.client_phone?.trim()) channels.push('whatsapp')
  const [y, m, d] = inv.due_date.slice(0, 10).split('-').map(Number)
  const out: Planned[] = []
  for (const day of days) {
    const at = new Date(Date.UTC(y, m - 1, d + day, 6))
    if (at <= now) continue
    for (const channel of channels) out.push({
      channel,
      days_after_due: day,
      send_at: at.toISOString(),
      recipient_email: channel === 'email' ? inv.client_email : null,
      recipient_phone: channel === 'whatsapp' ? inv.client_phone : null,
    })
  }
  return out
}

// Called once an invoice moves from draft to sent. Never throws: sending the
// invoice has already happened, and the Reminders page can still switch Auto on.
// Does nothing if the invoice already has reminders, so a second send can't double them.
export async function scheduleRemindersOnSend(accountId: string, invoiceId: string, createdBy?: string) {
  try {
    const sb = createServiceClient()
    const [{ data: inv }, { data: profile }, { count }] = await Promise.all([
      sb.from('invoices').select('id, status, due_date, client_email, client_phone').eq('id', invoiceId).eq('user_id', accountId).single(),
      sb.from('profiles').select('reminder_days, whatsapp_reminders_enabled').eq('id', accountId).single(),
      sb.from('reminders').select('id', { count: 'exact', head: true }).eq('invoice_id', invoiceId),
    ])
    if (!inv || (inv.status !== 'sent' && inv.status !== 'overdue') || (count ?? 0) > 0) return 0
    const days = cleanReminderDays(profile?.reminder_days) ?? DEFAULT_REMINDER_DAYS
    const rows = plannedReminders(inv, days, { whatsapp: isWhatsAppConfigured() && !!profile?.whatsapp_reminders_enabled })
    if (!rows.length) return 0
    const { error } = await sb.from('reminders').insert(rows.map(r => ({
      ...r, user_id: accountId, invoice_id: invoiceId, status: 'scheduled' as const, created_by: createdBy ?? null,
    })))
    if (error) { console.error('[Reminders] scheduling on send failed:', error.message); return 0 }
    return rows.length
  } catch (err) {
    console.error('[Reminders] scheduling on send failed:', err instanceof Error ? err.message : err)
    return 0
  }
}
