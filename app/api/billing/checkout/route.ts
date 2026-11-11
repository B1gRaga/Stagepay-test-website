import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getAccount } from '@/lib/account'
import { activeProvider } from '@/lib/billing'
import { billingCurrencyFor, planCharge, type PaidPlan } from '@/lib/billing/pricing'
import { checkRateLimit } from '@/lib/rate-limit'
import { PERIODS, type Months } from '@/lib/plans'

const VALID_PLANS: PaidPlan[] = ['pro', 'business']

export async function POST(req: NextRequest) {
  const account = await getAccount()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (account.accountId !== account.userId) {
    return NextResponse.json({ error: 'Only the business owner can change the plan' }, { status: 403 })
  }

  if (!(await checkRateLimit(`billing:${account.userId}`, 5, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const plan = body.plan as string
  if (!VALID_PLANS.includes(plan as PaidPlan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  // How many months this payment covers; older clients send none, which means one
  const months = (body.months ?? 1) as Months
  if (!PERIODS.some(p => p.months === months)) {
    return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 })
  }

  try {
    const provider = activeProvider()
    // Service client: plan, pending_* and the payment reference aren't readable
    // or writable by the authenticated role (migrations 009/033).
    const serviceClient = createServiceClient()

    // Charged in the currency the business invoices in, when the provider takes
    // it and there's a price list for it; otherwise in Pula.
    const { data: profile } = await serviceClient
      .from('profiles')
      .select('default_currency')
      .eq('id', account.userId)
      .single()
    const currency = billingCurrencyFor(profile?.default_currency, provider.currencies)
    const charge = planCharge(plan as PaidPlan, months, currency)

    const { ref, paymentUrl } = await provider.createCheckout({ userId: account.userId, plan: plan as PaidPlan, months, ...charge })

    // Store the pending reference, plan, period, provider and currency server-side
    // so verify and the reconcile cron read them from the DB rather than trusting
    // anything in the URL the customer comes back with.
    const { error } = await serviceClient
      .from('profiles')
      .update({
        dpo_transaction_ref: ref,
        pending_plan: plan,
        pending_months: months,
        pending_provider: provider.id,
        pending_currency: currency,
        dpo_token_created_at: new Date().toISOString(),
      })
      .eq('id', account.userId)
    // Without the reference stored, a payment could never be confirmed, so don't
    // send the customer off to pay.
    if (error) throw new Error('Couldn’t save the payment reference. Please try again.')

    return NextResponse.json({ paymentUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment initiation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
