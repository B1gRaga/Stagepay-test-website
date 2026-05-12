import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { createPaymentToken, type DpoPlan } from '@/lib/dpo'
import { checkRateLimit } from '@/lib/rate-limit'

const VALID_PLANS: DpoPlan[] = ['pro', 'business']

export async function POST(req: NextRequest) {
  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await checkRateLimit(`billing:${user.id}`, 5, 60_000))) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const plan = body.plan as string
  if (!VALID_PLANS.includes(plan as DpoPlan)) {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
  }

  try {
    const { token, paymentUrl } = await createPaymentToken(user.id, plan as DpoPlan)

    // Store the pending token AND plan server-side so verify/callback
    // can read the plan from the DB rather than trusting CompanyRef.
    // Uses service client because plan/pending_plan are sensitive columns
    // not writable by the authenticated role after migration 009.
    const serviceClient = createServiceClient()
    await serviceClient
      .from('profiles')
      .update({ dpo_transaction_ref: token, pending_plan: plan })
      .eq('id', user.id)

    return NextResponse.json({ paymentUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Payment initiation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
