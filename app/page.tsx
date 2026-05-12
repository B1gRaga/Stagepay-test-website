'use client'

import { useEffect } from 'react'

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

  return (
    <>
      {/* ANNOUNCE BAR */}
      <div className="announce">
        <span className="announce-dot"></span>
        <strong>Early Access:</strong> First 100 users get <strong>1 month of Pro free</strong> — no credit card needed.
      </div>

      {/* NAV */}
      <nav>
        <div className="nav-inner">
          <a href="#" className="nav-logo">
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/>
              <rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/>
              <rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/>
              <rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/>
            </svg>
            <span className="nav-wordmark">Stage<em>Pay</em></span>
          </a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#who">Who it&apos;s for</a>
          </div>
          <div className="nav-right">
            <a href="/auth/login" className="nav-sign-in">Sign in</a>
            <a href="/auth/signup" className="nav-cta">Try it free →</a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-orb hero-orb-1"></div>
        <div className="hero-orb hero-orb-2"></div>
        <div className="hero-inner">
          <div className="hero-left">
            <div className="hero-badge">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="#10B981"><circle cx="5" cy="5" r="5"/></svg>
              AI-powered · WhatsApp delivery · Built for Botswana
            </div>
            <h1 className="hero-h1">
              Describe your work.<br/>We send the invoice<br/>on <em>WhatsApp</em> in 30 seconds.
            </h1>
            <p className="pain-hook">Stop manually building invoices in Word or Excel.</p>
            <p className="hero-sub">
              Just tell StagePay what you did — AI generates a professional invoice instantly. Send it directly to your client via WhatsApp. Smart reminders chase overdue payments so you don&apos;t have to.
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
            <p className="trust-note">Built for freelancers and small businesses in Botswana · Sends via WhatsApp like your clients already use · No complexity</p>
          </div>

          <div className="hero-right">
            <div className="mock-wrap">
              <div className="mock-bar">
                <div className="mock-dot" style={{background:'#EF4444'}}></div>
                <div className="mock-dot" style={{background:'#F59E0B'}}></div>
                <div className="mock-dot" style={{background:'#10B981'}}></div>
                <span className="mock-url">stagepay.co.bw/invoice/INV-042</span>
              </div>
              <div className="mock-body">
                <div className="mock-head">
                  <div>
                    <div className="mock-brand">
                      <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/><rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/><rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/><rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/></svg>
                      Kgosi Engineering
                    </div>
                    <div className="mock-meta">Gaborone, Botswana · VAT Reg: BW123456</div>
                  </div>
                  <div style={{textAlign:'right'}}>
                    <div className="mock-inv-badge">INVOICE</div>
                    <div className="mock-meta" style={{marginTop:'6px'}}>INV-042 · 30 Apr 2026</div>
                  </div>
                </div>
                <div className="mock-parties">
                  <div>
                    <div className="mock-lbl">Bill to</div>
                    <div className="mock-nm">Molapo Tower Ltd.</div>
                    <div className="mock-detail">Gaborone CBD<br/>VAT: BW789012</div>
                  </div>
                  <div>
                    <div className="mock-lbl">Project</div>
                    <div className="mock-nm">Phase 2 — Structural Review</div>
                    <div className="mock-detail">Due: 30 May 2026<br/>Net 30 days</div>
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
                      <td>Structural engineering review</td>
                      <td style={{textAlign:'right'}}>40h</td>
                      <td style={{textAlign:'right'}}>P950</td>
                      <td style={{textAlign:'right'}}>P38,000</td>
                    </tr>
                    <tr>
                      <td>Site inspection (3 visits)</td>
                      <td style={{textAlign:'right'}}>3</td>
                      <td style={{textAlign:'right'}}>P800</td>
                      <td style={{textAlign:'right'}}>P2,400</td>
                    </tr>
                    <tr>
                      <td>Technical report &amp; drawings</td>
                      <td style={{textAlign:'right'}}>1</td>
                      <td style={{textAlign:'right'}}>P5,600</td>
                      <td style={{textAlign:'right'}}>P5,600</td>
                    </tr>
                    <tr>
                      <td style={{color:'#F59E0B'}}>Deposit paid (50%)</td>
                      <td></td><td></td>
                      <td style={{textAlign:'right',color:'#F59E0B'}}>−P23,000</td>
                    </tr>
                  </tbody>
                </table>
                <div className="mock-subtotals">
                  <div className="mock-sub-row"><span>Subtotal</span><span>P46,000</span></div>
                  <div className="mock-sub-row vat"><span>VAT (14%)</span><span>P6,440</span></div>
                </div>
                <div className="mock-total-bar">
                  <span className="mock-total-lbl">Balance Due</span>
                  <span className="mock-total-val">P29,440</span>
                </div>
                <div className="mock-actions">
                  <div className="mock-btn">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Download PDF
                  </div>
                  <div className="mock-btn mock-btn-wa">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.07-1.35A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
                    Send via WhatsApp
                  </div>
                </div>
              </div>
            </div>
            <div className="ai-bubble">
              <div className="ai-bubble-label">AI Prompt Used</div>
              <div className="ai-bubble-text">&quot;Invoice Molapo Tower for 40h structural review at P950/h plus 3 site visits and a technical report. 50% deposit already paid.&quot;</div>
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
              <p className="sec-p">No templates. No training. Just describe the work and we handle everything else.</p>
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
                <div className="how-desc">Client, line items, VAT, deposit and due date — extracted automatically. Edit anything before sending.</div>
              </div>
              <div className="how-step">
                <div className="how-num">03</div>
                <div className="how-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/></svg></div>
                <div className="how-title">Send via WhatsApp &amp; get paid</div>
                <div className="how-desc">Deliver your invoice straight to your client&apos;s WhatsApp. Smart reminders follow up automatically on overdue invoices.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TYPE → INVOICE DEMO */}
      <div className="sec">
        <div className="sec-inner">
          <div className="sec-head reveal text-center mx-auto">
            <div className="sec-tag">See it in action</div>
            <h2 className="sec-h2">Just <em>describe it.</em><br/>We handle the rest.</h2>
            <p className="sec-p">No forms. No templates. Type like you&apos;re messaging a colleague.</p>
          </div>
          <div className="aha-demo-grid reveal" style={{alignItems:'start'}}>
            <div className="aha-input-box">
              <div className="aha-box-label">You type</div>
              <div className="aha-prompt">
                &quot;Logo design for TelePower, P1,500. Due in 7 days. 50% deposit already paid.&quot;
              </div>
              <div className="aha-time">⚡ StagePay processes in under 5 seconds</div>
            </div>
            <div className="aha-arrow-wrap">
              <div className="aha-arrow">→</div>
              <div className="aha-arrow-label">Instant</div>
            </div>
            <div className="aha-result-box" style={{padding:0,overflow:'hidden'}}>
              <div className="aha-box-label" style={{padding:'16px 20px 10px'}}>You get</div>
              <div className="mock-wrap" style={{borderRadius:0,boxShadow:'none',border:'none',borderTop:'1px solid var(--line)'}}>
                <div className="mock-bar">
                  <div className="mock-dot" style={{background:'#EF4444'}}></div>
                  <div className="mock-dot" style={{background:'#F59E0B'}}></div>
                  <div className="mock-dot" style={{background:'#10B981'}}></div>
                  <span className="mock-url">stagepay.co.bw/invoice/INV-043</span>
                </div>
                <div className="mock-body">
                  <div className="mock-head">
                    <div>
                      <div className="mock-brand">
                        <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/><rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/><rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/><rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/></svg>
                        Your Business
                      </div>
                      <div className="mock-meta">Your City · VAT Registered</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div className="mock-inv-badge">INVOICE</div>
                      <div className="mock-meta" style={{marginTop:'6px'}}>INV-043 · 01 May 2026</div>
                    </div>
                  </div>
                  <div className="mock-parties">
                    <div>
                      <div className="mock-lbl">Bill to</div>
                      <div className="mock-nm">TelePower</div>
                    </div>
                    <div>
                      <div className="mock-lbl">Due</div>
                      <div className="mock-nm">08 May 2026</div>
                      <div className="mock-detail">Net 7 days</div>
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
                        <td>Logo design</td>
                        <td style={{textAlign:'right'}}>1</td>
                        <td style={{textAlign:'right'}}>P1,500</td>
                        <td style={{textAlign:'right'}}>P1,500</td>
                      </tr>
                      <tr>
                        <td style={{color:'#F59E0B'}}>Deposit paid (50%)</td>
                        <td></td><td></td>
                        <td style={{textAlign:'right',color:'#F59E0B'}}>−P750</td>
                      </tr>
                    </tbody>
                  </table>
                  <div className="mock-subtotals">
                    <div className="mock-sub-row"><span>Subtotal</span><span>P1,500</span></div>
                    <div className="mock-sub-row vat"><span>VAT (14%)</span><span>P210</span></div>
                  </div>
                  <div className="mock-total-bar">
                    <span className="mock-total-lbl">Balance Due</span>
                    <span className="mock-total-val">P960</span>
                  </div>
                  <div className="mock-actions">
                    <div className="mock-btn">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                      Download PDF
                    </div>
                    <div className="mock-btn mock-btn-wa">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.07-1.35A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg>
                      Send via WhatsApp
                    </div>
                  </div>
                </div>
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
              <p className="sec-p">Built for the way professionals in Botswana actually work — mobile-first, WhatsApp-native, AI-powered from day one.</p>
            </div>
            <div className="feat-grid reveal">
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M12 2l-2 7H3l6 4-2 7 5-4 5 4-2-7 6-4h-7z"/></svg></div>
                <div className="feat-title">AI Invoice Generation</div>
                <div className="feat-desc">Describe your work in plain language. AI extracts the client, line items, rates and VAT automatically.</div>
                <span className="feat-tag">Core feature</span>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 2C6.48 2 2 6.48 2 12c0 1.85.5 3.58 1.37 5.07L2 22l5.07-1.35A9.96 9.96 0 0012 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"/></svg></div>
                <div className="feat-title">WhatsApp Delivery</div>
                <div className="feat-desc">Send your invoice directly to your client&apos;s WhatsApp. Clients actually open and respond to WhatsApp messages.</div>
                <span className="feat-tag">The differentiator</span>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg></div>
                <div className="feat-title">Automatic Reminders</div>
                <div className="feat-desc">Smart follow-ups go out at 3, 7, 14 and 30 days. You never have to chase a client awkwardly again.</div>
                <span className="feat-tag">WhatsApp</span>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg></div>
                <div className="feat-title">Client Address Book</div>
                <div className="feat-desc">Save client details once. Next time you invoice them, their name, contact and VAT number are pre-filled.</div>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/></svg></div>
                <div className="feat-title">PDF Export</div>
                <div className="feat-desc">One-click branded PDF with your firm name, bank details and payment terms included — ready to share anywhere.</div>
              </div>
              <div className="feat-card">
                <div className="feat-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M8 4v16M2 9h6"/></svg></div>
                <div className="feat-title">Deposit Billing</div>
                <div className="feat-desc">Set 25%, 50% or a custom deposit. Shows as a clear row on the invoice — perfect for projects and retainers.</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BEFORE / AFTER */}
      <div className="sec">
        <div className="sec-inner">
          <div className="sec-head reveal">
            <div className="sec-tag">The difference</div>
            <h2 className="sec-h2">Stop spending hours<br/>on <em>admin.</em></h2>
            <p className="sec-p">Professionals waste 3–5 hours a week on invoicing. StagePay cuts that to minutes.</p>
          </div>
          <div className="val-grid reveal">
            <div>
              <ul className="pain-list">
                <li className="pain-item"><span className="pain-before">BEFORE</span><span className="pain-text">Open Word, find last invoice, update every field manually, calculate VAT — 45 minutes per invoice.</span></li>
                <li className="pain-item"><span className="pain-before">BEFORE</span><span className="pain-text">Wrong VAT rate, missing bank details, wrong client name — send a corrected invoice, lose credibility.</span></li>
                <li className="pain-item"><span className="pain-before">BEFORE</span><span className="pain-text">Chase payments manually via WhatsApp. Clients ignore it. You feel awkward. Money sits unpaid for months.</span></li>
                <li className="pain-item"><span className="pain-after">AFTER</span><span className="pain-text">Describe the job, hit Generate. Professional invoice in 30 seconds — correct VAT, branded, sent via WhatsApp.</span></li>
                <li className="pain-item"><span className="pain-after">AFTER</span><span className="pain-text">Smart reminders go out automatically at 3, 7, 14 and 30 days. You never have to chase again.</span></li>
                <li className="pain-item"><span className="pain-after">AFTER</span><span className="pain-text">Every client saved once. Invoice them again in seconds — name, address, VAT number all pre-filled.</span></li>
              </ul>
            </div>
            <div className="val-cta-box">
              <h3>Ready to stop chasing payments?</h3>
              <p>Start free — no credit card needed. Create your first invoice in under 2 minutes.</p>
              <div className="flex-btns">
                <a href="/auth/signup" className="btn-green">Create my first invoice →</a>
                <a href="#features" className="btn-outline">See all features</a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WHO IT'S FOR */}
      <div className="how-bg" id="who">
        <div className="sec">
          <div className="sec-inner">
            <div className="sec-head reveal">
              <div className="sec-tag">Who it&apos;s for</div>
              <h2 className="sec-h2">Built for people who<br/><em>charge for their work.</em></h2>
              <p className="sec-p">If you send invoices to clients, StagePay makes the whole process faster and more professional.</p>
            </div>
            <div className="who-grid reveal">
              {[
                {emoji:'🏗️', title:'Architects & Engineers', desc:'Phase billing, site inspections, technical reports with VAT — all handled in seconds.'},
                {emoji:'💻', title:'Freelancers', desc:'Quick invoices in minutes. Automatic WhatsApp reminders handle follow-up so you never feel awkward chasing.'},
                {emoji:'🔧', title:'Contractors & Consultants', desc:'Labour, materials, milestones, retainers — multi-line invoices with deposit billing built in.'},
                {emoji:'🏢', title:'Small Businesses', desc:'Professional invoices for every job. Save clients once, invoice them in seconds every time after that.'},
              ].map((w, i) => (
                <div key={i} className="who-card">
                  <div className="who-emoji">{w.emoji}</div>
                  <div className="who-title">{w.title}</div>
                  <div className="who-desc">{w.desc}</div>
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
              <div className="price-amt">P199<span>/mo</span></div>
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
              <div className="price-amt">P499<span>/mo</span></div>
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

      {/* FAQ */}
      <div className="how-bg">
        <div className="sec">
          <div className="sec-inner">
            <div className="sec-head reveal">
              <div className="sec-tag">Common questions</div>
              <h2 className="sec-h2">A few things<br/>people <em>ask first.</em></h2>
            </div>
            <div className="obj-grid reveal">
              <div className="obj-card">
                <div className="obj-q">&quot;I already use Word or Excel for invoices.&quot;</div>
                <div className="obj-a">That works — until you miss a VAT rate, send to the wrong client, or spend 40 minutes rebuilding last month&apos;s template. <strong>StagePay does it in 30 seconds.</strong></div>
              </div>
              <div className="obj-card">
                <div className="obj-q">&quot;Is my data safe?&quot;</div>
                <div className="obj-a">Your business data is securely stored and encrypted — at rest and in transit. We use Supabase (SOC 2 compliant) for storage. <strong>We never sell your data, ever.</strong> Export everything anytime.</div>
              </div>
              <div className="obj-card">
                <div className="obj-q">&quot;Can I edit the invoice before sending?&quot;</div>
                <div className="obj-a">Yes — every field is editable after AI generation. Add your logo, payment terms, bank details, or adjust any line item. <strong>Full control, zero friction.</strong></div>
              </div>
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
          <h2 className="final-cta-h">Send your next invoice<br/>on WhatsApp<br/>in <em>30 seconds.</em></h2>
          <p className="final-cta-p">First 100 users get <strong>Pro free for 1 month</strong> — no credit card needed. Start invoicing smarter today.</p>
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
            <a href="#who">Who it&apos;s for</a>
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
    </>
  )
}
