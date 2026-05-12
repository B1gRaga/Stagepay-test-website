import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/portal/SidebarNav'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('name, firm_name, plan')
    .eq('id', user.id)
    .single()

  const displayName = profile?.firm_name || profile?.name || user.email!.split('@')[0]

  return (
    <>
      {/* Restores theme before first paint — prevents flash */}
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('stagepay-theme');if(t==='light')document.documentElement.setAttribute('data-theme','light')}catch(e){}})()` }} />
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
        <SidebarNav displayName={displayName} userEmail={user.email!} plan={profile?.plan ?? 'free'} />
        <main style={{ flex: 1, minWidth: 0, overflow: 'auto', paddingBottom: '80px' }}>
          {children}
        </main>
      </div>
    </>
  )
}
