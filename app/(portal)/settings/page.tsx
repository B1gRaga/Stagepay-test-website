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
  const [{ count: invoicesThisMonth }, { data: profile }, { data: ownTeam }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .gte('created_at', startOfMonth.toISOString()),
    supabase
      .from('profiles')
      .select('name, firm_name, email, phone, address, city, country, vat_number, logo_url, plan, default_currency, tax_label, default_vat_rate, two_fa_enabled, invoice_theme, brand_color_primary, brand_color_header, payment_methods, default_due_days, subscription_expires_at, team_id')
      .eq('id', user.id)
      .single(),
    supabase.from('teams').select('id').eq('owner_id', user.id).maybeSingle(),
  ])

  // Someone who joined another business's team sees that team's name instead of invite controls.
  let memberOf: string | null = null
  if (!ownTeam && profile?.team_id) {
    const { data: team } = await supabase.from('teams').select('name').eq('id', profile.team_id).maybeSingle()
    memberOf = team?.name || 'a team'
  }

  return (
    <Suspense>
      <SettingsClient initialProfile={profile ?? null} invoicesThisMonth={invoicesThisMonth ?? 0} memberOf={memberOf} />
    </Suspense>
  )
}
