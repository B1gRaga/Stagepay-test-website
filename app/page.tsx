'use client'
import { useEffect } from 'react'

export default function LandingPage() {
  useEffect(() => {
    let lastScroll = 0
    const nav = document.getElementById('nav')
    const onScroll = () => {
      const y = window.scrollY
      if (nav) nav.classList.toggle('hide', y > lastScroll && y > 100)
      lastScroll = y
    }
    window.addEventListener('scroll', onScroll, { passive: true })

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); obs.unobserve(e.target) } })
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' })
    document.querySelectorAll('.r').forEach(el => obs.observe(el))

    buildBackgroundPaths()

    return () => {
      window.removeEventListener('scroll', onScroll)
      obs.disconnect()
    }
  }, [])

  return (
    <>
      <nav id="nav">
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
              <rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/>
              <rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/>
              <rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/>
              <rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/>
            </svg>
            <span className="nav-wordmark">Stage<em>Pay</em></span>
          </a>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#who">Who it&apos;s for</a>
            <a href="#how">How it works</a>
            <a href="#pricing">Pricing</a>
          </div>
          <div className="nav-right">
            <a href="/app" className="nav-btn nav-btn-ghost">Sign in</a>
            <a href="/app" className="nav-btn nav-btn-solid">Start free</a>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-bg">
          <div className="fp-layer" id="fp-pos"></div>
          <div className="fp-layer" id="fp-neg"></div>
          <div className="hero-grid"></div>
          <div className="hero-orb hero-orb-1"></div>
          <div className="hero-orb hero-orb-2"></div>
          <div className="hero-orb hero-orb-3"></div>
        </div>
        <div className="hero-content">
          <div className="hero-badge"><span className="hero-badge-dot"></span>AI-powered invoicing</div>
          <h1 className="hero-h1">
            <span className="line"><span>Invoice like a</span></span>
            <span className="line"><span><em>professional.</em></span></span>
          </h1>
          <p className="hero-sub">Describe your work in plain English. AI builds the invoice. Reminders chase the payment. You focus on what you do best.</p>
          <div className="hero-actions">
            <a href="/app" className="btn-hero btn-primary">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 8l5 5 7-7"/></svg>
              Start for free
            </a>
            <a href="#how" className="btn-hero btn-ghost">See how it works</a>
          </div>
          <div className="hero-trust">
            <span className="trust-item"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>No credit card</span>
            <span className="trust-item"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>Free plan forever</span>
            <span className="trust-item"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>40+ countries</span>
          </div>
        </div>
        <div className="showcase">
          <div className="mock-frame">
            <div className="mock-ribbon">AI Generated</div>
            <div className="mock-bar">
              <div className="mock-dot" style={{background:"#EF4444"}}></div>
              <div className="mock-dot" style={{background:"#F59E0B"}}></div>
              <div className="mock-dot" style={{background:"#10B981"}}></div>
              <span className="mock-url">stagepay.app/invoice/INV-055</span>
            </div>
            <div className="mock-body">
              <div className="mock-header">
                <div>
                  <div className="mock-co">
                    <svg width="14" height="14" viewBox="0 0 32 32" fill="none">
                      <rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/>
                      <rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/>
                      <rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/>
                      <rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/>
                    </svg>
                    Kgosi Engineering
                  </div>
                  <div className="mock-meta">Gaborone, Botswana</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="mock-inv-label">INVOICE</div>
                  <div className="mock-meta">INV-055 · 22 Apr 2026</div>
                </div>
              </div>
              <div className="mock-ft">
                <div><div className="mock-lbl">Bill to</div><div className="mock-nm">Molapo Tower Ltd.</div><div className="mock-dt">Gaborone CBD</div></div>
                <div><div className="mock-lbl">Project</div><div className="mock-nm">Phase 2 — Structural Review</div><div className="mock-dt">Due: 22 May 2026</div></div>
              </div>
              <table className="mock-tbl">
                <thead><tr><th>Description</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                <tbody>
                  <tr><td>Structural engineering review</td><td style={{textAlign:"right"}}>40</td><td style={{textAlign:"right"}}>P950</td><td style={{textAlign:"right"}}>P38,000</td></tr>
                  <tr><td>Site inspection (3 visits)</td><td style={{textAlign:"right"}}>3</td><td style={{textAlign:"right"}}>P800</td><td style={{textAlign:"right"}}>P2,400</td></tr>
                  <tr><td>Technical report &amp; drawings</td><td style={{textAlign:"right"}}>1</td><td style={{textAlign:"right"}}>P5,600</td><td style={{textAlign:"right"}}>P5,600</td></tr>
                </tbody>
              </table>
              <div className="mock-sub-row"><span>Subtotal</span><span>P46,000</span></div>
              <div className="mock-sub-row"><span>VAT (14%)</span><span>P6,440</span></div>
              <div className="mock-total"><span className="mock-total-lbl">Total Due</span><span className="mock-total-val">P52,440</span></div>
            </div>
          </div>
        </div>
        <div className="scroll-hint"><span className="scroll-hint-text">Scroll</span><div className="scroll-line"></div></div>
      </section>

      <div className="ticker">
        <div className="ticker-track">
          {['Botswana 14% VAT','South Africa 15% VAT','Kenya 16% VAT','Nigeria 7.5% VAT','UAE 5% VAT','United Kingdom 20% VAT','Germany 19% MwSt','Australia 10% GST','India 18% GST','Singapore 9% GST','Canada 5% GST','Zambia 16% VAT','Namibia 15% VAT','Botswana 14% VAT','South Africa 15% VAT','Kenya 16% VAT','Nigeria 7.5% VAT','UAE 5% VAT','United Kingdom 20% VAT','Germany 19% MwSt'].map((item, i) => {
            const [country, ...rest] = item.split(' ')
            return <div key={i} className="tick-item"><strong>{country}</strong> {rest.join(' ')} &nbsp;·&nbsp;</div>
          })}
        </div>
      </div>

      <div className="stats">
        <div className="stats-inner r">
          <div className="stat-cell"><div className="stat-num">2,400+</div><div className="stat-label">AI-generated invoices</div></div>
          <div className="stat-cell"><div className="stat-num">40+</div><div className="stat-label">Countries &amp; VAT rates</div></div>
          <div className="stat-cell"><div className="stat-num">18 days</div><div className="stat-label">Avg. payment time</div></div>
          <div className="stat-cell"><div className="stat-num">P4.2M+</div><div className="stat-label">Total invoiced</div></div>
        </div>
      </div>

      <section id="features" style={{background:"var(--bg2)",borderTop:"1px solid var(--line)"}}>
        <div className="sec-inner">
          <div className="r">
            <div className="sec-eyebrow">Features</div>
            <h2 className="sec-h2">Everything you need.<br/>Nothing you <em>don&apos;t.</em></h2>
            <p className="sec-sub">Built for the way professionals in Africa actually work — mobile-first, multi-currency, AI-powered from day one.</p>
          </div>
          <div className="feat-grid r">
            <div className="feat-card"><div className="feat-num">01</div><div className="feat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M12 2l-2 7H3l6 4-2 7 5-4 5 4-2-7 6-4h-7z"/></svg></div><div className="feat-title">AI Invoice Generation</div><div className="feat-desc">Describe your work in plain language. AI extracts client, line items, rates and VAT automatically.</div><span className="feat-tag">Most used</span></div>
            <div className="feat-card"><div className="feat-num">02</div><div className="feat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div><div className="feat-title">Smart Reminders</div><div className="feat-desc">Auto-schedule at 3, 7, 14 and 30 days. AI writes each reminder. Send via email or WhatsApp.</div><span className="feat-tag wa-tag">WhatsApp</span></div>
            <div className="feat-card"><div className="feat-num">03</div><div className="feat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M3 12l9-9 9 9"/><path d="M9 21V9h6v12"/></svg></div><div className="feat-title">Global VAT Auto-detect</div><div className="feat-desc">Select your country. VAT rate, currency and tax label fill automatically. 40+ countries covered.</div></div>
            <div className="feat-card"><div className="feat-num">04</div><div className="feat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M2 9h6"/></svg></div><div className="feat-title">Deposit Billing</div><div className="feat-desc">Set 25%, 50% or custom deposit. Shows as a separate row on the invoice. Perfect for retainers.</div></div>
            <div className="feat-card"><div className="feat-num">05</div><div className="feat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div><div className="feat-title">PDF Export</div><div className="feat-desc">One-click branded PDF with 5 template designs. Your firm name, bank details and T&amp;C included.</div></div>
            <div className="feat-card"><div className="feat-num">06</div><div className="feat-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div><div className="feat-title">AI Terms &amp; Conditions</div><div className="feat-desc">Generate profession-specific T&amp;C for your country. Payment terms, IP, late fees — one click.</div></div>
          </div>
        </div>
      </section>

      <section id="who">
        <div className="sec-inner">
          <div className="r">
            <div className="sec-eyebrow">Who it&apos;s for</div>
            <h2 className="sec-h2">Built for <em>billable</em> work.</h2>
            <p className="sec-sub">If you charge for your time, expertise or projects — StagePay is for you.</p>
          </div>
          <div className="who-grid r">
            <div className="who-card"><div className="who-emoji">🏗️</div><div className="who-title">Architects &amp; Engineers</div><div className="who-desc">Phase billing, site inspections, technical reports.</div></div>
            <div className="who-card"><div className="who-emoji">⚖️</div><div className="who-title">Lawyers</div><div className="who-desc">Hourly billing, retainers, disbursements.</div></div>
            <div className="who-card"><div className="who-emoji">📊</div><div className="who-title">Consultants</div><div className="who-desc">Monthly retainers, workshops, strategy deliverables.</div></div>
            <div className="who-card"><div className="who-emoji">🎨</div><div className="who-title">Design Agencies</div><div className="who-desc">Project milestones, deposit invoices, revision rounds.</div></div>
            <div className="who-card"><div className="who-emoji">🏢</div><div className="who-title">Contractors</div><div className="who-desc">Labour, materials, equipment — multi-line with VAT.</div></div>
            <div className="who-card"><div className="who-emoji">💻</div><div className="who-title">Freelancers</div><div className="who-desc">Quick invoices in minutes. Reminders handle follow-up.</div></div>
          </div>
        </div>
      </section>

      <section id="how" style={{background:"var(--bg2)",borderTop:"1px solid var(--line)"}}>
        <div className="sec-inner">
          <div className="r">
            <div className="sec-eyebrow">How it works</div>
            <h2 className="sec-h2">Invoice in under <em>60 seconds.</em></h2>
            <p className="sec-sub">No training needed. If you can describe your work, you can invoice.</p>
          </div>
          <div className="how-grid r">
            <div className="how-step"><div className="how-num">01</div><div className="how-title">Describe your work</div><div className="how-desc">Type who, what, how many hours, at what rate. No forms.</div></div>
            <div className="how-step"><div className="how-num">02</div><div className="how-title">AI builds the invoice</div><div className="how-desc">Client, line items, VAT and deposit extracted automatically.</div></div>
            <div className="how-step"><div className="how-num">03</div><div className="how-title">Send or export</div><div className="how-desc">Email with AI cover note, branded PDF, or WhatsApp.</div></div>
            <div className="how-step"><div className="how-num">04</div><div className="how-title">Get paid faster</div><div className="how-desc">Auto-reminders chase overdue invoices. Dashboard tracks everything.</div></div>
          </div>
        </div>
      </section>

      <section id="pricing">
        <div className="sec-inner">
          <div className="r" style={{textAlign:"center"}}>
            <div className="sec-eyebrow" style={{justifyContent:"center"}}>Pricing</div>
            <h2 className="sec-h2">Simple. <em>Transparent.</em></h2>
            <p className="sec-sub" style={{margin:"0 auto"}}>Start free. Upgrade when you&apos;re ready.</p>
          </div>
          <div className="price-grid r">
            <div className="price-card">
              <div className="price-tier">Starter</div>
              <div className="price-amt">Free</div>
              <div className="price-bill">Forever · no card</div>
              <div className="price-list">
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>5 invoices/mo</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>AI generation (5/mo)</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>PDF export</div>
                <div className="pf off"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l10 10M13 3L3 13"/></svg>Auto-reminders</div>
                <div className="pf off"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3l10 10M13 3L3 13"/></svg>WhatsApp</div>
              </div>
              <button className="price-btn price-btn-out">Get started</button>
            </div>
            <div className="price-card pop">
              <div className="pop-badge">Popular</div>
              <div className="price-tier">Pro</div>
              <div className="price-amt">P199<span>/mo</span></div>
              <div className="price-bill">Cancel anytime</div>
              <div className="price-list">
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>Unlimited invoices</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>Unlimited AI</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>Auto reminders</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>WhatsApp</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>Deposit &amp; T&amp;C</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>Custom branding</div>
              </div>
              <button className="price-btn price-btn-main">Start Pro</button>
            </div>
            <div className="price-card">
              <div className="price-tier">Business</div>
              <div className="price-amt">P499<span>/mo</span></div>
              <div className="price-bill">Team access</div>
              <div className="price-list">
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>Everything in Pro</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>5 team members</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>Priority support</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>Analytics</div>
                <div className="pf"><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>API access</div>
              </div>
              <button className="price-btn price-btn-out">Contact sales</button>
            </div>
          </div>
        </div>
      </section>

      <section style={{background:"var(--bg2)",borderTop:"1px solid var(--line)"}}>
        <div className="sec-inner">
          <div className="r" style={{textAlign:"center"}}>
            <div className="sec-eyebrow" style={{justifyContent:"center"}}>Testimonials</div>
            <h2 className="sec-h2">Professionals <em>love</em> it.</h2>
          </div>
          <div className="testi-grid r">
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">&ldquo;I used to spend an hour per invoice. Now I describe the job, <em>hit Generate</em>, and it&apos;s done in seconds.&rdquo;</p><div className="testi-author"><div className="testi-av" style={{background:"rgba(16,185,129,.12)",color:"#10B981"}}>KM</div><div><div className="testi-name">Kabo Motlhale</div><div className="testi-role">Structural Engineer, Gaborone</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">&ldquo;The <em>WhatsApp reminders</em> changed everything. Clients respond 10x faster than email. Payments arrive within days.&rdquo;</p><div className="testi-author"><div className="testi-av" style={{background:"rgba(59,130,246,.12)",color:"#3B82F6"}}>TN</div><div><div className="testi-name">Tshegofatso Nkwe</div><div className="testi-role">Architecture Firm, Francistown</div></div></div></div>
            <div className="testi-card"><div className="testi-stars">★★★★★</div><p className="testi-quote">&ldquo;<em>Deposit billing</em> alone paid for the subscription. Clients pay 50% upfront now — no more chasing for months.&rdquo;</p><div className="testi-author"><div className="testi-av" style={{background:"rgba(245,158,11,.12)",color:"#F59E0B"}}>LK</div><div><div className="testi-name">Lerato Kgosi</div><div className="testi-role">Consulting, Johannesburg</div></div></div></div>
          </div>
        </div>
      </section>

      <section className="cta">
        <div className="cta-bg"></div>
        <div className="cta-inner r">
          <h2 className="cta-h2">Start invoicing<br/><em>smarter.</em></h2>
          <p className="cta-sub">Join professionals across Africa who invoice faster, get paid sooner, and spend less time chasing.</p>
          <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:"14px",flexWrap:"wrap"}}>
            <a href="/app" className="btn-hero btn-primary"><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 8l5 5 7-7"/></svg>Create free account</a>
            <a href="/app" className="btn-hero btn-ghost">Try the app</a>
          </div>
          <p className="cta-note">Free forever · No credit card · 40+ countries supported</p>
        </div>
      </section>

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
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#">Privacy</a>
            <a href="#">Terms</a>
          </div>
          <span className="foot-note">© 2026 StagePay · Built for African professionals</span>
        </div>
      </footer>
    </>
  )
}

function buildBackgroundPaths() {
  const NS = 'http://www.w3.org/2000/svg'

  function buildPathLayer(containerId: string, position: number) {
    const container = document.getElementById(containerId)
    if (!container) return

    const svg = document.createElementNS(NS, 'svg')
    svg.setAttribute('viewBox', '0 0 696 316')
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice')
    svg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;'

    for (let i = 0; i < 36; i++) {
      const ip = i * 5 * position
      const d = ['M', -(380 - ip), -(189 + i * 6), 'C', -(380 - ip), -(189 + i * 6), -(312 - ip), (216 - i * 6), (152 - ip), (343 - i * 6), 'C', (616 - ip), (470 - i * 6), (684 - ip), (875 - i * 6), (684 - ip), (875 - i * 6)].join(' ')
      const path = document.createElementNS(NS, 'path')
      path.setAttribute('d', d)
      path.setAttribute('stroke', '#10B981')
      path.setAttribute('stroke-width', (0.5 + i * 0.03).toFixed(2))
      path.setAttribute('fill', 'none');
      (path as any).dataset.baseOpacity = (0.015 + i * 0.004).toFixed(4)
      svg.appendChild(path)
    }

    container.appendChild(svg)

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        svg.querySelectorAll('path').forEach((path) => {
          let len: number
          try { len = (path as SVGPathElement).getTotalLength() } catch { len = 0 }
          if (!len || len < 1) len = 2400
          const baseOp = parseFloat((path as any).dataset.baseOpacity)
          const dashLen = len * 0.15
          const gapLen = len - dashLen
          const duration = (20 + Math.random() * 10) * 1000
          const delay = -(Math.random() * duration)
          path.setAttribute('stroke-dasharray', `${dashLen.toFixed(1)} ${gapLen.toFixed(1)}`)
          path.setAttribute('stroke-dashoffset', len.toFixed(1))
          path.animate(
            [
              { strokeDashoffset: `${len}`, strokeOpacity: `${(baseOp * 0.3).toFixed(4)}` },
              { strokeDashoffset: `${len * 0.5}`, strokeOpacity: `${baseOp.toFixed(4)}` },
              { strokeDashoffset: '0', strokeOpacity: `${(baseOp * 0.3).toFixed(4)}` },
            ],
            { duration, iterations: Infinity, easing: 'linear', delay, fill: 'both' }
          )
        })
      })
    })
  }

  buildPathLayer('fp-pos', 1)
  buildPathLayer('fp-neg', -1)
}
