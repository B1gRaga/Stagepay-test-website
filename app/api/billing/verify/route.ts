import { NextRequest, NextResponse } from 'next/server'
import { getCachedUser, createServiceClient } from '@/lib/supabase/server'
import { providerById, returnedRef, confirmPlanUpgrade } from '@/lib/billing'
import type { PaidPlan } from '@/lib/billing/pricing'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// The payment provider sends the customer's browser here after payment.
// We look up the pending payment, confirm it with the provider that started
// it, upgrade the plan, then redirect to settings.
export async function GET(req: NextRequest) {
  const ref = returnedRef(req.nextUrl.searchParams)
  if (!ref) {
    return NextResponse.redirect(`${APP_URL}/settings?billing=failed&reason=no_token`)
  }

  const user = await getCachedUser()
  if (!user) {
    return NextResponse.redirect(`${APP_URL}/auth/login`)
  }

  // The plan and provider come from the pending_* columns checkout wrote, never
  // from the URL: it's the customer's browser that brings us here.
  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('pending_plan, pending_provider')
    .eq('id', user.id)
    .eq('dpo_transaction_ref', ref)
    .single()

  if (!profile?.pending_plan) {
    return NextResponse.redirect(`${APP_URL}/settings?billing=failed&reason=no_pending_plan`)
  }

  const { success } = await providerById(profile.pending_provider).verify(ref)
  if (!success) {
    return NextResponse.redirect(`${APP_URL}/settings?billing=failed&reason=verification_failed`)
  }

  const plan = profile.pending_plan as PaidPlan
  await confirmPlanUpgrade(serviceClient, user.id, plan, ref)

  return NextResponse.redirect(`${APP_URL}/settings?billing=success&plan=${plan}`)
}
