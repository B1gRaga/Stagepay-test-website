import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/portal/SidebarNav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('name, firm_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.firm_name || profile?.name || user.email!.split('@')[0]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <SidebarNav displayName={displayName} userEmail={user.email!} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto', paddingBottom: '80px' }}>
        {children}
      </main>
    </div>
  )
}
