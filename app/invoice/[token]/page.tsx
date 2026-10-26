import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CopyButton, PaidClaim, PrintButton } from './InvoiceActions'
import { paymentBlocks } from '@/lib/payment-methods'
import { firmLines } from '@/lib/firm-details'
import { billedForLabel } from '@/lib/billed-for'
import { resolveTheme, contrast, tint } from '@/lib/invoice-themes'
import Link from 'next/link'
import { LogoFull } from '@/components/Logo'

type Props = { params: Promise<{ token: string }> }

function fmt(n: number, sym: string) {
  return `${sym}${Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`
}

function fmtDate(d?: string | null) {
  if (!d) return ''
  const date = new Date(`${d.slice(0, 10)}T00:00:00`)
  return isNaN(+date) ? d : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Whole days from today (Botswana time) to the due date; negative when late.
function daysUntil(d?: string | null) {
  if (!d) return null
  const today = new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 10)
  return Math.round((+new Date(`${d.slice(0, 10)}T00:00:00Z`) - +new Date(`${today}T00:00:00Z`)) / 86_400_000)
}

// What the parent sees when they open the link from WhatsApp: what they owe
// and by when first, then how to pay, then the invoice itself.
export default async function PublicInvoicePage({ params }: Props) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*, invoice_items(*)')
    .eq('public_token', token)
    .single()

  if (!invoice) notFound()

  const { data: profile } = await supabase
    .from('profiles')
    .select('firm_name, name, email, phone, address, city, country, vat_number, logo_url, payment_methods, tax_label, invoice_theme, brand_color_primary, brand_color_header, business_type')
    .eq('id', invoice.user_id)
    .single()

  const sym = invoice.currency || 'P'
  const firm = firmLines(profile)
  const t = resolveTheme(profile?.invoice_theme, profile?.brand_color_primary, profile?.brand_color_header)
  const senderName = firm.name || 'StagePay'
  const items: any[] = invoice.invoice_items || []
  const paid = invoice.status === 'paid'
  const payBlocks = paid ? [] : paymentBlocks(profile?.payment_methods)
  const discount = Number(invoice.discount_amount) || 0
  const deposit = Number(invoice.deposit_amount) || 0
  const days = paid ? null : daysUntil(invoice.due_date)

  const status = paid ? 'Paid. Thank you.'
    : days === null ? ''
    : days < 0 ? `Overdue by ${-days} day${days === -1 ? '' : 's'}`
    : days === 0 ? 'Due today'
    : `Due in ${days} day${days === 1 ? '' : 's'}`

  // The summary panel takes the business's own header colour; the amount takes
  // their accent when it reads well on it.
  const panelBg = t.headerBg
  const panelFg = t.headerFirmColor
  const panelText = contrast('#FAF7F0', panelBg) >= contrast('#1F2A44', panelBg) ? '#FAF7F0' : '#1F2A44'
  const amountFg = contrast(t.grandRowBg, panelBg) >= 3 ? t.grandRowBg : panelFg
  const late = days !== null && days < 0

  return (
    <>
      <style>{CSS}</style>
      <main className="pi" style={{
        ['--panel-bg' as string]: panelBg, ['--panel-fg' as string]: panelFg, ['--panel-sub' as string]: t.headerSubColor, ['--panel-text' as string]: panelText,
        ['--amount' as string]: amountFg, ['--btn-bg' as string]: t.grandRowBg, ['--btn-fg' as string]: t.grandRowText,
        ['--accent' as string]: t.accentColor, ['--accent-pale' as string]: /^#[0-9a-f]{6}$/i.test(t.accentColor) ? tint(t.accentColor, .88) : '#FCEFC7',
      }}>

        <section className="pi-sum" aria-labelledby="pi-title">
          <p className="pi-from">{senderName}</p>
          <h1 id="pi-title" className="pi-h1">
            {paid ? 'Invoice paid' : 'Invoice for you'}
            <span className="pi-num"> · {invoice.invoice_number}</span>
          </h1>
          <p className="pi-amount">{fmt(invoice.total, sym)}</p>
          <p className={`pi-status${late ? ' late' : ''}${paid ? ' paid' : ''}`}>
            {status}{!paid && invoice.due_date ? `${status ? ' · ' : ''}${fmtDate(invoice.due_date)}` : ''}
          </p>
          {!paid && deposit > 0 && <p className="pi-deposit">A deposit of <b>{fmt(deposit, sym)}</b> is due now.</p>}
          <div className="pi-actions">
            <a className="pi-btn" href={`/invoice/${token}/pdf`}>Download PDF</a>
            <PrintButton />
          </div>
        </section>

        {payBlocks.length > 0 && (
          <section className="pi-pay" aria-labelledby="pi-pay-h">
            <h2 id="pi-pay-h" className="pi-h2">How to pay</h2>
            <div className="pi-methods">
              {payBlocks.map((b, i) => (
                <div key={i} className="pi-method">
                  <h3>{b.title}</h3>
                  <dl>
                    {b.rows.map(([l, v]) => (
                      <div key={l} className="pi-row">
                        <dt>{l}</dt>
                        <dd><span>{v}</span>{/number/i.test(l) && <CopyButton value={v} label={`${b.title} ${l.toLowerCase()}`} />}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
            <p className="pi-ref">
              <span>Use <b>{invoice.invoice_number}</b> as the payment reference.</span>
              <CopyButton value={invoice.invoice_number} label="payment reference" />
            </p>
          </section>
        )}

        {(invoice.status === 'sent' || invoice.status === 'overdue') && (
          <section className="pi-pay pi-claim-sec" aria-label="Already paid?">
            <PaidClaim token={token} senderName={senderName} claimedRef={invoice.payment_claimed_at ? invoice.payment_claim_ref ?? '' : null} />
          </section>
        )}

        <article className="pi-doc" aria-label={`Invoice ${invoice.invoice_number}`}>
          <header className="pi-doc-top">
            <div>
              {profile?.logo_url && <img className="pi-logo" src={profile.logo_url} alt={`${senderName} logo`} />}
              <p className="pi-firm">{senderName}</p>
              <p className="pi-small">
                {firm.address && <>{firm.address}<br /></>}
                {firm.contact && <>{firm.contact}<br /></>}
                {firm.vat}
              </p>
            </div>
            <dl className="pi-meta">
              <div><dt>Invoice</dt><dd>{invoice.invoice_number}</dd></div>
              <div><dt>Issued</dt><dd>{fmtDate(invoice.issue_date)}</dd></div>
              {invoice.due_date && <div><dt>Due</dt><dd>{fmtDate(invoice.due_date)}</dd></div>}
            </dl>
          </header>

          <div className="pi-bill">
            <div>
              <p className="pi-label">Bill to</p>
              <p className="pi-bill-name">{invoice.client_name}</p>
              {invoice.billed_for && <p className="pi-small pi-ink">{billedForLabel(profile?.business_type)}: <b>{invoice.billed_for}</b></p>}
              <p className="pi-small">
                {invoice.client_address && <>{invoice.client_address}<br /></>}
                {invoice.client_email && <>{invoice.client_email}<br /></>}
                {invoice.client_phone}
              </p>
            </div>
            {invoice.project && (
              <div>
                <p className="pi-label">For</p>
                <p className="pi-small pi-ink">{invoice.project}</p>
              </div>
            )}
          </div>

          <table className="pi-items">
            <thead>
              <tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th></tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="pi-desc">{item.description}<span className="pi-qty-m">{Number(item.quantity)} × {fmt(item.unit_price, sym)}</span></td>
                  <td>{Number(item.quantity)}</td>
                  <td>{fmt(item.unit_price, sym)}</td>
                  <td className="pi-amt">{fmt(item.amount, sym)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="pi-totals">
            <div><dt>Subtotal</dt><dd>{fmt(invoice.subtotal, sym)}</dd></div>
            {discount > 0 && <div><dt>Discount</dt><dd>−{fmt(discount, sym)}</dd></div>}
            {Number(invoice.vat_rate) > 0 && <div><dt>{profile?.tax_label || 'VAT'} ({Number(invoice.vat_rate)}%)</dt><dd>{fmt(invoice.vat_amount, sym)}</dd></div>}
            <div className="pi-grand"><dt>{paid ? 'Total paid' : 'Total due'}</dt><dd>{fmt(invoice.total, sym)}</dd></div>
            {!paid && deposit > 0 && <div className="pi-dep"><dt>Deposit due now</dt><dd>{fmt(deposit, sym)}</dd></div>}
          </dl>

          {invoice.notes && (
            <div className="pi-notes">
              <p className="pi-label">Notes</p>
              <p className="pi-small pi-ink">{invoice.notes}</p>
            </div>
          )}
        </article>

        <footer className="pi-foot">
          <span>Sent with</span>
          <Link href="/" aria-label="StagePay"><LogoFull tone="default" /></Link>
        </footer>
      </main>
    </>
  )
}

const CSS = `
  body{background:#F4F0E8 !important;}
  .pi{font-family:var(--font-manrope),-apple-system,'Segoe UI',sans-serif;color:#1F2A44;max-width:760px;margin:0 auto;padding:24px 16px 40px;display:grid;gap:16px;}

  .pi-sum{background:var(--panel-bg);color:var(--panel-fg);border-radius:20px;padding:28px 32px 26px;}
  .pi-from{font-size:16px;font-weight:700;color:var(--panel-fg);}
  .pi-h1{font-size:15px;font-weight:600;color:var(--panel-sub);margin-top:2px;}
  .pi-num{font-variant-numeric:tabular-nums;}
  .pi-amount{font-size:clamp(44px,11vw,64px);font-weight:800;letter-spacing:-.035em;line-height:1.05;color:var(--amount);margin-top:18px;font-variant-numeric:tabular-nums;}
  .pi-status{font-size:16px;font-weight:600;color:var(--panel-text);margin-top:8px;}
  .pi-status.late::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:#E5484D;margin-right:8px;vertical-align:1px;}
  .pi-status.paid::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;background:#1DA851;margin-right:8px;vertical-align:1px;}
  .pi-deposit{font-size:15px;color:var(--panel-sub);margin-top:6px;}
  .pi-deposit b{color:var(--panel-text);}
  .pi-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px;}
  .pi-btn{display:inline-flex;align-items:center;justify-content:center;height:46px;padding:0 22px;border-radius:999px;border:0;background:var(--btn-bg);color:var(--btn-fg);font:700 15px var(--font-manrope),sans-serif;text-decoration:none;cursor:pointer;transition:transform .12s,filter .15s;}
  .pi-btn:hover{filter:brightness(1.06);}
  .pi-btn:active{transform:scale(.98);}
  .pi-btn-2{background:transparent;color:var(--panel-text);box-shadow:inset 0 0 0 1.5px currentColor;}
  .pi-btn:focus-visible,.pi-copy:focus-visible,.pi-foot a:focus-visible{outline:2px solid var(--accent);outline-offset:2px;}

  .pi-pay{background:#FFFFFF;border-radius:20px;padding:24px 32px;}
  .pi-h2{font-size:20px;font-weight:800;letter-spacing:-.015em;}
  .pi-methods{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin-top:14px;}
  .pi-method{background:#F7F4EE;border-radius:14px;padding:16px 18px;}
  .pi-method h3{font-size:15px;font-weight:800;}
  .pi-method dl{margin-top:8px;display:grid;gap:6px;}
  .pi-row{display:grid;gap:1px;}
  .pi-row dt{font-size:13px;color:#5B6475;}
  .pi-row dd{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:16px;font-weight:700;font-variant-numeric:tabular-nums;word-break:break-word;}
  .pi-copy{flex:none;height:32px;padding:0 12px;border-radius:999px;border:0;background:var(--accent-pale);color:#1F2A44;font:700 13px var(--font-manrope),sans-serif;cursor:pointer;transition:transform .12s;}
  .pi-copy:active{transform:scale(.96);}
  .pi-ref{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:14px;font-size:15px;color:#3D4659;}
  .pi-ref b{color:#1F2A44;}
  .pi-claim p{font-size:15px;color:#3D4659;margin-top:6px;line-height:1.5;}
  .pi-claim p b{color:#1F2A44;word-break:break-word;}
  .pi-claim label{display:block;font-size:14px;font-weight:600;color:#3D4659;margin-top:12px;}
  .pi-in{display:block;width:100%;max-width:420px;height:46px;margin-top:6px;padding:0 14px;border-radius:12px;border:1.5px solid #D8D2C6;background:#FFFFFF;color:#1F2A44;font:600 16px var(--font-manrope),sans-serif;}
  .pi-in:focus{outline:2px solid var(--accent);outline-offset:1px;border-color:transparent;}
  .pi-err{color:#B42318 !important;font-weight:600;}
  .pi-claim-btns{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;}
  .pi-btn-3{background:transparent;color:#1F2A44;box-shadow:inset 0 0 0 1.5px #1F2A44;}
  .pi-btn:disabled{opacity:.6;cursor:default;}

  .pi-doc{background:#FFFFFF;border-radius:20px;padding:32px;}
  .pi-doc-top{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;}
  .pi-logo{display:block;max-height:48px;max-width:180px;object-fit:contain;margin-bottom:10px;}
  .pi-firm{font-size:20px;font-weight:800;color:var(--accent);}
  .pi-small{font-size:14px;line-height:1.6;color:#5B6475;margin-top:4px;}
  .pi-ink{color:#1F2A44;}
  .pi-meta{display:grid;grid-template-columns:auto auto;gap:4px 16px;align-content:start;font-size:14px;}
  .pi-meta div{display:contents;}
  .pi-meta dt{color:#5B6475;}
  .pi-meta dd{font-weight:700;text-align:right;font-variant-numeric:tabular-nums;}
  .pi-bill{display:flex;justify-content:space-between;gap:24px;flex-wrap:wrap;margin-top:28px;}
  .pi-label{font-size:13px;font-weight:600;color:#5B6475;}
  .pi-bill-name{font-size:17px;font-weight:800;margin-top:2px;}

  .pi-items{width:100%;border-collapse:collapse;margin-top:24px;font-size:15px;font-variant-numeric:tabular-nums;}
  .pi-items th{font-size:13px;font-weight:600;color:#5B6475;text-align:right;padding:0 0 10px;border-bottom:1.5px solid #E4DDCF;}
  .pi-items th:first-child{text-align:left;}
  .pi-items td{padding:12px 0;border-bottom:1px solid #EFEAE0;text-align:right;}
  .pi-items td:first-child{text-align:left;padding-right:12px;}
  .pi-items th+th,.pi-items td+td{padding-left:16px;}
  .pi-amt{font-weight:700;}
  .pi-qty-m{display:none;}

  .pi-totals{margin:16px 0 0 auto;max-width:320px;display:grid;gap:8px;font-size:15px;font-variant-numeric:tabular-nums;}
  .pi-totals div{display:flex;justify-content:space-between;gap:16px;}
  .pi-totals dt{color:#5B6475;}
  .pi-grand{background:var(--btn-bg);color:var(--btn-fg);border-radius:12px;padding:12px 14px;margin-top:4px;font-weight:800;font-size:17px;}
  .pi-grand dt{color:inherit;}
  .pi-dep{font-weight:700;}
  .pi-notes{margin-top:24px;}

  .pi-foot{display:flex;align-items:center;justify-content:center;gap:8px;font-size:13px;color:#5B6475;padding-top:8px;}
  .pi-foot svg{height:18px;width:auto;display:block;}

  @media(max-width:560px){
    .pi{padding:12px 12px 32px;gap:12px;}
    .pi-sum,.pi-pay,.pi-doc{padding:22px 20px;border-radius:16px;}
    .pi-actions .pi-btn{flex:1;}
    .pi-items thead,.pi-items td:nth-child(2),.pi-items td:nth-child(3){display:none;}
    .pi-items td+td{padding-left:12px;}
    .pi-items tr:first-child td{border-top:1.5px solid #E4DDCF;}
    .pi-qty-m{display:block;font-size:13px;color:#5B6475;margin-top:2px;}
    .pi-totals{max-width:none;}
    .pi-meta dd{text-align:left;}
  }
  @media print{
    body{background:#FFFFFF !important;}
    .pi{padding:0;max-width:none;}
    .pi-actions,.pi-copy,.pi-foot,.pi-pay .pi-copy,.pi-claim-sec{display:none !important;}
    .pi-sum{border:1px solid #DDD;}
    .pi-sum,.pi-pay,.pi-doc{break-inside:avoid;}
  }
`
