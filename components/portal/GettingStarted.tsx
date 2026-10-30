import Link from 'next/link'

// Getting started: a checklist of the account's real progress, each step
// linking to where it's done, then a short note on how each part works.
// The page loads the progress; this draws it.

const CSS = `
  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2);}
  .page-title{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--t1);}
  .btn-new{display:inline-flex;align-items:center;gap:8px;height:36px;padding:0 16px;border-radius:8px;background:var(--g);color:#1F2A44;font-size:14px;font-weight:700;text-decoration:none;}
  .btn-new:hover{background:#FFB81C;}
  .btn-new:focus-visible,.gs-go:focus-visible{outline:2px solid var(--g);outline-offset:2px;}
  .content{padding:28px 28px 56px;max-width:880px;}

  .gs-sum{display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-bottom:20px;}
  .gs-h{font-size:24px;font-weight:800;letter-spacing:-.02em;color:var(--t1);}
  .gs-sub{font-size:15px;color:var(--t2);margin-top:4px;line-height:1.5;max-width:52ch;}
  .gs-count{font-size:15px;font-weight:700;color:var(--t1);font-variant-numeric:tabular-nums;white-space:nowrap;}
  .gs-bar{display:flex;gap:4px;margin-bottom:24px;}
  .gs-bar i{flex:1;height:6px;border-radius:3px;background:var(--surface2);}
  .gs-bar i.on{background:var(--g);}

  .gs-list{list-style:none;margin:0;padding:0;border:1px solid var(--line);border-radius:12px;background:var(--bg2);overflow:hidden;}
  .gs-row{display:grid;grid-template-columns:28px 1fr auto;gap:14px;align-items:center;padding:16px 18px;border-top:1px solid var(--line);}
  .gs-row:first-child{border-top:0;}
  .gs-tick{width:24px;height:24px;border-radius:50%;box-shadow:inset 0 0 0 1.5px var(--line2);display:grid;place-items:center;}
  .gs-row.done .gs-tick{background:var(--g);box-shadow:none;color:#1F2A44;}
  .gs-title{font-size:15px;font-weight:700;color:var(--t1);}
  .gs-row.done .gs-title{color:var(--t2);}
  .gs-what{font-size:14px;color:var(--t2);margin-top:2px;line-height:1.45;}
  .gs-go{display:inline-flex;align-items:center;height:34px;padding:0 14px;border-radius:8px;font-size:14px;font-weight:600;text-decoration:none;color:var(--t1);box-shadow:inset 0 0 0 1px var(--line2);white-space:nowrap;}
  .gs-go:hover{box-shadow:inset 0 0 0 1px var(--t3);}
  .gs-row.next .gs-go{background:var(--g);color:#1F2A44;box-shadow:none;}
  .gs-row.next .gs-go:hover{background:#FFB81C;}
  .gs-done{font-size:14px;color:var(--t3);}

  .gs-how{margin-top:40px;}
  .gs-how h2{font-size:18px;font-weight:800;letter-spacing:-.01em;color:var(--t1);margin-bottom:14px;}
  .gs-dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px 32px;}
  .gs-dl dt{font-size:15px;font-weight:700;color:var(--t1);}
  .gs-dl dd{font-size:14px;color:var(--t2);line-height:1.55;margin-top:4px;}
  .gs-dl a{color:var(--t1);font-weight:600;}

  @media(max-width:700px){
    .topbar{padding:0 16px;}
    .btn-new{display:none;}
    .content{padding:18px 16px 40px;}
    .gs-row{grid-template-columns:24px 1fr;padding:14px;}
    .gs-row > :last-child{grid-column:2;justify-self:start;}
    .gs-row.done > .gs-done{display:none;}
    .gs-dl{grid-template-columns:1fr;}
  }
`

export type Progress = {
  hasDetails: boolean
  hasPayment: boolean
  hasLogo: boolean
  invoices: number
  sent: number
  paid: number
  reminders: number
}

type Step = { title: string; what: string; href: string; go: string; done: boolean; optional?: boolean }

export function GettingStarted({ progress: g }: { progress: Progress }) {
  const steps: Step[] = [
    { title: 'Add your business details', what: 'Your business name, phone and address print at the top of every invoice.', href: '/settings?panel=firm', go: 'Firm details', done: g.hasDetails },
    { title: 'Add how clients pay you', what: 'Bank account, Orange Money, MyZaka or Smega. Clients see these on the invoice, with copy buttons.', href: '/settings?panel=payment', go: 'Getting paid', done: g.hasPayment },
    { title: 'Add your logo', what: 'Optional. Pick one of five templates and your own colours while you’re there.', href: '/settings?panel=brand', go: 'Branding', done: g.hasLogo, optional: true },
    { title: 'Make your first invoice', what: 'Who it’s for, what it’s for and when it’s due. VAT and totals are worked out for you.', href: '/new-invoice', go: 'New invoice', done: g.invoices > 0 },
    { title: 'Send it on WhatsApp or email', what: 'Your client gets a link to their invoice page and the PDF. No account needed on their side.', href: '/invoices', go: 'Invoices', done: g.sent > 0 },
    { title: 'Turn on reminders', what: 'StagePay follows up 3, 7 and 14 days after the due date until it’s paid.', href: '/reminders', go: 'Reminders', done: g.reminders > 0 },
    { title: 'Mark an invoice paid', what: 'One tap on the invoice when the money arrives. Then send the client a receipt.', href: '/invoices', go: 'Invoices', done: g.paid > 0 },
  ]
  const doneCount = steps.filter(s => s.done).length
  // The step to do next skips optional ones.
  const next = steps.findIndex(s => !s.done && !s.optional)

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <h1 className="page-title">Getting started</h1>
        <Link href="/new-invoice" className="btn-new press">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
          New invoice
        </Link>
      </div>

      <div className="content">
        <div className="gs-sum">
          <div>
            <h2 className="gs-h">{doneCount === steps.length ? 'You’re all set up' : 'Set up once, then StagePay chases for you'}</h2>
            <p className="gs-sub">{doneCount === steps.length
              ? 'Everything’s in place. Invoices go out, reminders follow, and you mark them paid.'
              : 'Seven steps from a new account to your first paid invoice. Each one ticks itself off as you go.'}</p>
          </div>
          <span className="gs-count">{doneCount} of {steps.length} done</span>
        </div>
        <div className="gs-bar" aria-hidden="true">{steps.map((s, i) => <i key={i} className={s.done ? 'on' : ''} />)}</div>

        <ol className="gs-list">
          {steps.map((s, i) => (
            <li key={s.title} className={`gs-row${s.done ? ' done' : ''}${i === next ? ' next' : ''}`}>
              <span className="gs-tick" role="img" aria-label={s.done ? 'Done' : 'Not done yet'}>
                {s.done && <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8.5l3.2 3L13 4.5"/></svg>}
              </span>
              <div>
                <div className="gs-title">{s.title}</div>
                <div className="gs-what">{s.what}</div>
              </div>
              {s.done ? <span className="gs-done">Done</span> : <Link href={s.href} className="gs-go press">{s.go}</Link>}
            </li>
          ))}
        </ol>

        <section className="gs-how" aria-labelledby="gs-how-h">
          <h2 id="gs-how-h">How it works</h2>
          <dl className="gs-dl">
            <div>
              <dt>Sending</dt>
              <dd>On the invoice, choose WhatsApp or email. WhatsApp opens a chat with the message and link ready; email sends the PDF with it.</dd>
            </div>
            <div>
              <dt>What your client sees</dt>
              <dd>A page with the amount, the due date, how to pay with copy buttons for account numbers, and the PDF to download.</dd>
            </div>
            <div>
              <dt>Reminders</dt>
              <dd>On by default at 3, 7 and 14 days after the due date; add 30 days if you like. Email is always used; WhatsApp once your WhatsApp Business setup is done. Set it on <Link href="/reminders">Reminders</Link>.</dd>
            </div>
            <div>
              <dt>Getting paid</dt>
              <dd>Mark the invoice paid when the money arrives (you can undo it). Reminders stop, and the send buttons then send a receipt.</dd>
            </div>
            <div>
              <dt>Monthly fees</dt>
              <dd>Under More options on a new invoice, set it to repeat monthly, quarterly or yearly. The next one is made for you.</dd>
            </div>
            <div>
              <dt>Your invoice’s look</dt>
              <dd>Five templates, your colours and logo, on A4 or A5 paper. Change it any time in <Link href="/settings?panel=brand">Branding</Link>.</dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  )
}
