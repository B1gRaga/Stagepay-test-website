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
          .portal-main{
            padding-top:calc(44px + env(safe-area-inset-top,0px));
            padding-bottom:calc(56px + env(safe-area-inset-bottom,0px));
          }
        }

        /* ── Mobile splash screen ── */
        #sp-splash{
          position:fixed;inset:0;z-index:9999;
          background:#0C1424;
          display:flex;align-items:center;justify-content:center;
          transition:opacity .5s ease,visibility .5s;
        }
        html[data-theme="light"] #sp-splash{background:#F8FAFC;}
        #sp-splash.sp-out{opacity:0;visibility:hidden;}
        .sp-inner{display:flex;flex-direction:column;align-items:center;}
        .sp-bar{transform-box:fill-box;transform-origin:50% 100%;}
        .sp-b4{animation:sp-appear .35s ease both;}
        .sp-b3{animation:sp-s3 .65s cubic-bezier(.34,1.56,.64,1) .08s both;}
        .sp-b2{animation:sp-s2 .65s cubic-bezier(.34,1.56,.64,1) .16s both;}
        .sp-b1{animation:sp-s1 .65s cubic-bezier(.34,1.56,.64,1) .24s both;}
        .sp-baseline{animation:sp-appear .3s ease .4s both;}
        .sp-word{
          font-family:'Bebas Neue',sans-serif;font-size:28px;
          letter-spacing:6px;color:#F8FAFC;margin:22px 0 5px;
          animation:sp-up .4s ease .55s both;
        }
        html[data-theme="light"] .sp-word{color:#0F172A;}
        .sp-word em{color:#10B981;font-style:normal;}
        .sp-tag{
          font-family:'Archivo',sans-serif;font-size:10px;
          letter-spacing:.18em;text-transform:uppercase;
          color:rgba(248,250,252,.22);
          animation:sp-up .35s ease .72s both;
        }
        html[data-theme="light"] .sp-tag{color:rgba(15,23,42,.3);}
        @keyframes sp-appear{from{opacity:0}to{opacity:1}}
        @keyframes sp-up{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes sp-s3{0%{transform:scaleY(1.29)}60%{transform:scaleY(.94)}80%{transform:scaleY(1.03)}100%{transform:scaleY(1)}}
        @keyframes sp-s2{0%{transform:scaleY(1.75)}60%{transform:scaleY(.91)}80%{transform:scaleY(1.04)}100%{transform:scaleY(1)}}
        @keyframes sp-s1{0%{transform:scaleY(2.72)}60%{transform:scaleY(.88)}80%{transform:scaleY(1.06)}100%{transform:scaleY(1)}}
        @media(min-width:769px){#sp-splash{display:none;}}
      `}</style>

      {/* Mobile splash — bars settle from equal height to correct heights */}
      <div id="sp-splash" aria-hidden="true">
        <div className="sp-inner">
          <svg width="110" height="110" viewBox="0 0 64 64" fill="none">
            <rect className="sp-bar sp-b4" x="46" y="7"  width="10" height="49" rx="2" fill="#10B981"/>
            <rect className="sp-bar sp-b3" x="32" y="18" width="11" height="38" rx="2" fill="#10B981" opacity=".82"/>
            <rect className="sp-bar sp-b2" x="18" y="28" width="11" height="28" rx="2" fill="#10B981" opacity=".65"/>
            <rect className="sp-bar sp-b1" x="4"  y="38" width="11" height="18" rx="2" fill="#10B981" opacity=".48"/>
            <rect className="sp-baseline"  x="3"  y="57" width="58" height="1.5" rx=".75" fill="rgba(16,185,129,0.25)"/>
          </svg>
          <div className="sp-word">STAGE<em>PAY</em></div>
          <div className="sp-tag">Invoice · Send · Get paid</div>
        </div>
      </div>
      <script dangerouslySetInnerHTML={{ __html: `(function(){function hide(){var el=document.getElementById('sp-splash');if(!el)return;el.classList.add('sp-out');setTimeout(function(){if(el.parentNode)el.parentNode.removeChild(el);},550);}setTimeout(hide,1500);})()` }} />

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
