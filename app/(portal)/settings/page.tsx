import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/portal/SettingsClient'

export default async function SettingsPage() {
  const user = await getCachedUser()
  if (!user) redirect('/auth/login')

  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, firm_name, email, phone, address, city, country, vat_number, logo_url, plan, default_currency, tax_label, default_vat_rate, two_fa_enabled, invoice_theme, brand_color_primary, brand_color_header')
    .eq('id', user.id)
    .single()

  return (
    <Suspense>
      <SettingsClient initialProfile={profile ?? null} />
    </Suspense>
  )
}
