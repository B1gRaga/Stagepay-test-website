import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { getAccount, accountProfileClient } from '@/lib/account'
import { SettingsClient, type BillingView } from '@/components/portal/SettingsClient'
import { startOfMonthUtc } from '@/lib/plans'
import { activeProvider } from '@/lib/billing'
import { billingCurrencyFor, BILLING_CURRENCIES } from '@/lib/billing/pricing'

export default async function SettingsPage() {
  const account = await getAccount()
  if (!account) redirect('/auth/login')

  const supabase = await createClient()
  const profileDb = await accountProfileClient(account)
  // Same count the free-plan limit uses: invoices created since the 1st.
  const [{ count: invoicesThisMonth }, { data: profile }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', account.accountId)
      .gte('created_at', startOfMonthUtc()),
    // The business's settings: the person's own, or their team's.
    profileDb
      .from('profiles')
      .select('name, firm_name, email, phone, address, city, country, vat_number, logo_url, plan, default_currency, tax_label, default_vat_rate, two_fa_enabled, invoice_theme, brand_color_primary, brand_color_header, payment_methods, default_due_days, subscription_expires_at, team_id, invoice_paper_size, business_type')
      .eq('id', account.accountId)
      .single(),
  ])

  // What Plan & billing shows: the same currency and provider checkout will use.
  const provider = activeProvider()
  const currency = billingCurrencyFor(profile?.default_currency, provider.currencies)
  const billing: BillingView = { currency, symbol: BILLING_CURRENCIES[currency].symbol, currencyName: BILLING_CURRENCIES[currency].name, provider: provider.name }

  return (
    <Suspense>
      <SettingsClient initialProfile={profile ?? null} invoicesThisMonth={invoicesThisMonth ?? 0} role={account.role} billing={billing} />
    </Suspense>
  )
}
