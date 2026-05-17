import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

// Called by Vercel Cron daily — protected by CRON_SECRET
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient() as any
  const today    = new Date().toISOString().split('T')[0]

  // Find all recurring invoice templates that are due for generation
  const { data: templates, error } = await supabase
    .from('invoices')
    .select('*, invoice_items(description, quantity, unit_price, sort_order)')
    .eq('is_recurring', true)
    .lte('next_recurring_date', today)
    .limit(100)

  if (error) {
    console.error('[Cron/Recurring] Failed to fetch templates:', error.message)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  if (!templates?.length) {
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
      const nextBase = new Date(tmpl.next_recurring_date)
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
        await supabase.from('invoice_items').insert(
          tmpl.invoice_items.map((it: any) => ({
            invoice_id:  newInv.id,
            user_id:     tmpl.user_id,
            description: it.description,
            quantity:    it.quantity,
            unit_price:  it.unit_price,
            sort_order:  it.sort_order,
          }))
        )
      }

      // Advance the template's schedule
      await supabase
        .from('invoices')
        .update({ next_recurring_date: nextBase.toISOString().split('T')[0] })
        .eq('id', tmpl.id)

      generated++
    } catch (err: any) {
      console.error(`[Cron/Recurring] Template ${tmpl.id} failed:`, err.message)
      failed++
    }
  }

  console.log(`[Cron/Recurring] Generated: ${generated}, Failed: ${failed}`)
  return NextResponse.json({ generated, failed })
}
