import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getAccount, accountProfileClient } from '@/lib/account'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendWhatsApp, isWhatsAppConfigured, barePhone, whatsAppErrorText } from '@/lib/whatsapp'
import { scheduleRemindersOnSend } from '@/lib/reminder-schedule'
import { canBulkSend } from '@/lib/plans'
import { maintenanceOn, MAINTENANCE_MESSAGE } from '@/lib/maintenance'
import { balanceDue } from '@/lib/payments'
import { dayMonthYear } from '@/lib/format-date'
import { billedForLabel } from '@/lib/billed-for'
import { log, logError } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

// POST /api/invoices/bulk-send  { invoice_ids: string[] }
//
// "Send the whole class on WhatsApp": each draft goes out from StagePay's own
// WhatsApp number through the Cloud API, using the approved invoice template
// (WHATSAPP_INVOICE_TEMPLATE), with a "View invoice" button to the public page.
//
// What it guards against, in order:
//  - Business plan only: every message costs StagePay money.
//  - Only drafts with a WhatsApp number go; sent, paid and cancelled are skipped.
//  - Each invoice is claimed draft→sent in one conditional update before the
//    message goes, so two taps (or two people) can't send it twice. A failed
//    send puts it back to draft.
//  - Meta caps how many *new* numbers StagePay's number may message in 24h
//    (WHATSAPP_DAILY_RECIPIENTS, 250 on the starting tier). Numbers messaged in
//    the last 24h don't count again. Some room is kept for tonight's reminders.
//  - At most MAX_IDS per call and a time budget under Vercel's 60s, so a big
//    class is sent in a few calls from the browser, with progress.
//  - Every message gets an invoice_sends row (Meta's id included) so the
//    delivery webhook can mark it delivered / read / failed.

const MAX_IDS      = 25
const CONCURRENCY  = 5
const DEADLINE_MS  = 45_000

export type BulkOutcome = 'sent' | 'skipped' | 'failed'
export type BulkResult = { id: string; number: string | null; client: string | null; outcome: BulkOutcome; reason?: string }

type Inv = {
  id: string; invoice_number: string; status: string; client_name: string; client_phone: string | null
  total: number; currency: string | null; due_date: string | null; public_token: string | null
  billed_for: string | null; project: string | null; invoice_payments: { amount: number }[] | null
}

export function dailyCap() {
  const cap = Number(process.env.WHATSAPP_DAILY_RECIPIENTS ?? 250)
  const reserve = Number(process.env.WHATSAPP_RESERVED_FOR_REMINDERS ?? 25)
  return { cap: Number.isFinite(cap) && cap > 0 ? cap : 250, reserve: Number.isFinite(reserve) && reserve >= 0 ? reserve : 25 }
}

export async function POST(req: NextRequest) {
  if (maintenanceOn()) return NextResponse.json({ error: MAINTENANCE_MESSAGE }, { status: 503 })
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let ids: string[]
  try {
    const body = await req.json()
    ids = Array.isArray(body?.invoice_ids) ? [...new Set(body.invoice_ids.filter((x: unknown) => typeof x === 'string'))] as string[] : []
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }
  if (!ids.length) return NextResponse.json({ error: 'invoice_ids is required' }, { status: 400 })
  if (ids.length > MAX_IDS) return NextResponse.json({ error: `Send at most ${MAX_IDS} invoices per request` }, { status: 400 })

  // 60 calls an hour per account: up to 1,500 messages, which no school needs
  // in an hour, and a runaway script can't burn through the number's standing.
  if (!(await checkRateLimit(`bulk-send:${account.accountId}`, 60, 3_600_000))) {
    return NextResponse.json({ error: 'Too many requests. Please wait a few minutes and try again.' }, { status: 429 })
  }

  const { data: profile } = await (await accountProfileClient(account))
    .from('profiles').select('plan, firm_name, name, business_type').eq('id', account.accountId).single()
  if (!canBulkSend(profile?.plan)) {
    return NextResponse.json({ error: 'Sending a whole class on WhatsApp comes with the Business plan.', upgrade: true }, { status: 403 })
  }

  const templateName = process.env.WHATSAPP_INVOICE_TEMPLATE
  if (!isWhatsAppConfigured() || !templateName) {
    return NextResponse.json({ error: 'Sending a class on WhatsApp isn’t switched on yet. Each invoice can still be sent from its page.' }, { status: 503 })
  }

  const supabase = await createClient()
  const { data: rows, error: fetchErr } = await supabase
    .from('invoices')
    .select('id, invoice_number, status, client_name, client_phone, total, currency, due_date, public_token, billed_for, project, invoice_payments(amount)')
    .in('id', ids)
    .eq('user_id', account.accountId)
  if (fetchErr) return NextResponse.json({ error: 'Could not load the invoices' }, { status: 500 })
  const byId = new Map<string, Inv>((rows ?? []).map(r => [r.id, r as unknown as Inv]))

  const svc = createServiceClient()
  const senderName = profile?.firm_name || profile?.name || 'Your service provider'
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const forLabel = billedForLabel(profile?.business_type)

  // Numbers StagePay's WhatsApp number already reached in the last 24h, across
  // every account: they share the number, and Meta's cap is per number.
  const since = new Date(Date.now() - 24 * 3_600_000).toISOString()
  const [{ data: recentSends }, { data: recentReminders }] = await Promise.all([
    svc.from('invoice_sends').select('recipient').eq('channel', 'whatsapp').neq('status', 'failed').gte('created_at', since).limit(5000),
    svc.from('reminders').select('recipient_phone').eq('channel', 'whatsapp').eq('status', 'sent').gte('sent_at', since).limit(5000),
  ])
  const reached = new Set<string>()
  for (const r of recentSends ?? []) if (r.recipient) reached.add(r.recipient)
  for (const r of recentReminders ?? []) if (r.recipient_phone) reached.add(barePhone(r.recipient_phone))
  const { cap, reserve } = dailyCap()
  const room = () => cap - reserve - reached.size

  const batchId = crypto.randomUUID()
  const start = Date.now()
  const results: BulkResult[] = []
  let capReached = false

  async function sendOne(id: string): Promise<BulkResult> {
    const inv = byId.get(id)
    if (!inv) return { id, number: null, client: null, outcome: 'failed', reason: 'Not found' }
    const base = { id, number: inv.invoice_number, client: inv.client_name }
    if (inv.status !== 'draft') return { ...base, outcome: 'skipped', reason: inv.status === 'paid' ? 'Already paid' : inv.status === 'cancelled' ? 'Cancelled' : 'Already sent' }
    const phone = barePhone(inv.client_phone || '')
    if (phone.length < 7) return { ...base, outcome: 'skipped', reason: 'No WhatsApp number' }
    if (Date.now() - start > DEADLINE_MS) return { ...base, outcome: 'skipped', reason: 'Ran out of time; try again' }
    // A number reached in the last 24h can still be messaged once the cap is hit; a new one can't.
    if (!reached.has(phone)) {
      if (capReached || room() <= 0) { capReached = true; return { ...base, outcome: 'skipped', reason: 'Daily WhatsApp limit reached' } }
      reached.add(phone)
    }

    // Claim it: only one caller can move a draft to sent.
    const now = new Date().toISOString()
    const { data: claimed } = await svc.from('invoices')
      .update({ status: 'sent', sent_at: now, sent_via: 'whatsapp' })
      .eq('id', id).eq('user_id', account!.accountId).eq('status', 'draft')
      .select('id')
    if (!claimed?.length) return { ...base, outcome: 'skipped', reason: 'Already sent' }

    const { data: sendRow } = await svc.from('invoice_sends')
      .insert({ invoice_id: id, user_id: account!.accountId, channel: 'whatsapp', recipient: phone, status: 'queued', batch_id: batchId, created_by: account!.userId })
      .select('id').single()

    const sym    = inv.currency || 'P'
    const amount = `${sym}${balanceDue(inv.total, inv.invoice_payments).toLocaleString('en', { minimumFractionDigits: 2 })}`
    const due    = inv.due_date ? dayMonthYear(inv.due_date) : 'on receipt'
    const about  = [inv.billed_for ? `${forLabel}: ${inv.billed_for}` : '', inv.project || ''].filter(Boolean).join(' · ') || 'see the invoice for details'
    const link   = appUrl && inv.public_token ? `${appUrl}/invoice/${inv.public_token}` : appUrl
    try {
      const res = await sendWhatsApp(phone, {
        text: `Hello from ${senderName} 👋\n\nInvoice ${inv.invoice_number} for ${amount} is ready (${about}). It is due ${due}.\n\nView it here: ${link}\n\nThank you!`,
        template: { name: templateName!, params: [senderName, inv.invoice_number, amount, about, due], buttonParams: inv.public_token ? [inv.public_token] : undefined },
      })
      const messageId = res?.messages?.[0]?.id ?? null
      if (sendRow?.id) await svc.from('invoice_sends').update({ status: 'sent', provider_message_id: messageId, updated_at: new Date().toISOString() }).eq('id', sendRow.id)
      await scheduleRemindersOnSend(account!.accountId, id, account!.userId)
      return { ...base, outcome: 'sent' }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      // Back to draft, so it can be sent again or from the person's own phone.
      await svc.from('invoices').update({ status: 'draft', sent_at: null, sent_via: null }).eq('id', id).eq('status', 'sent')
      if (sendRow?.id) await svc.from('invoice_sends').update({ status: 'failed', error: msg.slice(0, 500), updated_at: new Date().toISOString() }).eq('id', sendRow.id)
      reached.delete(phone)
      logError('invoices.bulk_send.failed', err, { invoiceId: id, batchId })
      return { ...base, outcome: 'failed', reason: whatsAppErrorText(msg) }
    }
  }

  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const chunk = ids.slice(i, i + CONCURRENCY)
    results.push(...await Promise.all(chunk.map(sendOne)))
  }

  const sent = results.filter(r => r.outcome === 'sent').length
  log('invoices.bulk_send', { batchId, asked: ids.length, sent, skipped: results.filter(r => r.outcome === 'skipped').length, failed: results.filter(r => r.outcome === 'failed').length, capReached })
  return NextResponse.json({ results, sent, capReached, left: Math.max(0, room()) })
}
