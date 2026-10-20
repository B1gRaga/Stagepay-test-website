import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/portal/SettingsClient'

export default async function SettingsPage() {
  const user = await getCachedUser()
  if (!user) redirect('/auth/login')

  const supabase = await createClient()
  // Same count the free-plan limit uses: invoices created since the 1st.
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const { count: invoicesThisMonth } = await supabase
    .from('invoices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', startOfMonth.toISOString())

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, firm_name, email, phone, address, city, country, vat_number, logo_url, plan, default_currency, tax_label, default_vat_rate, two_fa_enabled, invoice_theme, brand_color_primary, brand_color_header, payment_methods, default_due_days, subscription_expires_at')
    .eq('id', user.id)
    .single()

  return (
    <Suspense>
      <SettingsClient initialProfile={profile ?? null} invoicesThisMonth={invoicesThisMonth ?? 0} />
    </Suspense>
  )
}
