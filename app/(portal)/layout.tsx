import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/portal/SidebarNav'
import SupportBtn from '@/components/portal/SupportBtn'

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
      <style>{`
        .portal-main{flex:1;min-width:0;overflow-y:auto;padding-bottom:0;}
        @media(max-width:768px){
          .portal-main{padding-bottom:calc(56px + env(safe-area-inset-bottom,0px));}
        }
      `}</style>
      <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
        <SidebarNav displayName={displayName} userEmail={user.email!} plan={profile?.plan ?? 'free'} />
        <main className="portal-main">
          {children}
        </main>
      </div>
      <SupportBtn />
    </>
  )
}
