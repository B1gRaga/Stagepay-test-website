import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getCachedProfile, createClient } from '@/lib/supabase/server'
import { getAccount, listBusinesses } from '@/lib/account'
import { TEAMS_ENABLED } from '@/lib/teams'
import SidebarNav from '@/components/portal/SidebarNav'
import SupportBtn from '@/components/portal/SupportBtn'
import PullToRefresh from '@/components/portal/PullToRefresh'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Middleware has already verified auth and forwarded the identity.
  const h = await headers()
  const userEmail = h.get('x-user-email') ?? ''
  const account = await getAccount()
  if (!account) redirect('/auth/login')

  const supabase = await createClient()
  // The sidebar shows the business being worked in; first-time setup is the person's own.
  const [profile, own, { count: overdueCount }, businesses] = await Promise.all([
    getCachedProfile(account.accountId),
    getCachedProfile(account.userId),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', account.accountId)
      .eq('status', 'overdue'),
    TEAMS_ENABLED ? listBusinesses(account.userId) : Promise.resolve([]),
  ])

  const displayName = profile?.firm_name || profile?.name || userEmail.split('@')[0]

  // First-time users: send to onboarding to pick business type.
  // /onboarding is outside the (portal) group so there is no redirect loop.
  if (own && !own.business_type) {
    redirect('/onboarding')
  }

  return (
    <>
      <style>{`
        .portal-main{flex:1;min-width:0;overflow-y:auto;padding-bottom:0;overscroll-behavior-y:contain;}
        @media(max-width:768px){
          .portal-main{
            padding-top:calc(44px + env(safe-area-inset-top,0px));
            padding-bottom:calc(56px + env(safe-area-inset-bottom,0px));
          }
          /* Prevent iOS auto-zoom on input focus (inputs < 16px trigger zoom) */
          input,select,textarea{font-size:max(16px,1em) !important;}
        }

      `}</style>

      <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', overflowX: 'hidden' }}>
        <SidebarNav displayName={displayName} userEmail={userEmail} plan={profile?.plan ?? 'free'} overdueCt={overdueCount ?? 0} businesses={businesses} currentAccountId={account.accountId} role={account.role} />
        <PullToRefresh>{children}</PullToRefresh>
      </div>
      <SupportBtn />
    </>
  )
}
