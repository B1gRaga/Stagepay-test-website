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
  .page-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2.5px;color:var(--t1);}
  .topbar-right{display:flex;align-items:center;gap:10px;}
  .topbar-btn{
    display:flex;align-items:center;gap:7px;
    padding:7px 15px;border-radius:6px;font-size:12px;font-weight:600;
    cursor:pointer;transition:all .15s;border:none;letter-spacing:.05em;
    text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;
  }
  .btn-primary{background:var(--g);color:var(--bg);box-shadow:0 2px 8px rgba(16,185,129,.2);}
  .btn-primary:hover{background:#34d399;transform:translateY(-1px);box-shadow:0 4px 14px rgba(16,185,129,.3);}
  .btn-outline{
    display:flex;align-items:center;gap:7px;
    padding:9px 20px;border-radius:6px;font-size:12px;font-weight:600;
    cursor:pointer;transition:all .15s;border:1px solid var(--line2);letter-spacing:.05em;
    text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;
    background:transparent;color:var(--t2);
  }
  .btn-outline:hover{border-color:var(--g);color:var(--g);}

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
    background:linear-gradient(90deg,var(--g) 0%,transparent 50%);opacity:.8;
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
  .progress-steps{display:flex;gap:4px;flex-wrap:wrap;}
  .progress-step{
    display:flex;align-items:center;gap:7px;
    font-size:11px;font-weight:600;color:var(--t3);
    text-transform:uppercase;letter-spacing:.05em;
    padding:6px 12px;border-radius:6px;
    background:var(--surface);flex:1 1 auto;min-width:100px;
    transition:background .2s,color .2s;
  }
  .progress-step.done{background:var(--g-dim);color:var(--g);}
  .ps-num{
    width:18px;height:18px;border-radius:50%;
    background:var(--surface2);color:var(--t3);
    font-size:10px;font-weight:700;
    display:flex;align-items:center;justify-content:center;flex-shrink:0;
  }
  .progress-step.done .ps-num{background:var(--g);color:var(--bg);}

  /* steps */
  .steps-grid{display:flex;flex-direction:column;gap:14px;}
  .step-card{
    background:var(--bg2);border:1px solid var(--line);border-radius:12px;
    overflow:hidden;transition:border-color .2s;
    animation:cardIn .35s ease both;
  }
  .step-card:hover{border-color:var(--line2);}
  @keyframes cardIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

  .step-header{display:flex;align-items:flex-start;gap:16px;padding:20px 22px;}
  .step-num{
    width:36px;height:36px;border-radius:50%;
    background:var(--g-dim);border:1px solid rgba(16,185,129,.25);
    display:flex;align-items:center;justify-content:center;
    font-family:'Bebas Neue',sans-serif;font-size:16px;letter-spacing:1px;
    color:var(--g);flex-shrink:0;margin-top:2px;
  }
  .step-meta{flex:1;}
  .step-label{font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--g);font-weight:600;margin-bottom:4px;}
  .step-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:1.5px;color:var(--t1);margin-bottom:6px;}
  .step-desc{font-size:13px;color:var(--t2);line-height:1.65;}

  .step-divider{height:1px;background:var(--line);}

  .step-body{padding:16px 22px 22px 74px;display:flex;flex-direction:column;gap:12px;}

  .instruction{display:flex;align-items:flex-start;gap:12px;}
  .instr-dot{
    width:22px;height:22px;border-radius:50%;
    background:var(--surface);border:1px solid var(--line2);
    display:flex;align-items:center;justify-content:center;
    font-size:10px;font-weight:700;color:var(--t3);flex-shrink:0;margin-top:2px;
  }
  .instr-text{font-size:13px;color:var(--t2);line-height:1.6;}
  .instr-text strong{color:var(--t1);font-weight:600;}
  .instr-text code{
    background:var(--surface);border:1px solid var(--line2);border-radius:4px;
    padding:1px 6px;font-size:12px;color:var(--g);font-family:'Archivo',monospace;
  }
  .instr-text em{color:var(--t3);font-style:italic;}

  /* tip */
  .tip-box{
    display:flex;align-items:flex-start;gap:10px;
    background:rgba(59,130,246,.07);border:1px solid rgba(59,130,246,.18);
    border-radius:8px;padding:12px 14px;
  }
  .tip-icon{color:#3B82F6;flex-shrink:0;margin-top:1px;}
  .tip-text{font-size:12px;color:var(--t2);line-height:1.6;}
  .tip-text strong{color:var(--t1);}

  /* note (green) */
  .note-box{
    display:flex;align-items:flex-start;gap:10px;
    background:var(--g-dim);border:1px solid rgba(16,185,129,.2);
    border-radius:8px;padding:12px 14px;
  }
  .note-icon{color:var(--g);flex-shrink:0;margin-top:1px;}
  .note-text{font-size:12px;color:var(--t2);line-height:1.6;}
  .note-text strong{color:var(--t1);}

  /* shortcut chips */
  .shortcut-row{display:flex;flex-wrap:wrap;gap:8px;}
  .shortcut-chip{
    display:flex;align-items:center;gap:7px;
    background:var(--surface);border:1px solid var(--line2);border-radius:8px;
    padding:7px 12px;
  }
  kbd{
    background:var(--bg);border:1px solid var(--line2);border-radius:4px;
    padding:2px 7px;font-size:12px;font-weight:700;color:var(--t1);
    font-family:'Archivo',monospace;letter-spacing:.04em;box-shadow:0 2px 0 var(--line2);
  }
  .shortcut-chip span{font-size:12px;color:var(--t2);}

  /* reminder tiers */
  .tier-row{display:flex;gap:8px;flex-wrap:wrap;}
  .tier-chip{
    display:flex;align-items:center;gap:8px;
    background:var(--surface);border-radius:8px;padding:8px 12px;flex:1 1 auto;min-width:110px;
  }
  .tier-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}

  /* feature grid */
  .feature-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  @media(max-width:560px){.feature-grid{grid-template-columns:1fr;}}
  .feature-item{
    display:flex;align-items:flex-start;gap:10px;
    background:var(--surface);border-radius:8px;padding:10px 12px;
  }
  .feature-icon{
    width:28px;height:28px;border-radius:6px;
    background:var(--g-dim);display:flex;align-items:center;justify-content:center;flex-shrink:0;
  }
  .feature-name{font-size:12px;font-weight:600;color:var(--t1);margin-bottom:2px;}
  .feature-desc{font-size:11px;color:var(--t3);line-height:1.5;}

  /* status pills */
  .status-row{display:flex;flex-wrap:wrap;gap:6px;}
  .status-pill{
    font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;
    letter-spacing:.04em;text-transform:uppercase;
  }

  /* cta */
  .cta-card{
    background:var(--bg2);border:1px solid var(--line2);border-radius:12px;
    padding:28px 32px;margin-top:22px;text-align:center;
    background-image:radial-gradient(ellipse at 50% 100%,var(--g-glow),transparent 60%);
    position:relative;overflow:hidden;
  }
  .cta-card::before{
    content:'';position:absolute;bottom:0;left:20%;right:20%;height:1px;
    background:linear-gradient(90deg,transparent,var(--g),transparent);opacity:.6;
  }
  .cta-title{font-family:'Bebas Neue',sans-serif;font-size:26px;letter-spacing:2px;color:var(--t1);margin-bottom:8px;}
  .cta-sub{font-size:13px;color:var(--t2);margin-bottom:20px;}
  .cta-actions{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;}

  @media(max-width:640px){
    .content{padding:20px 16px 60px;}
    .hero{padding:24px 20px;flex-direction:column;gap:16px;}
    .hero-icon{display:none;}
    .step-header{padding:16px;}
    .step-body{padding:12px 16px 16px;}
  }
`

type Step = {
  num: string
  label: string
  title: string
  desc: string
  instructions: { text: React.ReactNode }[]
  tip?: { title: string; body: string }
  note?: { title: string; body: string }
  extra?: string
}

const STEPS: Step[] = [
  {
    num: '01',
    label: 'First things first',
    title: 'Set Up Your Profile',
    desc: 'Add your business details so every invoice looks professional from day one.',
    instructions: [
      { text: <>Click <strong>Settings</strong> in the left sidebar.</> },
      { text: <>Under <strong>Firm Details</strong>, fill in your business name, your name, phone number, and address.</> },
      { text: <>Under <strong>Invoice Defaults</strong>, choose your <strong>currency</strong> and <strong>VAT rate</strong> — these will pre-fill on every new invoice.</> },
      { text: <>Under <strong>Payment & Banking</strong>, add your bank account details. These appear in the footer of every invoice you send.</> },
      { text: <>Toggle the <strong>light/dark theme</strong> using the icon at the top-right — StagePay looks clean on both.</> },
    ],
    tip: { title: 'Set once, apply everywhere:', body: 'Your currency, VAT rate, and bank details are saved globally and auto-applied to every new invoice. You can override any of them per-invoice.' },
  },
  {
    num: '02',
    label: 'Core feature',
    title: 'Create an Invoice with AI',
    desc: 'Describe the work in plain English. StagePay\'s AI reads your description and builds the invoice — line items, deposits, VAT, due dates, all of it.',
    instructions: [
      { text: <>Click <strong>New Invoice</strong> in the sidebar or press <code>N</code> anywhere in the app.</> },
      { text: <>In the text box, <strong>describe the job in plain English</strong>. For example: <em>"Brand identity for Kgosi Holdings — logo, stationery, brand guide. R45,000 total, 50% deposit, 14-day terms, 15% VAT"</em></> },
      { text: <>Click <strong>Generate Invoice</strong>. The live preview on the right builds in real time — client, line items, deposit amount, balance due, VAT, and due date.</> },
      { text: <>Click any field in the preview to edit it directly — client name, dates, line items, amounts, notes, terms.</> },
      { text: <>Use the <strong>prompt chips</strong> below the text box (Consulting, Engineering, Design, Legal, Construction) for a quick-start template.</> },
    ],
    tip: { title: 'Deposit tracking:', body: 'If you include a deposit in your description, StagePay splits the invoice into total, deposit due, and balance due — shown clearly on the invoice your client receives.' },
    extra: 'shortcuts',
  },
  {
    num: '03',
    label: 'Delivery',
    title: 'Send via Email or WhatsApp',
    desc: 'Your client gets a link to a professionally formatted invoice page — no attachments, no login required.',
    instructions: [
      { text: <>Click <strong>Send Invoice</strong>. Choose <strong>Email</strong> or <strong>WhatsApp</strong> from the send modal.</> },
      { text: <>For WhatsApp: a contact picker shows your saved clients — select one and hit <strong>Send</strong>.</> },
      { text: <>Your client receives a link. When they open it, they see a <strong>fully branded invoice page</strong> — your firm name, logo, line items, bank details, and payment instructions — no account needed on their side.</> },
      { text: <>Need to resend? Go to <strong>Invoices</strong>, find the invoice, and use the <strong>Forward</strong> action to resend via email or WhatsApp.</> },
      { text: <>The invoice status updates to <strong>Sent</strong> automatically after delivery.</> },
    ],
    note: { title: 'What your client sees:', body: 'A clean, mobile-friendly invoice page at a private URL. It shows all line items, deposit breakdown, your bank details, and payment terms — exactly what they need to pay you.' },
  },
  {
    num: '04',
    label: 'Getting paid',
    title: 'Mark as Paid & Confirm',
    desc: 'When payment arrives, close the loop in one click — and automatically notify your client.',
    instructions: [
      { text: <>Go to <strong>Invoices</strong> (press <code>I</code>). Tick the checkbox on the paid invoice.</> },
      { text: <>The bulk action bar appears at the bottom of the screen. Click <strong>Mark as Paid</strong>.</> },
      { text: <>In the confirmation modal, toggle <strong>Send payment received notification</strong> on. Hit <strong>Confirm</strong>.</> },
      { text: <>StagePay sends your client a payment confirmation via email or WhatsApp — <em>"Payment received — thank you. Invoice #007 is now settled."</em></> },
      { text: <>To download a <strong>PDF with a PAID stamp</strong>, open the invoice and click <strong>Download PDF</strong>. It generates with a stamp overlay for your records.</> },
    ],
    tip: { title: 'Bulk actions:', body: 'You can select multiple invoices at once and mark them all paid in one action. Use the filters (Sent, Overdue) to quickly find invoices waiting on payment.' },
    extra: 'statuses',
  },
  {
    num: '05',
    label: 'Set and forget',
    title: 'Automate Payment Reminders',
    desc: 'StagePay follows up for you — politely at first, more firmly as the invoice ages. You never have to chase anyone manually.',
    instructions: [
      { text: <>Click <strong>Reminders</strong> in the sidebar (or press <code>R</code>).</> },
      { text: <>You'll see all outstanding invoices, colour-coded by urgency — green (on time), yellow (due soon), orange (late), red (overdue).</> },
      { text: <>Toggle <strong>Auto-reminders on</strong> for any invoice. StagePay will follow up automatically at 3, 7, 14, and 30 days.</> },
      { text: <>The auto-reminder cron runs in the background — no action needed after the toggle. Reminders go out via the same channel you used to send the invoice (Email or WhatsApp).</> },
      { text: <>The sidebar shows the <strong>reminder schedule</strong> so you can see exactly which tier each invoice is in and how many reminders have been sent.</> },
    ],
    tip: { title: 'Escalation is automatic:', body: 'The 3-day reminder is a gentle nudge. The 30-day reminder is a firm final notice. StagePay handles the tone — you don\'t need to write any messages.' },
    extra: 'tiers',
  },
  {
    num: '06',
    label: 'The full picture',
    title: 'Track Your Cash Flow',
    desc: 'The dashboard gives you a real-time snapshot of your money — unpaid, overdue, and collected this month.',
    instructions: [
      { text: <>The <strong>Dashboard</strong> shows three stat cards: <strong>Unpaid</strong>, <strong>Overdue</strong>, and <strong>Paid This Month</strong>.</> },
      { text: <>The <strong>Recent Invoices</strong> table below shows your last 20 invoices with status pills and quick links.</> },
      { text: <>On the <strong>Invoices</strong> page, use the status tabs (All / Paid / Sent / Pending / Overdue / Draft) and the search bar to find any invoice instantly.</> },
      { text: <>On the <strong>Clients</strong> page, each client card shows total invoices sent and total amount billed — useful for knowing who your biggest clients are.</> },
    ],
    extra: 'features',
  },
]

function Shortcuts() {
  return (
    <div className="shortcut-row">
      {[{ key: 'N', label: 'New invoice' }, { key: 'I', label: 'Invoices' }, { key: 'R', label: 'Reminders' }].map(s => (
        <div key={s.key} className="shortcut-chip">
          <kbd>{s.key}</kbd>
          <span>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

function Tiers() {
  return (
    <div className="tier-row">
      {[
        { day: '3 days', label: 'Gentle nudge', color: '#10B981' },
        { day: '7 days', label: 'Polite follow-up', color: '#F59E0B' },
        { day: '14 days', label: 'Firm notice', color: '#F97316' },
        { day: '30 days', label: 'Final escalation', color: '#EF4444' },
      ].map(t => (
        <div key={t.day} className="tier-chip">
          <div className="tier-dot" style={{ background: t.color }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>{t.day}</div>
            <div style={{ fontSize: 11, color: 'var(--t3)' }}>{t.label}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Statuses() {
  return (
    <div className="status-row">
      {[
        { label: 'Draft', bg: 'var(--surface)', color: 'var(--t3)' },
        { label: 'Sent', bg: 'rgba(59,130,246,.12)', color: '#3B82F6' },
        { label: 'Pending', bg: 'rgba(245,158,11,.12)', color: '#F59E0B' },
        { label: 'Overdue', bg: 'rgba(239,68,68,.12)', color: '#EF4444' },
        { label: 'Paid', bg: 'rgba(16,185,129,.12)', color: '#10B981' },
        { label: 'Cancelled', bg: 'rgba(248,250,252,.06)', color: 'var(--t3)' },
      ].map(s => (
        <span key={s.label} className="status-pill" style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
      ))}
    </div>
  )
}

function Features() {
  const items = [
    { name: 'AI Invoice Builder', desc: 'Plain English → structured invoice in seconds', icon: '✦' },
    { name: 'Live Preview', desc: 'Right panel updates in real time as you edit', icon: '⊡' },
    { name: 'Deposit Tracking', desc: 'Split invoices into deposit + balance due', icon: '◑' },
    { name: 'Email & WhatsApp', desc: 'Send via either channel, contact picker included', icon: '✉' },
    { name: 'Public Invoice Link', desc: 'Client opens branded URL — no login needed', icon: '⊕' },
    { name: 'Payment Confirmation', desc: 'Auto-notify client when you mark as paid', icon: '✓' },
    { name: 'PDF with PAID Stamp', desc: 'Download stamped PDF for your records', icon: '⬡' },
    { name: 'Auto-Reminders', desc: '3 / 7 / 14 / 30 day schedule, hands-free', icon: '◷' },
    { name: 'Multi-Currency', desc: 'BWP, ZAR, USD, EUR, GBP, KES, NGN + more', icon: '$' },
    { name: 'VAT by Country', desc: '60+ countries with preset VAT rates', icon: '%' },
    { name: 'Light / Dark Mode', desc: 'Toggle at the top-right of any page', icon: '◐' },
    { name: 'Keyboard Shortcuts', desc: 'N, I, R — navigate without touching the mouse', icon: '⌨' },
  ]
  return (
    <div className="feature-grid">
      {items.map(f => (
        <div key={f.name} className="feature-item">
          <div className="feature-icon">
            <span style={{ fontSize: 13, color: 'var(--g)', fontFamily: 'monospace' }}>{f.icon}</span>
          </div>
          <div>
            <div className="feature-name">{f.name}</div>
            <div className="feature-desc">{f.desc}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

const PROGRESS_LABELS = ['Setup Profile', 'Create Invoice', 'Send Invoice', 'Mark as Paid', 'Set Reminders', 'Track & Manage']

export default function TutorialPage() {
  return (
    <>
      <style>{CSS}</style>

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
              Follow these 6 steps to go from sign-up to getting paid — in under 5 minutes.
              StagePay handles the invoicing so you can focus on the work.
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="progress-wrap">
          <div className="progress-label">Setup checklist</div>
          <div className="progress-steps">
            {PROGRESS_LABELS.map((label, i) => (
              <div key={i} className="progress-step">
                <div className="ps-num">{i + 1}</div>
                <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.04em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Steps */}
        <div className="steps-grid">
          {STEPS.map((step, si) => (
            <div key={step.num} className="step-card" style={{ animationDelay: `${si * 0.06}s` }}>
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
                {step.extra === 'tiers' && <Tiers />}
                {step.extra === 'statuses' && <Statuses />}
                {step.extra === 'features' && <Features />}

                {step.note && (
                  <div className="note-box">
                    <svg className="note-icon" width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M5 6h6M5 9h4"/></svg>
                    <div className="note-text"><strong>{step.note.title}</strong> {step.note.body}</div>
                  </div>
                )}

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
          <div className="cta-title">You&apos;re Ready to Go</div>
          <div className="cta-sub">Create your first invoice and start getting paid faster.</div>
          <div className="cta-actions">
            <Link href="/new-invoice" className="topbar-btn btn-primary" style={{ padding: '10px 24px', fontSize: 13 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 3v10M3 8h10"/></svg>
              Create First Invoice
            </Link>
            <Link href="/settings" className="btn-outline">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
              Complete Profile
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
