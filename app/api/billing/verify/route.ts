import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { verifyPaymentToken } from '@/lib/dpo'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// DPO Pay redirects the user's browser here after payment.
// We verify the token, upgrade the plan, then redirect to settings.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const transactionToken = searchParams.get('TransactionToken')

  if (!transactionToken) {
    return NextResponse.redirect(`${APP_URL}/settings?billing=failed&reason=no_token`)
  }

  const supabase = await createClient() as any
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/auth/login`)
  }

  const { success } = await verifyPaymentToken(transactionToken)
  if (!success) {
    return NextResponse.redirect(`${APP_URL}/settings?billing=failed&reason=verification_failed`)
  }

  // Read the plan from the server-side pending_plan column set during checkout.
  // Never parse plan from CompanyRef — that URL param is attacker-controlled.
  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('pending_plan')
    .eq('id', user.id)
    .eq('dpo_transaction_ref', transactionToken)
    .single()

  if (!profile?.pending_plan) {
    return NextResponse.redirect(`${APP_URL}/settings?billing=failed&reason=no_pending_plan`)
  }

  const plan = profile.pending_plan
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await serviceClient
    .from('profiles')
    .update({
      plan,
      subscription_expires_at: expiresAt,
      pending_plan:            null,
    })
    .eq('id', user.id)

  return NextResponse.redirect(`${APP_URL}/settings?billing=success&plan=${plan}`)
}
