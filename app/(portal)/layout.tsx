import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SidebarNav from '@/components/portal/SidebarNav'
import SupportBtn from '@/components/portal/SupportBtn'
import PullToRefresh from '@/components/portal/PullToRefresh'

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
          display:flex;align-items:center;justify-content:center;
          transition:opacity .55s cubic-bezier(.4,0,.2,1),visibility .55s;
        }
        html[data-theme="light"] #sp-splash{background:#F1F5F9;}
        #sp-splash.sp-out{opacity:0;visibility:hidden;}
        .sp-inner{display:flex;flex-direction:column;align-items:center;margin-top:-24px;}
        .sp-bar{transform-box:fill-box;transform-origin:50% 100%;}
        .sp-b1{animation:sp-rise .52s cubic-bezier(.34,1.56,.64,1) .02s both;}
        .sp-b2{animation:sp-rise .52s cubic-bezier(.34,1.56,.64,1) .12s both;}
        .sp-b3{animation:sp-rise .52s cubic-bezier(.34,1.56,.64,1) .22s both;}
        .sp-b4{animation:sp-rise .52s cubic-bezier(.34,1.56,.64,1) .32s both;}
        .sp-baseline{animation:sp-appear .25s ease .5s both;}
        .sp-word{
          font-family:var(--font-bebas),sans-serif;font-size:34px;
          letter-spacing:9px;color:#F8FAFC;margin:28px 0 6px;
          animation:sp-up .45s ease .62s both;
        }
        html[data-theme="light"] .sp-word{color:#0F172A;}
        .sp-word em{color:#10B981;font-style:normal;}
        .sp-tag{
          font-family:var(--font-archivo),sans-serif;font-size:10px;
          letter-spacing:.2em;text-transform:uppercase;
          color:rgba(248,250,252,.28);
          animation:sp-up .38s ease .78s both;
        }
        html[data-theme="light"] .sp-tag{color:rgba(15,23,42,.32);}
        .sp-progress{
          position:fixed;bottom:0;left:0;right:0;height:2px;
          background:rgba(16,185,129,0.07);overflow:hidden;
          animation:sp-appear .2s ease .18s both;
        }
        .sp-progress-fill{
          height:100%;width:100%;
          background:linear-gradient(90deg,#059669 0%,#10B981 55%,#34d399 100%);
          transform-origin:left;transform:scaleX(0);
          animation:sp-prog 1.45s cubic-bezier(.4,0,.2,1) .22s forwards;
        }
        @keyframes sp-appear{from{opacity:0}to{opacity:1}}
        @keyframes sp-up{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sp-rise{
          0%{transform:scaleY(0);opacity:0}
          45%{opacity:1}
          70%{transform:scaleY(1.11)}
          86%{transform:scaleY(0.96)}
          100%{transform:scaleY(1)}
        }
        @keyframes sp-prog{to{transform:scaleX(1);}}
        @media(min-width:769px){#sp-splash{display:none;}}
      `}</style>

      {/* Mobile splash — bars rise left-to-right with spring bounce */}
      <div id="sp-splash" aria-hidden="true">
        <div className="sp-inner">
          <svg width="148" height="148" viewBox="0 0 64 64" fill="none"
            style={{ filter: 'drop-shadow(0 0 18px rgba(16,185,129,0.5))' }}>
            <defs>
              <linearGradient id="sp-bg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399"/>
                <stop offset="100%" stopColor="#059669"/>
              </linearGradient>
            </defs>
            <rect className="sp-bar sp-b1" x="4"  y="38" width="11" height="18" rx="2" fill="url(#sp-bg)" opacity=".5"/>
            <rect className="sp-bar sp-b2" x="18" y="28" width="11" height="28" rx="2" fill="url(#sp-bg)" opacity=".68"/>
            <rect className="sp-bar sp-b3" x="32" y="18" width="11" height="38" rx="2" fill="url(#sp-bg)" opacity=".84"/>
            <rect className="sp-bar sp-b4" x="46" y="7"  width="11" height="49" rx="2" fill="url(#sp-bg)"/>
            <rect className="sp-baseline"  x="3"  y="57" width="58" height="1.5" rx=".75" fill="rgba(16,185,129,0.35)"/>
          </svg>
          <div className="sp-word">STAGE<em>PAY</em></div>
          <div className="sp-tag">Invoice · Send · Get paid</div>
        </div>
        <div className="sp-progress"><div className="sp-progress-fill"/></div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `(function(){function hide(){var el=document.getElementById('sp-splash');if(!el)return;el.classList.add('sp-out');setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},550);}setTimeout(hide,1500);})()` }} />

      <div style={{ display: 'flex', height: '100dvh', background: 'var(--bg)', overflow: 'hidden' }}>
        <SidebarNav displayName={displayName} userEmail={user.email!} plan={profile?.plan ?? 'free'} />
        <PullToRefresh>{children}</PullToRefresh>
      </div>
      <SupportBtn />
    </>
  )
}
