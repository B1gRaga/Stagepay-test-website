import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { verifyPaymentToken } from '@/lib/dpo'

// DPO Pay calls this URL server-to-server after a successful payment.
// We verify the token with DPO, then upgrade the user's plan.
export async function POST(req: NextRequest) {
  let body: Record<string, string> = {}

  const contentType = req.headers.get('content-type') ?? ''
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text()
    body = Object.fromEntries(new URLSearchParams(text))
  } else {
    try { body = await req.json() } catch { /* ignore */ }
  }

  const transactionToken = body.TransactionToken ?? body.transactionToken

  if (!transactionToken) {
    return NextResponse.json({ error: 'Missing TransactionToken' }, { status: 400 })
  }

  const { success } = await verifyPaymentToken(transactionToken)
  if (!success) {
    return NextResponse.json({ error: 'Payment verification failed' }, { status: 400 })
  }

  // Look up the user who initiated this transaction server-side.
  // pending_plan was stored during checkout — never trust CompanyRef
  // from the request body, as it is attacker-controlled.
  const serviceClient = createServiceClient()
  const { data: profile } = await serviceClient
    .from('profiles')
    .select('id, pending_plan')
    .eq('dpo_transaction_ref', transactionToken)
    .single()

  if (!profile?.id || !profile?.pending_plan) {
    return NextResponse.json({ error: 'Unknown transaction' }, { status: 400 })
  }

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await serviceClient
    .from('profiles')
    .update({
      plan:                    profile.pending_plan,
      subscription_expires_at: expiresAt,
      pending_plan:            null,
    })
    .eq('id', profile.id)

  return NextResponse.json({ ok: true })
}
