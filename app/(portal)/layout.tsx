import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getCachedProfile, createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/portal/SidebarNav'
import SupportBtn from '@/components/portal/SupportBtn'
import PullToRefresh from '@/components/portal/PullToRefresh'

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // Middleware has already verified auth and forwarded the identity.
  // Reading from headers is synchronous (no network call).
  const h = await headers()
  const userId = h.get('x-user-id')
  const userEmail = h.get('x-user-email') ?? ''
  if (!userId) redirect('/auth/login')

  const supabase = await createClient()
  const [profile, { count: overdueCount }] = await Promise.all([
    getCachedProfile(userId),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'overdue'),
  ])

  const displayName = profile?.firm_name || profile?.name || userEmail.split('@')[0]

  // First-time users: send to onboarding to pick business type.
  // /onboarding is outside the (portal) group so there is no redirect loop.
  if (profile && !profile.business_type) {
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

        /* ── Mobile splash screen ── */
        #sp-splash{
          position:fixed;inset:0;z-index:9999;
          background:#0C1424;
          display:flex;align-items:center;justify-content:center;flex-direction:column;
          transition:opacity .5s ease,visibility .5s;
        }
        html[data-theme="light"] #sp-splash{background:#f3ede1;}
        #sp-splash.sp-out{opacity:0;visibility:hidden;}
        .sp-inner{display:flex;flex-direction:column;align-items:center;gap:22px;margin-top:-20px;}
        /* Bars — start reversed (descending L→R), settle to ascending L→R */
        .sp-bars{display:flex;align-items:flex-end;gap:5px;height:56px;filter:drop-shadow(0 0 16px rgba(16,185,129,.45));}
        .sp-bar{border-radius:3px 3px 2px 2px;background:linear-gradient(to bottom,#34d399,#059669);}
        .sp-b1{width:11px;animation:spB1 .5s cubic-bezier(.34,1.56,.64,1) .12s both;}
        .sp-b2{width:11px;opacity:.82;animation:spB2 .5s cubic-bezier(.34,1.56,.64,1) .06s both;}
        .sp-b3{width:11px;opacity:.65;animation:spB3 .5s cubic-bezier(.34,1.56,.64,1) .02s both;}
        .sp-b4{width:10px;opacity:.48;animation:spB4 .5s cubic-bezier(.34,1.56,.64,1) 0s   both;}
        @keyframes spB1{from{height:56px}to{height:26px}}
        @keyframes spB2{from{height:46px}to{height:36px}}
        @keyframes spB3{from{height:36px}to{height:46px}}
        @keyframes spB4{from{height:26px}to{height:56px}}
        .sp-word{
          font-family:var(--font-bebas),sans-serif;font-size:34px;
          letter-spacing:9px;color:#F8FAFC;
          animation:sp-up .3s ease .52s both;
        }
        html[data-theme="light"] .sp-word{color:#0F172A;}
        .sp-word em{color:#10B981;font-style:normal;}
        .sp-tag{
          font-family:var(--font-archivo),sans-serif;font-size:10px;
          letter-spacing:.2em;text-transform:uppercase;
          color:rgba(248,250,252,.28);margin-top:-16px;
          animation:sp-up .3s ease .62s both;
        }
        html[data-theme="light"] .sp-tag{color:rgba(15,23,42,.32);}
        .sp-progress{
          position:fixed;bottom:0;left:0;right:0;height:2px;
          background:rgba(16,185,129,0.07);overflow:hidden;
          animation:sp-appear .2s ease .1s both;
        }
        .sp-progress-fill{
          height:100%;width:100%;
          background:linear-gradient(90deg,#059669 0%,#10B981 55%,#34d399 100%);
          transform-origin:left;transform:scaleX(0);
          animation:sp-prog .9s cubic-bezier(.4,0,.2,1) .1s forwards;
        }
        @keyframes sp-appear{from{opacity:0}to{opacity:1}}
        @keyframes sp-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sp-prog{to{transform:scaleX(1);}}
        @media(min-width:769px){#sp-splash{display:none;}}
      `}</style>

      {/* Mobile splash — bars reorganise from reversed to correct order, then settle */}
      <div id="sp-splash" aria-hidden="true">
        <div className="sp-inner">
          <div className="sp-bars">
            <div className="sp-bar sp-b1" />
            <div className="sp-bar sp-b2" />
            <div className="sp-bar sp-b3" />
            <div className="sp-bar sp-b4" />
          </div>
          <div className="sp-word">STAGE<em>PAY</em></div>
          <div className="sp-tag">Invoice · Send · Get paid</div>
        </div>
        <div className="sp-progress"><div className="sp-progress-fill"/></div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `(function(){function hide(){var el=document.getElementById('sp-splash');if(!el)return;el.classList.add('sp-out');setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},520);}setTimeout(hide,1000);})()` }} />

      <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
        <SidebarNav displayName={displayName} userEmail={userEmail} plan={profile?.plan ?? 'free'} overdueCt={overdueCount ?? 0} />
        <PullToRefresh>{children}</PullToRefresh>
      </div>
      <SupportBtn />
    </>
  )
}
