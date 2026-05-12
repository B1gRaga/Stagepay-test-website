import Link from 'next/link'

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Archivo:wght@300;400;500;600&display=swap');
  :root{
    --g:#10B981;--g2:#059669;--g-dim:rgba(16,185,129,0.1);--g-glow:rgba(16,185,129,0.18);
    --bg:#0F172A;--bg2:#1E293B;--surface:#263244;--surface2:#2d3a50;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#F8FAFC;--t2:rgba(248,250,252,0.6);--t3:rgba(248,250,252,0.3);
    --danger:#EF4444;--warn:#F59E0B;--info:#3B82F6;
  }
  [data-theme="light"]{
    --bg:#F8FAFC;--bg2:#FFFFFF;--surface:#F1F5F9;--surface2:#E8EEF5;
    --line:rgba(15,23,42,0.08);--line2:rgba(15,23,42,0.14);
    --t1:#0F172A;--t2:rgba(15,23,42,0.65);--t3:rgba(15,23,42,0.38);
    --g-dim:rgba(16,185,129,0.08);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Archivo',sans-serif;background:var(--bg);color:var(--t1);}

  .topbar{
    height:56px;flex-shrink:0;
    border-bottom:1px solid var(--line);
    display:flex;align-items:center;justify-content:space-between;
    padding:0 28px;background:var(--bg2);
  }
  .page-title{
    font-family:'Bebas Neue',sans-serif;
    font-size:20px;letter-spacing:2.5px;color:var(--t1);
  }
  .topbar-right{display:flex;align-items:center;gap:10px;}
  .topbar-btn{
    display:flex;align-items:center;gap:7px;
    padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;
    cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;
    text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;
  }
  .btn-primary{background:var(--g);color:var(--bg);box-shadow:0 2px 8px rgba(16,185,129,.2);}
  .btn-primary:hover{background:#34d399;transform:translateY(-1px);box-shadow:0 4px 14px rgba(16,185,129,.3);}

  .content{padding:32px 28px 60px;}

  /* hero */
  .hero{
    background:var(--bg2);border:1px solid var(--line2);border-radius:14px;
    padding:36px 40px;margin-bottom:32px;
    display:flex;align-items:center;gap:32px;
    background-image:radial-gradient(ellipse at 80% 50%,var(--g-glow),transparent 60%);
    position:relative;overflow:hidden;
  }
  .hero::before{
    content:'';position:absolute;top:0;left:0;right:0;height:2px;
    background:linear-gradient(90deg,var(--g) 0%,transparent 50%);
    opacity:.8;
  }
  .hero-icon{
    width:64px;height:64px;border-radius:14px;
    background:var(--g-dim);border:1px solid rgba(16,185,129,.2);
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
  }
  .hero-title{font-family:'Bebas Neue',sans-serif;font-size:32px;letter-spacing:2px;color:var(--t1);line-height:1.1;margin-bottom:8px;}
  .hero-sub{font-size:14px;color:var(--t2);line-height:1.6;max-width:480px;}

  /* progress bar */
  .progress-wrap{margin-bottom:28px;}
  .progress-label{font-size:11px;color:var(--t3);letter-spacing:.1em;text-transform:uppercase;font-weight:600;margin-bottom:8px;}
  .progress-steps{display:flex;gap:0;align-items:center;}
  .progress-step{
    display:flex;align-items:center;gap:8px;
    font-size:12px;font-weight:600;color:var(--t3);
    text-transform:uppercase;letter-spacing:.06em;
    padding:6px 14px 6px 10px;
    background:var(--surface);
    clip-path:polygon(0 0,calc(100% - 10px) 0,100% 50%,calc(100% - 10px) 100%,0 100%,10px 50%);
    flex:1;transition:background .2s,color .2s;
    position:relative;
  }
  .progress-step:first-child{clip-path:polygon(0 0,calc(100% - 10px) 0,100% 50%,calc(100% - 10px) 100%,0 100%,0 50%);}
  .progress-step.done{background:var(--g-dim);color:var(--g);}
  .progress-step.done .ps-num{background:var(--g);color:var(--bg);}
  .progress-step.active{background:var(--surface2);color:var(--t1);}
  .ps-num{
    width:18px;height:18px;border-radius:50%;
    background:var(--surface2);color:var(--t2);
    font-size:10px;font-weight:700;
    display:flex;align-items:center;justify-content:center;
    flex-shrink:0;
  }
  @media(max-width:700px){
    .progress-steps{flex-wrap:wrap;gap:6px;}
    .progress-step{clip-path:none;border-radius:6px;flex:none;padding:6px 12px;}
    .progress-step:first-child{clip-path:none;}
  }

  /* steps */
  .steps-grid{display:flex;flex-direction:column;gap:16px;}

  .step-card{
    background:var(--bg2);border:1px solid var(--line);border-radius:12px;
    overflow:hidden;transition:border-color .2s;
    animation:cardIn .35s ease both;
  }
  .step-card:hover{border-color:var(--line2);}
  @keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

  .step-header{
    display:flex;align-items:flex-start;gap:16px;
    padding:20px 22px;cursor:default;
  }
  .step-num{
    width:36px;height:36px;border-radius:50%;
    background:var(--g-dim);border:1px solid rgba(16,185,129,.25);
    display:flex;align-items:center;justify-content:center;
    font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;
    color:var(--g);flex-shrink:0;margin-top:2px;
  }
  .step-meta{flex:1;}
  .step-label{
    font-size:10px;letter-spacing:.14em;text-transform:uppercase;
    color:var(--g);font-weight:600;margin-bottom:4px;
  }
  .step-title{
    font-family:'Bebas Neue',sans-serif;font-size:20px;
    letter-spacing:1.5px;color:var(--t1);margin-bottom:6px;
  }
  .step-desc{font-size:13px;color:var(--t2);line-height:1.65;}

  .step-body{
    padding:0 22px 22px 74px;
    display:flex;flex-direction:column;gap:14px;
  }
  @media(max-width:600px){
    .step-body{padding:0 16px 18px 16px;}
    .step-header{gap:12px;}
  }

  /* instruction rows */
  .instruction{
    display:flex;align-items:flex-start;gap:12px;
  }
  .instr-dot{
    width:24px;height:24px;border-radius:50%;
    background:var(--surface);border:1px solid var(--line2);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;font-weight:700;color:var(--t3);flex-shrink:0;margin-top:1px;
  }
  .instr-text{font-size:13px;color:var(--t2);line-height:1.6;}
  .instr-text strong{color:var(--t1);font-weight:600;}
  .instr-text code{
    background:var(--surface);border:1px solid var(--line2);
    border-radius:4px;padding:1px 6px;font-size:12px;
    color:var(--g);font-family:'Archivo',monospace;letter-spacing:.03em;
  }

  /* tip box */
  .tip-box{
    display:flex;align-items:flex-start;gap:10px;
    background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.18);
    border-radius:8px;padding:12px 14px;
  }
  .tip-icon{color:#3B82F6;flex-shrink:0;margin-top:1px;}
  .tip-text{font-size:12px;color:var(--t2);line-height:1.6;}
  .tip-text strong{color:var(--t1);}

  /* shortcut chips */
  .shortcut-row{display:flex;flex-wrap:wrap;gap:8px;}
  .shortcut-chip{
    display:flex;align-items:center;gap:7px;
    background:var(--surface);border:1px solid var(--line2);border-radius:8px;
    padding:7px 12px;
  }
  kbd{
    background:var(--bg);border:1px solid var(--line2);
    border-radius:4px;padding:2px 7px;
    font-size:12px;font-weight:700;color:var(--t1);
    font-family:'Archivo',monospace;letter-spacing:.04em;
    box-shadow:0 2px 0 var(--line2);
  }
  .shortcut-chip span{font-size:12px;color:var(--t2);}

  /* feature grid */
  .feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
  @media(max-width:600px){.feature-grid{grid-template-columns:1fr;}}
  .feature-item{
    display:flex;align-items:flex-start;gap:10px;
    background:var(--surface);border-radius:8px;padding:12px 14px;
  }
  .feature-icon{
    width:30px;height:30px;border-radius:7px;
    background:var(--g-dim);display:flex;align-items:center;justify-content:center;
    flex-shrink:0;
  }
  .feature-name{font-size:12px;font-weight:600;color:var(--t1);margin-bottom:3px;}
  .feature-desc{font-size:11px;color:var(--t3);line-height:1.5;}

  /* divider */
  .step-divider{height:1px;background:var(--line);margin:4px 0;}

  /* cta section */
  .cta-card{
    background:var(--bg2);border:1px solid var(--line2);border-radius:12px;
    padding:28px 32px;margin-top:24px;text-align:center;
    background-image:radial-gradient(ellipse at 50% 100%,var(--g-glow),transparent 60%);
    position:relative;overflow:hidden;
  }
  .cta-card::before{
    content:'';position:absolute;bottom:0;left:20%;right:20%;height:1px;
    background:linear-gradient(90deg,transparent,var(--g),transparent);
    opacity:.6;
  }
  .cta-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:var(--t1);margin-bottom:8px;}
  .cta-sub{font-size:13px;color:var(--t2);margin-bottom:20px;}
  .cta-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}
  .btn-outline{
    display:flex;align-items:center;gap:7px;
    padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;
    cursor:pointer;transition:all .15s;border:1px solid var(--line2);letter-spacing:.05em;
    text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;
    background:transparent;color:var(--t2);
  }
  .btn-outline:hover{border-color:var(--g);color:var(--g);}

  @media(max-width:640px){
    .content{padding:20px 16px 60px;}
    .hero{padding:24px 20px;flex-direction:column;gap:16px;}
    .hero-icon{display:none;}
    .step-header{padding:16px 16px;}
    .step-body{padding:0 16px 16px;}
  }
`

const STEPS = [
  {
    num: '01',
    label: 'Getting started',
    title: 'Set Up Your Profile',
    desc: 'Before you send your first invoice, add your business details so every invoice looks professional.',
    instructions: [
      { text: <>Click <strong>Settings</strong> in the left sidebar (or press the gear icon at the bottom).</> },
      { text: <>Under <strong>Firm Details</strong>, fill in your business name, your name, phone number, and address.</> },
      { text: <>Under <strong>Invoice Defaults</strong>, choose your <strong>currency</strong> and <strong>VAT rate</strong> for your country.</> },
      { text: <>Under <strong>Payment & Banking</strong>, add your bank account details — these appear on every invoice you send.</> },
      { text: <>Hit <strong>Save</strong> on each section. Done — your details will auto-populate on every new invoice.</> },
    ],
    tip: { title: 'Pro tip:', body: 'Set your VAT rate once in Settings and it will be pre-filled on every invoice. You can always override it per-invoice if needed.' },
    extra: null,
  },
  {
    num: '02',
    label: 'Core feature',
    title: 'Create Your First Invoice',
    desc: 'StagePay\'s AI reads a plain-English description of your work and builds the invoice for you. No forms to fill, no line items to type manually.',
    instructions: [
      { text: <>Click <strong>New Invoice</strong> in the sidebar (or press <code>N</code> anywhere in the app).</> },
      { text: <>In the text box on the left, <strong>describe the work in plain English</strong>. For example: <em>"Website design for Kgosi Holdings — 3 milestones at R15,000 each, 15% VAT, due in 14 days"</em></> },
      { text: <>Click <strong>Generate Invoice</strong>. Watch the live preview on the right build in real time.</> },
      { text: <>Review the preview. Click any field — client name, line items, dates, amounts — to edit directly.</> },
      { text: <>When it looks right, click <strong>Send Invoice</strong> or <strong>Save as Draft</strong> if you need to finish later.</> },
    ],
    tip: { title: 'Shortcut prompts:', body: 'Use the quick-fill chips below the text box (Consulting, Engineering, Design, Legal, Construction) to pre-fill a template description for your industry.' },
    extra: 'shortcuts',
  },
  {
    num: '03',
    label: 'Delivery',
    title: 'Send Via Email or WhatsApp',
    desc: 'Once your invoice is ready, deliver it to your client in two taps — by email or directly on WhatsApp.',
    instructions: [
      { text: <>Click <strong>Send Invoice</strong>. A send modal will open.</> },
      { text: <>Choose <strong>Email</strong> to send a professional email with the invoice attached, or <strong>WhatsApp</strong> to send a message with a payment link directly to your client's phone.</> },
      { text: <>For WhatsApp: a <strong>contact picker</strong> will show your saved clients. Select the client and tap <strong>Send</strong>.</> },
      { text: <>Your client receives a link — they open it, see the invoice, and can confirm payment details.</> },
      { text: <>The invoice status in StagePay updates to <strong>Sent</strong> automatically.</> },
    ],
    tip: { title: 'No email client needed:', body: 'StagePay sends the email on your behalf using your firm details as the sender name. Your client sees a professional email — not a generic notification.' },
    extra: null,
  },
  {
    num: '04',
    label: 'Get paid faster',
    title: 'Automate Payment Reminders',
    desc: 'Stop chasing clients manually. StagePay sends follow-ups on your behalf — politely at first, more firmly as the invoice ages.',
    instructions: [
      { text: <>Click <strong>Reminders</strong> in the sidebar (or press <code>R</code>).</> },
      { text: <>You'll see all your outstanding invoices, colour-coded by urgency (yellow = due soon, red = overdue).</> },
      { text: <>For any invoice, toggle <strong>Auto-reminders on</strong>. StagePay will follow up at 3, 7, 14, and 30 days automatically.</> },
      { text: <>The sidebar shows the <strong>reminder schedule</strong> — you can see which tier each invoice is in and how many reminders have been sent.</> },
      { text: <>Reminders go out via the same channel you used to send the invoice (Email or WhatsApp).</> },
    ],
    tip: { title: 'Set it once:', body: 'Once you toggle auto-reminders on for an invoice, you don\'t need to touch it again. StagePay escalates automatically through all 4 tiers until the invoice is paid.' },
    extra: 'reminder-tiers',
  },
  {
    num: '05',
    label: 'Stay on top',
    title: 'Track Everything on the Dashboard',
    desc: 'The dashboard is your real-time view of your cash flow — what\'s unpaid, what\'s overdue, and what came in this month.',
    instructions: [
      { text: <>Click <strong>Dashboard</strong> in the sidebar. The three stat cards at the top show: <strong>Unpaid</strong>, <strong>Overdue</strong>, and <strong>Paid This Month</strong>.</> },
      { text: <>Below the stats, the <strong>Recent Invoices</strong> table shows your last 20 invoices with status pills (Draft, Sent, Pending, Paid, Overdue).</> },
      { text: <>Click <strong>View all invoices</strong> to go to the full invoice list with search, filters, and bulk actions.</> },
      { text: <>On the <strong>Clients</strong> page, you can see total billed and invoice count per client.</> },
    ],
    tip: { title: 'Invoice statuses explained:', body: 'Draft = not sent yet. Sent = delivered, waiting for acknowledgement. Pending = client acknowledged. Paid = you\'ve marked it paid. Overdue = past due date and unpaid.' },
    extra: 'features',
  },
]

const ReminderTiers = () => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {[
      { day: '3 days', label: 'Gentle nudge', color: '#10B981' },
      { day: '7 days', label: 'Polite follow-up', color: '#F59E0B' },
      { day: '14 days', label: 'Firm notice', color: '#F97316' },
      { day: '30 days', label: 'Final escalation', color: '#EF4444' },
    ].map(t => (
      <div key={t.day} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', borderRadius: 8, padding: '8px 12px', flex: '1 1 auto', minWidth: 120 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{t.day}</div>
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>{t.label}</div>
        </div>
      </div>
    ))}
  </div>
)

const Features = () => (
  <div className="feature-grid">
    {[
      { name: 'AI Invoice Builder', desc: 'Describe in plain English — AI fills in the details', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> },
      { name: 'Email & WhatsApp', desc: 'Send invoices via email or WhatsApp in 2 taps', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 1h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg> },
      { name: 'Auto Reminders', desc: '4-tier schedule: 3 / 7 / 14 / 30 days automated', icon: <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="1.5"><path d="M8 2a5 5 0 015 5v2l1 2H2l1-2V7a5 5 0 015-5z"/><path d="M6.5 13a1.5 1.5 0 003 0"/></svg> },
      { name: 'Multi-currency', desc: 'BWP, ZAR, USD, EUR, GBP, KES, NGN + more', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M9 9h4.5a2.5 2.5 0 010 5H9m0 0h5"/></svg> },
      { name: 'VAT by Country', desc: '60+ countries with preset VAT rates', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/></svg> },
      { name: 'PDF Export', desc: 'Download a branded PDF of any invoice', icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg> },
    ].map(f => (
      <div key={f.name} className="feature-item">
        <div className="feature-icon">{f.icon}</div>
        <div>
          <div className="feature-name">{f.name}</div>
          <div className="feature-desc">{f.desc}</div>
        </div>
      </div>
    ))}
  </div>
)

const Shortcuts = () => (
  <div className="shortcut-row">
    {[
      { key: 'N', label: 'New invoice' },
      { key: 'I', label: 'Go to Invoices' },
      { key: 'R', label: 'Go to Reminders' },
    ].map(s => (
      <div key={s.key} className="shortcut-chip">
        <kbd>{s.key}</kbd>
        <span>{s.label}</span>
      </div>
    ))}
  </div>
)

export default function TutorialPage() {
  return (
    <>
      <style>{CSS}</style>

      {/* Topbar */}
      <div className="topbar">
        <span className="page-title">Getting Started</span>
        <div className="topbar-right">
          <Link href="/new-invoice" className="topbar-btn btn-primary">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3v10M3 8h10"/></svg>
            Create First Invoice
          </Link>
        </div>
      </div>

      <div className="content">

        {/* Hero */}
        <div className="hero">
          <div className="hero-icon">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <rect x="0"  y="17" width="6"  height="15" rx="2" fill="#10B981"/>
              <rect x="9"  y="12" width="6"  height="20" rx="2" fill="#10B981" opacity=".82"/>
              <rect x="18" y="6"  width="6"  height="26" rx="2" fill="#10B981" opacity=".65"/>
              <rect x="27" y="0"  width="5"  height="32" rx="2" fill="#10B981" opacity=".48"/>
            </svg>
          </div>
          <div>
            <div className="hero-title">Welcome to StagePay</div>
            <div className="hero-sub">
              Follow these 5 steps to go from sign-up to sending your first invoice in under 5 minutes.
              StagePay handles the invoicing so you can focus on the work.
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="progress-wrap">
          <div className="progress-label">Your setup checklist</div>
          <div className="progress-steps">
            {['Setup Profile', 'Create Invoice', 'Send Invoice', 'Set Reminders', 'Track Cash Flow'].map((label, i) => (
              <div key={i} className={`progress-step${i === 0 ? ' done' : ''}`}>
                <div className="ps-num">
                  {i === 0
                    ? <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1.5,6 4.5,9 10.5,3"/></svg>
                    : i + 1}
                </div>
                <span style={{ fontSize: 10, letterSpacing: '.05em', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="steps-grid">
          {STEPS.map((step, si) => (
            <div key={step.num} className="step-card" style={{ animationDelay: `${si * 0.07}s` }}>
              <div className="step-header">
                <div className="step-num">{step.num}</div>
                <div className="step-meta">
                  <div className="step-label">{step.label}</div>
                  <div className="step-title">{step.title}</div>
                  <div className="step-desc">{step.desc}</div>
                </div>
              </div>

              <div className="step-divider" />

              <div className="step-body">
                {step.instructions.map((instr, ii) => (
                  <div key={ii} className="instruction">
                    <div className="instr-dot">{ii + 1}</div>
                    <div className="instr-text">{instr.text}</div>
                  </div>
                ))}

                {step.extra === 'shortcuts' && <Shortcuts />}
                {step.extra === 'reminder-tiers' && <ReminderTiers />}
                {step.extra === 'features' && <Features />}

                {step.tip && (
                  <div className="tip-box">
                    <svg className="tip-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="7"/><line x1="8" y1="7" x2="8" y2="11"/><circle cx="8" cy="5" r=".5" fill="currentColor"/></svg>
                    <div className="tip-text"><strong>{step.tip.title}</strong> {step.tip.body}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="cta-card">
          <div className="cta-title">You're Ready to Go</div>
          <div className="cta-sub">Create your first invoice and start getting paid faster.</div>
          <div className="cta-actions">
            <Link href="/new-invoice" className="topbar-btn btn-primary" style={{ padding: '10px 24px', fontSize: 13 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3v10M3 8h10"/></svg>
              Create First Invoice
            </Link>
            <Link href="/settings" className="btn-outline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              Complete Your Profile
            </Link>
            <Link href="/dashboard" className="btn-outline">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>
              Go to Dashboard
            </Link>
          </div>
        </div>

      </div>
    </>
  )
}
