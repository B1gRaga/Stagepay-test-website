import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { log, logError, cronitorPing } from '@/lib/logger'

export const runtime = 'nodejs'
export const maxDuration = 60

// Called by Vercel Cron daily — protected by CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
  const start = Date.now()
  await cronitorPing('recurring-invoices', 'run')
  const supabase = createServiceClient()
  const today    = new Date().toISOString().split('T')[0]

  // Find all recurring invoice templates that are due for generation
  const { data: templates, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(description, quantity, unit_price, sort_order)')
    .eq('is_recurring', true)
    .lte('next_recurring_date', today)
    .limit(100)

  if (error) {
    logError('cron.recurring.fetch_failed', error)
    await cronitorPing('recurring-invoices', 'fail')
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!templates?.length) {
    log('cron.recurring.none_due')
    await cronitorPing('recurring-invoices', 'complete')
    return NextResponse.json({ generated: 0, message: 'No recurring invoices due' })
  }

  let generated = 0
  let failed    = 0

  for (const tmpl of templates) {
    try {
      // Generate invoice number via service-role RPC
      const { data: invoiceNumber, error: numErr } = await supabase
        .rpc('next_invoice_number', { p_user_id: tmpl.user_id })

      if (numErr || !invoiceNumber) {
        throw new Error('Failed to generate invoice number: ' + (numErr?.message ?? 'unknown'))
      }

      // New issue date = today; preserve original payment terms length
      const issueDate = today
      const termsDays = tmpl.due_date && tmpl.issue_date
        ? Math.round((new Date(tmpl.due_date).getTime() - new Date(tmpl.issue_date).getTime()) / 86400000)
        : 30
      const dueDate   = new Date(today)
      dueDate.setDate(dueDate.getDate() + termsDays)

      // Advance the template's next_recurring_date by the interval
      const nextBase = new Date(tmpl.next_recurring_date!)
      if (tmpl.recurrence_interval === 'monthly')        nextBase.setMonth(nextBase.getMonth() + 1)
      else if (tmpl.recurrence_interval === 'quarterly') nextBase.setMonth(nextBase.getMonth() + 3)
      else                                               nextBase.setFullYear(nextBase.getFullYear() + 1)

      // Create the new draft invoice (not recurring — the template stays as the source)
      const { data: newInv, error: invErr } = await supabase
        .from('invoices')
        .insert({
          user_id:        tmpl.user_id,
          invoice_number: invoiceNumber,
          status:         'draft',
          client_id:      tmpl.client_id,
          client_name:    tmpl.client_name,
          client_email:   tmpl.client_email,
          client_phone:   tmpl.client_phone,
          client_address: tmpl.client_address,
          client_vat:     tmpl.client_vat,
          project:        tmpl.project,
          notes:          tmpl.notes,
          issue_date:     issueDate,
          due_date:       dueDate.toISOString().split('T')[0],
          subtotal:       tmpl.subtotal,
          vat_rate:       tmpl.vat_rate,
          vat_amount:     tmpl.vat_amount,
          discount_amount: tmpl.discount_amount ?? 0,
          deposit_amount: tmpl.deposit_amount,
          total:          tmpl.total,
          currency:       tmpl.currency,
          is_recurring:   false,
        })
        .select()
        .single()

      if (invErr) throw new Error('Failed to create invoice: ' + invErr.message)

      // Copy line items
      if (tmpl.invoice_items?.length) {
        const { error: itemsErr } = await supabase.from('invoice_items').insert(
          tmpl.invoice_items.map((it: any) => ({
            invoice_id:  newInv.id,
            user_id:     tmpl.user_id,
            description: it.description,
            quantity:    it.quantity,
            unit_price:  it.unit_price,
            sort_order:  it.sort_order,
          }))
        )
        if (itemsErr) throw new Error('Failed to copy line items: ' + itemsErr.message)
      }

      // Advance the template's schedule
      await supabase
        .from('invoices')
        .update({ next_recurring_date: nextBase.toISOString().split('T')[0] })
        .eq('id', tmpl.id)

      generated++
    } catch (err: any) {
      logError('cron.recurring.template_failed', err, { templateId: tmpl.id })
      failed++
    }
  }

  log('cron.recurring.complete', { generated, failed, durationMs: Date.now() - start })
  await cronitorPing('recurring-invoices', failed > 0 && generated === 0 ? 'fail' : 'complete')
  return NextResponse.json({ generated, failed })
  } catch (err: any) {
    logError('cron.recurring.unhandled', err)
    await cronitorPing('recurring-invoices', 'fail')
    return NextResponse.json({ error: 'Unexpected error' }, { status: 500 })
  }
}
