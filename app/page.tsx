'use client'

import { useEffect } from 'react'
import { ThemeToggle } from '@/components/ui/curtain-theme-toggle'

export default function Home() {
  useEffect(() => {
    const reveals = document.querySelectorAll<HTMLElement>('.reveal')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target) }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' })
    reveals.forEach(el => obs.observe(el))

    const inputs = document.querySelectorAll<HTMLInputElement>('input[type=email]')
    const onKeydown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') handleSignup((e.target as HTMLInputElement).id)
    }
    inputs.forEach(inp => inp.addEventListener('keydown', onKeydown))

    return () => {
      obs.disconnect()
      inputs.forEach(inp => inp.removeEventListener('keydown', onKeydown))
    }
  }, [])

  function handleSignup(inputId: string) {
    const input = document.getElementById(inputId) as HTMLInputElement | null
    const email = input ? input.value.trim() : ''
    if (!email || !email.includes('@')) {
      if (input) {
        input.focus()
        input.style.borderColor = '#EF4444'
        setTimeout(() => { input.style.borderColor = '' }, 1500)
      }
      return
    }
    if (typeof window !== 'undefined' && typeof (window as unknown as Window & { gtag?: Function }).gtag === 'function') {
      (window as unknown as Window & { gtag: Function }).gtag('event', 'sign_up', { method: 'landing_page', email_domain: email.split('@')[1] })
    }
    showToast()
    if (input) input.value = ''
    setTimeout(() => { window.location.href = '/auth/signup' }, 1800)
  }

  function showToast() {
    const t = document.getElementById('toast') as HTMLElement | null
    if (!t) return
    t.style.opacity = '1'
    t.style.transform = 'translateX(-50%) translateY(0)'
    setTimeout(() => {
      t.style.opacity = '0'
      t.style.transform = 'translateX(-50%) translateY(20px)'
    }, 3000)
  }

  const ck = <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>
  const xk = <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l10 10M13 3L3 13"/></svg>

  const stagepayLogo = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '36px' }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
          <rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/>
          <rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/>
          <rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/>
          <rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/>
        </svg>
        <span style={{ fontFamily: 'var(--font-bebas), sans-serif', fontSize: '22px', letterSpacing: '3px', color: 'inherit' }}>
          Stage<span style={{ color: '#10B981' }}>Pay</span>
        </span>
      </a>
      <div className="nav-links" style={{ marginLeft: 0 }}>
        <a href="#how" style={{ color: 'inherit', opacity: 0.6 }}>How it works</a>
        <a href="#features" style={{ color: 'inherit', opacity: 0.6 }}>Features</a>
        <a href="#pricing" style={{ color: 'inherit', opacity: 0.6 }}>Pricing</a>
      </div>
    </div>
  )

  const navRight = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <a href="/auth/login" style={{ fontSize: '13px', color: 'inherit', opacity: 0.6, textDecoration: 'none' }} className="nav-sign-in">Sign in</a>
      <a href="/auth/signup" style={{ padding: '8px 20px', borderRadius: '8px', background: '#10B981', color: '#060A12', fontSize: '13px', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>Try it free →</a>
    </div>
  )

  return (
    <ThemeToggle
      variant="appbar"
      defaultTheme="dark"
      barHeight={60}
      duration={600}
      appBarProps={{ logo: stagepayLogo, userAvatar: navRight }}
    >
      {/* ANNOUNCE BAR */}
      <div className="announce">
        <span className="announce-dot"></span>
        <strong>Early Access:</strong> First 100 users get <strong>1 month of Pro free</strong> — no credit card needed.
      </div>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="#10B981"><circle cx="5" cy="5" r="5"/></svg>
              The modern way to get paid
            </div>
            <h1 className="hero-h1">
              Describe your work.<br/>We send the invoice<br/>on <em>WhatsApp</em>.
            </h1>
            <p className="hero-sub">
              AI builds a professional invoice from plain text, sends it to your client&apos;s WhatsApp, and follows up automatically until you&apos;re paid.
            </p>
            <div className="signup-box">
              <div className="signup-box-label">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>
                First 100 users get Pro free for 1 month
              </div>
              <div className="form-row">
                <input type="email" id="heroEmail" className="form-input" placeholder="your@email.com"/>
                <button className="btn-signup" onClick={() => handleSignup('heroEmail')}>
                  Get started free
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
                </button>
              </div>
              <div className="form-trust">
                <span>✓ No credit card</span>
                <span className="form-trust-div">·</span>
                <span>✓ No setup needed</span>
                <span className="form-trust-div">·</span>
                <span>✓ Your data stays private</span>
              </div>
            </div>
          </div>

          <div className="hero-right">
            <div className="mock-wrap hero-mock-float">
              <div className="mock-bar">
                <div className="mock-dot" style={{background:'#EF4444'}}></div>
                <div className="mock-dot" style={{background:'#F59E0B'}}></div>
                <div className="mock-dot" style={{background:'#10B981'}}></div>
                <span className="mock-url">stagepay.co.bw/invoice/INV-202605-015</span>
              </div>
              <div className="mock-body">
                <div className="mock-head">
                  <div>
                    <div className="mock-brand">
                      <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/><rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/><rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/><rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/></svg>
                      Yugen Studios
                    </div>
                    <div className="mock-meta">Maun, Botswana · Professional Services</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className="mock-inv-badge">INVOICE</div>
                    <div className="mock-meta" style={{marginTop:'6px'}}>INV-202605-015 · 20 May 2026</div>
                  </div>
                </div>
                <div className="mock-parties">
                  <div>
                    <div className="mock-lbl">Bill to</div>
                    <div className="mock-nm">Kefilwe Mokobi</div>
                    <div className="mock-detail">May tuition fees</div>
                  </div>
                  <div>
                    <div className="mock-lbl">Due date</div>
                    <div className="mock-nm">03 Jun 2026</div>
                    <div className="mock-detail">Due on Receipt</div>
                  </div>
                </div>
                <table className="mock-tbl">
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th style={{textAlign:'right'}}>Qty</th>
                      <th style={{textAlign:'right'}}>Rate</th>
                      <th style={{textAlign:'right'}}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Mathematics</td>
                      <td style={{textAlign:'right'}}>1</td>
                      <td style={{textAlign:'right'}}>P300</td>
                      <td style={{textAlign:'right'}}>P300</td>
                    </tr>
                    <tr>
                      <td>Science Double Award</td>
                      <td style={{textAlign:'right'}}>1</td>
                      <td style={{textAlign:'right'}}>P500</td>
                      <td style={{textAlign:'right'}}>P500</td>
                    </tr>
                    <tr>
                      <td>English</td>
                      <td style={{textAlign:'right'}}>1</td>
                      <td style={{textAlign:'right'}}>P300</td>
                      <td style={{textAlign:'right'}}>P300</td>
                    </tr>
                    <tr>
                      <td>Registration fee</td>
                      <td style={{textAlign:'right'}}>1</td>
                      <td style={{textAlign:'right'}}>P150</td>
                      <td style={{textAlign:'right'}}>P150</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mock-subtotals">
                  <div className="mock-sub-row"><span>Subtotal</span><span>P1,250</span></div>
                  <div className="mock-sub-row vat"><span>VAT (14%)</span><span>P175</span></div>
                </div>
                <div className="mock-total-bar">
                  <span className="mock-total-lbl">Total Due</span>
                  <span className="mock-total-val">P1,425</span>
                </div>
                <div className="mock-actions">
                  <div className="mock-btn">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Download PDF
                  </div>
                  <div className="mock-btn mock-btn-wa">
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="#25D366"><path d="M8 0C3.582 0 0 3.582 0 8c0 1.4.367 2.715 1.007 3.853L0 16l4.247-1.108A7.96 7.96 0 008 16c4.418 0 8-3.582 8-8S12.418 0 8 0zm4.078 11.248c-.172.484-1.003.932-1.374.99-.353.054-.8.077-1.29-.08a11.7 11.7 0 01-1.167-.44c-2.051-.889-3.39-2.965-3.493-3.103-.102-.138-.83-1.106-.83-2.11 0-1.003.525-1.497.712-1.7.186-.204.406-.255.541-.255.135 0 .271 0 .39.007.125.007.293-.047.458.35.169.403.574 1.394.624 1.496.05.102.084.221.017.356-.067.135-.1.22-.2.338l-.289.34c-.101.101-.207.21-.09.41.118.203.522.861 1.122 1.393.77.69 1.42.9 1.62.999.2.098.317.082.434-.05.118-.13.504-.591.638-.794.134-.204.268-.17.45-.102.184.068 1.165.553 1.365.654.2.1.334.15.384.234.05.084.05.486-.122.97z"/></svg>
                    Send via WhatsApp
                  </div>
                </div>
              </div>
            </div>
            <div className="ai-bubble">
              <div className="ai-bubble-label">AI Prompt Used</div>
              <div className="ai-bubble-text">&quot;Invoice Kefilwe Mokobi for May tuition — Maths P300, Science Double Award P500, English P300, and registration fee P150.&quot;</div>
              <div className="ai-bubble-tag">
                <span className="ai-status"></span>
                Generated in 4 seconds
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <div className="how-bg">
        <div className="sec" id="how">
          <div className="sec-inner">
            <div className="sec-head reveal">
              <div className="sec-tag">How it works</div>
              <h2 className="sec-h2">Three steps to <em>getting paid.</em></h2>
              <p className="sec-p">No templates. No training. Just describe the work.</p>
            </div>
            <div className="how-grid reveal">
              <div className="how-step">
                <div className="how-num">01</div>
                <div className="how-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M12 2l-2 7H3l6 4-2 7 5-4 5 4-2-7 6-4h-7z"/></svg></div>
                <div className="how-title">Describe your work</div>
                <div className="how-desc">Type who, what, how many hours, at what rate. Plain English — no forms, no templates.</div>
              </div>
              <div className="how-step">
                <div className="how-num">02</div>
                <div className="how-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
                <div className="how-title">AI builds the invoice</div>
                <div className="how-desc">Client, line items, VAT and deposit extracted automatically. Edit anything before sending.</div>
              </div>
              <div className="how-step">
                <div className="how-num">03</div>
                <div className="how-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg></div>
                <div className="how-title">Send via WhatsApp &amp; get paid</div>
                <div className="how-desc">Invoice goes straight to your client&apos;s WhatsApp. Smart reminders follow up automatically on overdue payments.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FEATURES */}
      <div className="feat-bg" id="features">
        <div className="sec">
          <div className="sec-inner">
            <div className="sec-head reveal">
              <div className="sec-tag">Features</div>
              <h2 className="sec-h2">Everything you need<br/>to <em>get paid faster.</em></h2>
              <p className="sec-p">Mobile-first, WhatsApp-native, AI-powered from day one.</p>
            </div>
            <div className="feat-grid reveal">
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M12 2l-2 7H3l6 4-2 7 5-4 5 4-2-7 6-4h-7z"/></svg></div>
                <div className="feat-title">AI Invoice Generation</div>
                <div className="feat-desc">Describe the job in plain language — AI extracts client, items and VAT in seconds.</div>
                <span className="feat-tag">Core feature</span>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 16 16" fill="#10B981" opacity=".9"><path d="M8 0C3.582 0 0 3.582 0 8c0 1.4.367 2.715 1.007 3.853L0 16l4.247-1.108A7.96 7.96 0 008 16c4.418 0 8-3.582 8-8S12.418 0 8 0zm4.078 11.248c-.172.484-1.003.932-1.374.99-.353.054-.8.077-1.29-.08a11.7 11.7 0 01-1.167-.44c-2.051-.889-3.39-2.965-3.493-3.103-.102-.138-.83-1.106-.83-2.11 0-1.003.525-1.497.712-1.7.186-.204.406-.255.541-.255.135 0 .271 0 .39.007.125.007.293-.047.458.35.169.403.574 1.394.624 1.496.05.102.084.221.017.356-.067.135-.1.22-.2.338l-.289.34c-.101.101-.207.21-.09.41.118.203.522.861 1.122 1.393.77.69 1.42.9 1.62.999.2.098.317.082.434-.05.118-.13.504-.591.638-.794.134-.204.268-.17.45-.102.184.068 1.165.553 1.365.654.2.1.334.15.384.234.05.084.05.486-.122.97z"/></svg></div>
                <div className="feat-title">WhatsApp Delivery</div>
                <div className="feat-desc">Invoices land in your client&apos;s WhatsApp. They open them. They pay them.</div>
                <span className="feat-tag">The differentiator</span>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
                <div className="feat-title">Automatic Reminders</div>
                <div className="feat-desc">Follow-ups at 3, 7, 14 and 30 days via WhatsApp — you never have to chase again.</div>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div>
                <div className="feat-title">PDF Export</div>
                <div className="feat-desc">Branded PDF with your firm name, bank details and payment terms — one click.</div>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M2 9h6"/></svg></div>
                <div className="feat-title">Deposit &amp; Discount Billing</div>
                <div className="feat-desc">Partial deposits and discounts shown as clear line items on every invoice.</div>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 01-4 4H3"/></svg></div>
                <div className="feat-title">Recurring Invoices</div>
                <div className="feat-desc">Set it once — StagePay generates monthly, quarterly or yearly invoices automatically.</div>
                <span className="feat-tag">New</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WHO IT'S FOR */}
      <div className="how-bg">
        <div className="sec">
          <div className="sec-inner">
            <div className="sec-head reveal" style={{maxWidth:'100%',marginBottom:32}}>
              <div className="sec-tag">Built for</div>
              <h2 className="sec-h2">Anyone who charges<br/>for their <em>work.</em></h2>
            </div>
            <div className="who-strip reveal">
              {[
                {icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.6"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>, title:'Architects & Engineers', desc:'Phase billing, site inspections, technical reports'},
                {icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.6"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>, title:'Freelancers', desc:'Quick invoices, no admin overhead'},
                {icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.6"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3-3a1 1 0 000-1.4l-1.6-1.6a1 1 0 00-1.4 0l-3 3z"/><path d="M5 22v-5l9-9"/></svg>, title:'Contractors', desc:'Labour, materials, milestones, retainers'},
                {icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.6"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, title:'Small Businesses', desc:'Professional invoices for every job'},
                {icon:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.6"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>, title:'Tuition Centres', desc:'Monthly tuition fees, session tracking, recurring invoices'},
              ].map((w, i) => (
                <div key={i} className="who-tile">
                  <div className="who-tile-icon">{w.icon}</div>
                  <div className="who-tile-title">{w.title}</div>
                  <div className="who-tile-desc">{w.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* PRICING */}
      <div className="sec" id="pricing">
        <div className="sec-inner">
          <div className="sec-head reveal text-center mx-auto">
            <div className="sec-tag">Pricing</div>
            <h2 className="sec-h2">Simple. <em>Transparent.</em></h2>
            <p className="sec-p">Start free. Upgrade when you&apos;re ready. No surprises.</p>
          </div>
          <div className="price-grid reveal mx-auto">
            <div className="price-card">
              <div className="price-tier">Starter</div>
              <div className="price-amt">Free</div>
              <div className="price-bill">Forever · no card required</div>
              <div className="price-divider"></div>
              <div className="price-list">
                <div className="pf">{ck}5 invoices / month</div>
                <div className="pf">{ck}AI generation (5/mo)</div>
                <div className="pf">{ck}PDF export</div>
                <div className="pf">{ck}Client address book</div>
                <div className="pf off">{xk}Auto-reminders</div>
                <div className="pf off">{xk}WhatsApp delivery</div>
              </div>
              <button className="price-btn price-btn-out" onClick={() => window.location.href='/auth/signup'}>Create my first invoice</button>
            </div>
            <div className="price-card pop">
              <div className="pop-badge">Most Popular</div>
              <div className="price-tier">Pro</div>
              <div className="price-amt">P200<span>/mo</span></div>
              <div className="price-bill">Cancel anytime</div>
              <div className="price-divider"></div>
              <div className="price-list">
                <div className="pf">{ck}Unlimited invoices</div>
                <div className="pf">{ck}Unlimited AI generation</div>
                <div className="pf">{ck}WhatsApp delivery</div>
                <div className="pf">{ck}Auto-reminders</div>
                <div className="pf">{ck}Client address book</div>
                <div className="pf">{ck}Deposit billing</div>
                <div className="pf">{ck}Custom branding</div>
              </div>
              <button className="price-btn price-btn-main" onClick={() => window.location.href='/auth/signup'}>Start invoicing in seconds</button>
            </div>
            <div className="price-card" style={{opacity:0.7}}>
              <div className="pop-badge" style={{background:'rgba(100,116,139,0.15)',color:'#94A3B8',border:'1px solid rgba(100,116,139,0.3)'}}>Coming Soon</div>
              <div className="price-tier">Business</div>
              <div className="price-amt">P500<span>/mo</span></div>
              <div className="price-bill">Team access · billed monthly</div>
              <div className="price-divider"></div>
              <div className="price-list">
                <div className="pf">{ck}Unlimited invoices</div>
                <div className="pf">{ck}Unlimited AI generation</div>
                <div className="pf">{ck}WhatsApp delivery</div>
                <div className="pf">{ck}Auto-reminders</div>
                <div className="pf">{ck}Client address book</div>
                <div className="pf">{ck}Deposit billing</div>
                <div className="pf">{ck}Custom branding</div>
                <div className="pf">{ck}5 team members</div>
                <div className="pf">{ck}Analytics dashboard</div>
                <div className="pf">{ck}Priority support</div>
                <div className="pf">{ck}API access</div>
              </div>
              <button className="price-btn price-btn-out" style={{opacity:0.5,cursor:'not-allowed'}} disabled>Coming soon</button>
            </div>
          </div>
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="final-cta">
        <div className="final-cta-orb"></div>
        <div className="final-cta-inner reveal">
          <div className="final-cta-tag">
            <span style={{width:'6px',height:'6px',borderRadius:'50%',background:'#10B981',display:'inline-block'}}></span>
            Early Access · First 100 Users
          </div>
          <h2 className="final-cta-h">The modern way<br/>to get <em>paid.</em></h2>
          <p className="final-cta-p">First 100 users get <strong>Pro free for 1 month</strong> — no credit card needed.</p>
          <div className="final-form">
            <input type="email" id="finalEmail" className="final-form-input" placeholder="your@email.com"/>
            <button className="btn-signup" onClick={() => handleSignup('finalEmail')}>Get started free →</button>
          </div>
          <div className="final-trust">
            <span>✓ First 100 get Pro free</span>
            <span>·</span>
            <span>✓ No credit card</span>
            <span>·</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer>
        <div className="foot-inner">
          <a href="#" className="foot-logo">
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/>
              <rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/>
              <rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/>
              <rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/>
            </svg>
            <span className="foot-wordmark">Stage<em>Pay</em></span>
          </a>
          <div className="foot-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
          <div className="foot-copy">© 2026 StagePay · Built for African professionals</div>
        </div>
      </footer>

      {/* TOAST */}
      <div id="toast" style={{position:'fixed',bottom:'80px',left:'50%',transform:'translateX(-50%) translateY(20px)',background:'#131B2E',border:'1px solid rgba(16,185,129,.3)',color:'#F0F4F8',padding:'14px 24px',borderRadius:'10px',fontSize:'14px',fontWeight:600,boxShadow:'0 8px 32px rgba(0,0,0,.4)',opacity:0,transition:'opacity .3s,transform .3s',zIndex:400,whiteSpace:'nowrap',pointerEvents:'none'}}>
        ✓ You&apos;re on the list! Redirecting to the app…
      </div>
    </ThemeToggle>
  )
}
