// RealPay (realpay.co.za): cards, Instant EFT and debit orders, with an office
// in Gaborone. The provider StagePay moves to once it's registered with CIPA.
//
// Switched on with BILLING_PROVIDER=realpay once these are set in Vercel:
//   REALPAY_API_URL      base URL of the sandbox or live API, from RealPay's onboarding pack
//   REALPAY_API_KEY      the key RealPay issues for that environment
//   REALPAY_MERCHANT_ID  StagePay's merchant (client) id with RealPay
//
// Everything else about taking a payment is already in place: checkout,
// verify and the reconcile cron go through lib/billing/provider.ts and don't
// care who the provider is. The two calls below are the only part that depends
// on RealPay's API, which isn't published; they are filled in from the docs
// that come with the sandbox keys. Until then they throw, so a half-switched-on
// RealPay fails at checkout with a clear message instead of taking a payment
// StagePay can't confirm.
import type { PaymentProvider } from './provider'

const TTL_MINUTES = 30

const ENV = ['REALPAY_API_URL', 'REALPAY_API_KEY', 'REALPAY_MERCHANT_ID'] as const

export function realpayConfig() {
  const missing = ENV.filter(k => !process.env[k])
  if (missing.length) throw new Error(`RealPay isn’t set up: ${missing.join(', ')} not set`)
  return {
    url: process.env.REALPAY_API_URL!.replace(/\/$/, ''),
    key: process.env.REALPAY_API_KEY!,
    merchant: process.env.REALPAY_MERCHANT_ID!,
  }
}

export const realpay: PaymentProvider = {
  id: 'realpay',
  name: 'RealPay',
  where: 'South Africa',
  currencies: ['BWP', 'ZAR'],
  returnParam: 'ref',
  ttlMs: TTL_MINUTES * 60_000,

  // TODO(realpay): from RealPay's API docs — create the payment (amount,
  // currency, description) with the success URL
  // `${NEXT_PUBLIC_APP_URL}/api/billing/verify?ref=<their reference>` (ref is
  // returnParam below, how verify finds the pending payment) and the cancel URL
  // `${NEXT_PUBLIC_APP_URL}/settings?billing=cancelled`, and return
  // { ref: <their reference>, paymentUrl: <their hosted page> }.
  async createCheckout() {
    realpayConfig()
    throw new Error('RealPay checkout isn’t wired up yet (lib/billing/realpay.ts)')
  },

  // TODO(realpay): from RealPay's API docs — look the payment up by reference and
  // return { success: <paid in full>, detail: <their status> }. Check the amount
  // and currency they report against what checkout stored (pending_currency).
  async verify() {
    realpayConfig()
    throw new Error('RealPay verification isn’t wired up yet (lib/billing/realpay.ts)')
  },
}
