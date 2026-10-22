import type { ReactElement } from 'react'
import { renderToBuffer, Document, Page, Text, View, Image, Font } from '@react-pdf/renderer'
import { resolveTheme, contrast, tint, type InvoiceTheme } from './invoice-themes'
import { paymentBlocks } from './payment-methods'
import { firmLines } from './firm-details'

// Five invoice templates, each its own layout. They share one reading order,
// the same as the page a client opens from WhatsApp: who it's from, the big
// INVOICE, what is owed and by when, the items, how to pay, then notes.
// Colour is used sparingly: the business's accent and header colour (from
// Branding) go where each layout says, and everything else is ink on paper.

const INK   = '#1F2A44'
const BODY  = '#2B3448'
const MUTED = '#6B7280'
const LINE  = '#E5E7EB'
const PAPER = '#FFFFFF'

// Never split words across lines ("pay-ment").
Font.registerHyphenationCallback(word => [word])

type Paper = 'A4' | 'A5'

type Doc = {
  invoice: Record<string, any>
  items:   Record<string, any>[]
  profile: Record<string, any>
  paid:    boolean
  t:       InvoiceTheme
  paper:   Paper
  s:       (n?: number) => number   // spacing and sizes: shrink with the page
  fz:      (n: number) => number    // type: shrinks less, so A5 stays readable
}

// Every layout is drawn for A4; A5 is the same layout on a page 0.71 the size.
function scalers(paper: Paper) {
  const k = paper === 'A5' ? 420 / 595 : 1
  const kf = paper === 'A5' ? 0.8 : 1
  return {
    s: (n?: number) => (n == null ? (undefined as unknown as number) : Math.round(n * k * 10) / 10),
    fz: (n: number) => Math.round(n * kf * 10) / 10,
  }
}

// ─── shared helpers ───────────────────────────────────────────────────────────

function money(invoice: Record<string, any>) {
  const sym = invoice.currency || 'P'
  return (n: unknown) => `${sym}${Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function longDate(d?: string | null) {
  if (!d) return ''
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00Z`)
  return isNaN(+date) ? String(d) : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Text in the accent colour only where it reads on white; otherwise ink.
function accentInk(t: InvoiceTheme) {
  return contrast(t.accentColor, PAPER) >= 3 ? t.accentColor : INK
}
function onColour(bg: string) {
  return contrast(PAPER, bg) >= contrast(INK, bg) ? PAPER : INK
}

function facts(d: Doc) {
  const fmt = money(d.invoice)
  const firm = firmLines(d.profile)
  const deposit = Number(d.invoice.deposit_amount) || 0
  return {
    fmt,
    firm,
    firmName: firm.name || 'Your business',
    payBlocks: d.paid ? [] : paymentBlocks(d.profile.payment_methods),
    discount: Number(d.invoice.discount_amount) || 0,
    vatOn: Number(d.invoice.vat_rate) > 0,
    taxLabel: d.profile.tax_label || 'VAT',
    deposit: d.paid ? 0 : deposit,
    issued: longDate(d.invoice.issue_date),
    due: longDate(d.invoice.due_date),
    clientLines: [d.invoice.client_address, d.invoice.client_email, d.invoice.client_phone].filter(Boolean) as string[],
  }
}

function Logo({ url, size = 40 }: { url?: string | null; size?: number }) {
  if (!url) return null
  // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image draws into the PDF; it has no alt prop
  return <Image src={url} style={{ width: size, height: size, objectFit: 'contain' }} />
}

function Items({ d, head = MUTED, rule = LINE, size = 9.5 }: { d: Doc; head?: string; rule?: string; size?: number }) {
  const { s, fz } = d
  const { fmt } = facts(d)
  const cell = { fontSize: fz(size), color: BODY }
  return (
    <View>
      <View style={{ flexDirection: 'row', paddingBottom: s(6), borderBottomWidth: s(1), borderBottomColor: rule, borderBottomStyle: 'solid' }}>
        <Text style={{ flex: 5, fontSize: fz(8.5), color: head }}>Item</Text>
        <Text style={{ flex: 1, fontSize: fz(8.5), color: head, textAlign: 'right' }}>Qty</Text>
        <Text style={{ flex: 2, fontSize: fz(8.5), color: head, textAlign: 'right' }}>Rate</Text>
        <Text style={{ flex: 2, fontSize: fz(8.5), color: head, textAlign: 'right' }}>Amount</Text>
      </View>
      {d.items.map((it, i) => (
        <View key={i} wrap={false} style={{ flexDirection: 'row', paddingVertical: s(8), borderBottomWidth: s(0.6), borderBottomColor: rule, borderBottomStyle: 'solid' }}>
          <Text style={{ ...cell, flex: 5, paddingRight: s(8) }}>{it.description}</Text>
          <Text style={{ ...cell, flex: 1, textAlign: 'right', color: MUTED }}>{Number(it.quantity)}</Text>
          <Text style={{ ...cell, flex: 2, textAlign: 'right', color: MUTED }}>{fmt(it.unit_price)}</Text>
          <Text style={{ ...cell, flex: 2, textAlign: 'right', fontFamily: 'Helvetica-Bold', color: INK }}>{fmt(it.amount)}</Text>
        </View>
      ))}
    </View>
  )
}

// Subtotal, discount and tax lines; each template sets its own total line.
function Sums({ d, width = '50%' }: { d: Doc; width?: string }) {
  const { s, fz } = d
  const f = facts(d)
  const row = (l: string, v: string) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: s(5) }}>
      <Text style={{ fontSize: fz(9.5), color: MUTED }}>{l}</Text>
      <Text style={{ fontSize: fz(9.5), color: BODY }}>{v}</Text>
    </View>
  )
  return (
    <View style={{ alignSelf: 'flex-end', width }}>
      {row('Subtotal', f.fmt(d.invoice.subtotal))}
      {f.discount > 0 && row('Discount', `– ${f.fmt(f.discount)}`)}
      {f.vatOn && row(`${f.taxLabel} (${Number(d.invoice.vat_rate)}%)`, f.fmt(d.invoice.vat_amount))}
    </View>
  )
}

function PayDetails({ d, color = BODY, sub = MUTED, title = 'How to pay', compact = false }: {
  d: Doc; color?: string; sub?: string; title?: string; compact?: boolean
}) {
  const { s, fz } = d
  const f = facts(d)
  if (!f.payBlocks.length) return null
  return (
    <View wrap={false}>
      <Text style={{ fontSize: fz(compact ? 10 : 11), fontFamily: 'Helvetica-Bold', color }}>{title}</Text>
      <View style={{ flexDirection: compact ? 'column' : 'row', flexWrap: 'wrap', gap: s(compact ? 8 : 18), marginTop: s(6) }}>
        {f.payBlocks.map((b, i) => (
          <View key={i} style={{ minWidth: s(compact ? undefined : 150) }}>
            <Text style={{ fontSize: fz(9.5), fontFamily: 'Helvetica-Bold', color }}>{b.title}</Text>
            {b.rows.map(([l, v]) => compact ? (
              // Narrow columns: label above value, so neither breaks mid-word.
              <View key={l} style={{ marginTop: s(3) }}>
                <Text style={{ fontSize: fz(8.5), color: sub }}>{l}</Text>
                <Text style={{ fontSize: fz(9.5), color, fontFamily: 'Helvetica-Bold' }}>{v}</Text>
              </View>
            ) : (
              <Text key={l} style={{ fontSize: fz(9), color: sub, marginTop: s(2) }}>
                {l}: <Text style={{ color, fontFamily: 'Helvetica-Bold' }}>{v}</Text>
              </Text>
            ))}
          </View>
        ))}
      </View>
      <Text style={{ fontSize: fz(9), color: sub, marginTop: s(8) }}>
        Use <Text style={{ color, fontFamily: 'Helvetica-Bold' }}>{d.invoice.invoice_number}</Text> as the payment reference.
      </Text>
    </View>
  )
}

function Notes({ d, color = BODY, sub = MUTED }: { d: Doc; color?: string; sub?: string }) {
  const { s, fz } = d
  if (!d.invoice.notes) return null
  return (
    <View wrap={false}>
      <Text style={{ fontSize: fz(10), fontFamily: 'Helvetica-Bold', color }}>Notes</Text>
      <Text style={{ fontSize: fz(9), color: sub, marginTop: s(4), lineHeight: 1.5 }}>{d.invoice.notes}</Text>
    </View>
  )
}

function Footer({ d, color = MUTED, left = 44, right = 44 }: { d: Doc; color?: string; left?: number; right?: number }) {
  const { s, fz } = d
  return (
    <View fixed style={{ position: 'absolute', bottom: s(24), left: s(left), right: s(right), flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ fontSize: fz(7.5), color }}>Sent with StagePay</Text>
      <Text style={{ fontSize: fz(7.5), color }} render={({ pageNumber, totalPages }) => `${d.invoice.invoice_number}  ·  Page ${pageNumber} of ${totalPages}`} />
    </View>
  )
}

function DueLine({ d, color, sub }: { d: Doc; color: string; sub: string }) {
  const { s, fz } = d
  const f = facts(d)
  if (d.paid) return <Text style={{ fontSize: fz(10.5), color }}>Paid in full. Thank you.</Text>
  return (
    <View>
      <Text style={{ fontSize: fz(10.5), color }}>{f.due ? `Due ${f.due}` : 'Due on receipt'}</Text>
      {f.deposit > 0 && <Text style={{ fontSize: fz(9.5), color: sub, marginTop: s(3) }}>A deposit of {f.fmt(f.deposit)} is due now.</Text>}
    </View>
  )
}

// ─── 1. Classic ──────────────────────────────────────────────────────────────
// White page; one band in the header colour carries what is owed and when.
function Classic(d: Doc) {
  const { s, fz } = d
  const { t } = d
  const f = facts(d)
  const band = t.headerBg
  const onBand = onColour(band)
  const amount = contrast(t.accentColor, band) >= 3 ? t.accentColor : onBand
  return (
    <Page size={d.paper} style={{ fontFamily: 'Helvetica', padding: s(44), paddingBottom: s(64), color: BODY, backgroundColor: PAPER }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ maxWidth: s(260) }}>
          <Logo url={d.profile.logo_url} size={s(40)} />
          <Text style={{ fontSize: fz(15), fontFamily: 'Helvetica-Bold', color: INK, marginTop: s(d.profile.logo_url ? 8 : 0) }}>{f.firmName}</Text>
          {[f.firm.address, f.firm.contact, f.firm.vat].filter(Boolean).map(l => <Text key={l} style={{ fontSize: fz(8.5), color: MUTED, marginTop: s(2) }}>{l}</Text>)}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: fz(40), fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: s(1) }}>INVOICE</Text>
          <Text style={{ fontSize: fz(9.5), color: MUTED, marginTop: s(2) }}>{d.invoice.invoice_number}  ·  Issued {f.issued}</Text>
        </View>
      </View>

      <View style={{ marginHorizontal: s(-44), marginTop: s(26), paddingHorizontal: s(44), paddingVertical: s(18), backgroundColor: band, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View>
          <Text style={{ fontSize: fz(9.5), color: onBand, opacity: .75 }}>{d.paid ? 'Amount paid' : 'Amount due'}</Text>
          <Text style={{ fontSize: fz(30), fontFamily: 'Helvetica-Bold', color: amount, marginTop: s(2) }}>{f.fmt(d.invoice.total)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <DueLine d={d} color={onBand} sub={onBand} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: s(24), marginBottom: s(20) }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fz(8.5), color: MUTED }}>Billed to</Text>
          <Text style={{ fontSize: fz(11.5), fontFamily: 'Helvetica-Bold', color: INK, marginTop: s(3) }}>{d.invoice.client_name}</Text>
          {f.clientLines.map(l => <Text key={l} style={{ fontSize: fz(9), color: MUTED, marginTop: s(2) }}>{l}</Text>)}
        </View>
        {d.invoice.project ? (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fz(8.5), color: MUTED }}>For</Text>
            <Text style={{ fontSize: fz(10.5), color: INK, marginTop: s(3) }}>{d.invoice.project}</Text>
          </View>
        ) : null}
      </View>

      <Items d={d} />
      <Sums d={d} width="46%" />
      <View style={{ alignSelf: 'flex-end', width: '46%', flexDirection: 'row', justifyContent: 'space-between', marginTop: s(10), paddingTop: s(8), borderTopWidth: s(1.5), borderTopColor: INK, borderTopStyle: 'solid' }}>
        <Text style={{ fontSize: fz(11), fontFamily: 'Helvetica-Bold', color: INK }}>{d.paid ? 'Total paid' : 'Total due'}</Text>
        <Text style={{ fontSize: fz(13), fontFamily: 'Helvetica-Bold', color: INK }}>{f.fmt(d.invoice.total)}</Text>
      </View>

      {f.payBlocks.length > 0 && (
        <View style={{ marginTop: s(26), padding: s(16), backgroundColor: '#F6F5F2', borderRadius: s(6) }}>
          <PayDetails d={d} color={INK} />
        </View>
      )}
      <View style={{ marginTop: s(20) }}><Notes d={d} color={INK} /></View>
      <Footer d={d} />
    </Page>
  )
}

// ─── 2. Ledger ───────────────────────────────────────────────────────────────
// A strict grid: everything aligned to two columns, figures in key/value rows,
// and a single accent bar under the total.
function Ledger(d: Doc) {
  const { s, fz } = d
  const { t } = d
  const f = facts(d)
  const kv = (k: string, v: string, bold = false) => (
    <View style={{ flexDirection: 'row', paddingVertical: s(5), borderBottomWidth: s(0.6), borderBottomColor: LINE, borderBottomStyle: 'solid' }}>
      <Text style={{ width: s(70), fontSize: fz(9), color: MUTED }}>{k}</Text>
      <Text style={{ flex: 1, fontSize: fz(9.5), color: INK, fontFamily: bold ? 'Helvetica-Bold' : 'Helvetica' }}>{v}</Text>
    </View>
  )
  return (
    <Page size={d.paper} style={{ fontFamily: 'Helvetica', padding: s(48), paddingBottom: s(64), color: BODY, backgroundColor: PAPER }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(10) }}>
          <Logo url={d.profile.logo_url} size={s(30)} />
          <Text style={{ fontSize: fz(11), fontFamily: 'Helvetica-Bold', color: INK }}>{f.firmName}</Text>
        </View>
        <Text style={{ fontSize: fz(9), color: MUTED }}>{f.firm.contact}</Text>
      </View>

      <Text style={{ fontSize: fz(56), fontFamily: 'Helvetica-Bold', color: INK, letterSpacing: s(-1), marginTop: s(34) }}>INVOICE</Text>

      <View style={{ flexDirection: 'row', gap: s(32), marginTop: s(22) }}>
        <View style={{ flex: 1 }}>
          {kv('Number', d.invoice.invoice_number, true)}
          {kv('Issued', f.issued)}
          {kv(d.paid ? 'Status' : 'Due', d.paid ? 'Paid' : f.due || 'On receipt', true)}
          {kv(d.paid ? 'Paid' : 'Amount', f.fmt(d.invoice.total), true)}
        </View>
        <View style={{ flex: 1 }}>
          {kv('Billed to', d.invoice.client_name, true)}
          {f.clientLines.slice(0, 2).map((l, i) => <View key={l}>{kv(i ? '' : 'Contact', l)}</View>)}
          {d.invoice.project ? kv('For', d.invoice.project) : null}
          {kv('From', [f.firm.address, f.firm.vat].filter(Boolean).join('  ·  ') || f.firmName)}
        </View>
      </View>

      <View style={{ marginTop: s(30) }}><Items d={d} head={INK} /></View>
      <Sums d={d} width="44%" />
      <View style={{ alignSelf: 'flex-end', width: '44%', marginTop: s(10) }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Text style={{ fontSize: fz(10.5), fontFamily: 'Helvetica-Bold', color: INK }}>{d.paid ? 'Total paid' : 'Total due'}</Text>
          <Text style={{ fontSize: fz(20), fontFamily: 'Helvetica-Bold', color: INK }}>{f.fmt(d.invoice.total)}</Text>
        </View>
        <View style={{ height: s(4), backgroundColor: t.accentColor, marginTop: s(6) }} />
        {f.deposit > 0 && <Text style={{ fontSize: fz(9.5), color: INK, marginTop: s(6) }}>Deposit due now: {f.fmt(f.deposit)}</Text>}
      </View>

      <View style={{ flexDirection: 'row', gap: s(32), marginTop: s(30) }}>
        <View style={{ flex: 1 }}><PayDetails d={d} color={INK} compact /></View>
        <View style={{ flex: 1 }}><Notes d={d} color={INK} /></View>
      </View>
      <Footer d={d} left={48} right={48} />
    </Page>
  )
}

// ─── 3. Letter ───────────────────────────────────────────────────────────────
// Reads like a short note from the business: who it's for, what's owed and
// when, in a sentence; then a plain list.
function Letter(d: Doc) {
  const { s, fz } = d
  const { t } = d
  const f = facts(d)
  const accent = accentInk(t)
  return (
    <Page size={d.paper} style={{ fontFamily: 'Helvetica', paddingTop: s(56), paddingHorizontal: s(64), paddingBottom: s(64), color: BODY, backgroundColor: PAPER }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <View>
          <Logo url={d.profile.logo_url} size={s(34)} />
          <Text style={{ fontSize: fz(11), fontFamily: 'Helvetica-Bold', color: INK, marginTop: s(d.profile.logo_url ? 8 : 0) }}>{f.firmName}</Text>
          {[f.firm.address, f.firm.contact, f.firm.vat].filter(Boolean).map(l => <Text key={l} style={{ fontSize: fz(8.5), color: MUTED, marginTop: s(2) }}>{l}</Text>)}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: fz(9), color: MUTED }}>{f.issued}</Text>
          <Text style={{ fontSize: fz(9), color: MUTED, marginTop: s(2) }}>{d.invoice.invoice_number}</Text>
        </View>
      </View>

      <Text style={{ fontSize: fz(46), fontFamily: 'Helvetica-Bold', color: INK, marginTop: s(44) }}>INVOICE</Text>
      <View style={{ width: s(36), height: s(4), backgroundColor: t.accentColor, marginTop: s(10) }} />

      <Text style={{ fontSize: fz(14), color: INK, lineHeight: 1.5, marginTop: s(22) }}>
        {d.invoice.client_name},{' '}
        {d.paid
          ? <>thank you. <Text style={{ fontFamily: 'Helvetica-Bold' }}>{f.fmt(d.invoice.total)}</Text> has been paid in full.</>
          : <><Text style={{ fontFamily: 'Helvetica-Bold', color: accent }}>{f.fmt(d.invoice.total)}</Text> is due{f.due ? <> on <Text style={{ fontFamily: 'Helvetica-Bold' }}>{f.due}</Text></> : ' on receipt'}{d.invoice.project ? ` for ${d.invoice.project}` : ''}.</>}
      </Text>
      {f.deposit > 0 && <Text style={{ fontSize: fz(11), color: BODY, marginTop: s(6) }}>A deposit of {f.fmt(f.deposit)} is due now.</Text>}

      <View style={{ marginTop: s(28) }}>
        {d.items.map((it, i) => (
          <View key={i} wrap={false} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: s(7) }}>
            <View style={{ flex: 1, paddingRight: s(16) }}>
              <Text style={{ fontSize: fz(10.5), color: INK }}>{it.description}</Text>
              {Number(it.quantity) !== 1 && <Text style={{ fontSize: fz(8.5), color: MUTED, marginTop: s(2) }}>{Number(it.quantity)} × {f.fmt(it.unit_price)}</Text>}
            </View>
            <Text style={{ fontSize: fz(10.5), color: INK }}>{f.fmt(it.amount)}</Text>
          </View>
        ))}
        <View style={{ borderTopWidth: s(0.8), borderTopColor: LINE, borderTopStyle: 'solid', marginTop: s(6), paddingTop: s(4) }}>
          <Sums d={d} width="100%" />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: s(10) }}>
            <Text style={{ fontSize: fz(12), fontFamily: 'Helvetica-Bold', color: INK }}>{d.paid ? 'Total paid' : 'Total due'}</Text>
            <Text style={{ fontSize: fz(12), fontFamily: 'Helvetica-Bold', color: INK }}>{f.fmt(d.invoice.total)}</Text>
          </View>
        </View>
      </View>

      <View style={{ marginTop: s(30) }}><PayDetails d={d} color={INK} /></View>
      <View style={{ marginTop: s(20) }}><Notes d={d} color={INK} /></View>
      <Footer d={d} left={64} right={64} />
    </Page>
  )
}

// ─── 4. Sidebar ──────────────────────────────────────────────────────────────
// A tall column in the header colour holds who, how much, when and how to pay;
// the items sit on the white side.
function Sidebar(d: Doc) {
  const { s, fz } = d
  const { t } = d
  const f = facts(d)
  const bg = t.headerBg
  const on = onColour(bg)
  const soft = on === PAPER ? 'rgba(255,255,255,0.68)' : MUTED
  const amount = contrast(t.accentColor, bg) >= 3 ? t.accentColor : on
  const W = s(190)
  return (
    <Page size={d.paper} style={{ fontFamily: 'Helvetica', paddingTop: s(40), paddingBottom: s(64), paddingLeft: W + s(32), paddingRight: s(40), color: BODY, backgroundColor: PAPER }}>
      <View fixed style={{ position: 'absolute', top: s(0), bottom: s(0), left: s(0), width: W, backgroundColor: bg }} />
      <View style={{ position: 'absolute', top: s(40), left: s(26), width: W - s(52) }}>
        <Logo url={d.profile.logo_url} size={s(34)} />
        <Text style={{ fontSize: fz(12.5), fontFamily: 'Helvetica-Bold', color: on, marginTop: s(d.profile.logo_url ? 10 : 0) }}>{f.firmName}</Text>
        {[f.firm.address, f.firm.contact, f.firm.vat].filter(Boolean).map(l => <Text key={l} style={{ fontSize: fz(8), color: soft, marginTop: s(3), lineHeight: 1.4 }}>{l}</Text>)}

        <Text style={{ fontSize: fz(9), color: soft, marginTop: s(34) }}>{d.paid ? 'Amount paid' : 'Amount due'}</Text>
        <Text style={{ fontSize: fz(22), fontFamily: 'Helvetica-Bold', color: amount, marginTop: s(3) }}>{f.fmt(d.invoice.total)}</Text>
        <View style={{ marginTop: s(4) }}><DueLine d={d} color={on} sub={soft} /></View>

        <View style={{ marginTop: s(30) }}><PayDetails d={d} color={on} sub={soft} compact /></View>
      </View>

      <Text style={{ fontSize: fz(44), fontFamily: 'Helvetica-Bold', color: INK }}>INVOICE</Text>
      <Text style={{ fontSize: fz(9.5), color: MUTED, marginTop: s(4) }}>{d.invoice.invoice_number}  ·  Issued {f.issued}</Text>

      <View style={{ marginTop: s(28), marginBottom: s(22) }}>
        <Text style={{ fontSize: fz(8.5), color: MUTED }}>Billed to</Text>
        <Text style={{ fontSize: fz(12), fontFamily: 'Helvetica-Bold', color: INK, marginTop: s(3) }}>{d.invoice.client_name}</Text>
        {f.clientLines.map(l => <Text key={l} style={{ fontSize: fz(9), color: MUTED, marginTop: s(2) }}>{l}</Text>)}
        {d.invoice.project ? <Text style={{ fontSize: fz(9.5), color: INK, marginTop: s(8) }}>For {d.invoice.project}</Text> : null}
      </View>

      <Items d={d} />
      <Sums d={d} width="60%" />
      <View style={{ alignSelf: 'flex-end', width: '60%', flexDirection: 'row', justifyContent: 'space-between', marginTop: s(10), paddingTop: s(8), borderTopWidth: s(1.5), borderTopColor: INK, borderTopStyle: 'solid' }}>
        <Text style={{ fontSize: fz(11), fontFamily: 'Helvetica-Bold', color: INK }}>{d.paid ? 'Total paid' : 'Total due'}</Text>
        <Text style={{ fontSize: fz(13), fontFamily: 'Helvetica-Bold', color: INK }}>{f.fmt(d.invoice.total)}</Text>
      </View>

      <View style={{ marginTop: s(26) }}><Notes d={d} color={INK} /></View>
      <Footer d={d} left={190 + 32} right={40} />
    </Page>
  )
}

// ─── 5. Statement ────────────────────────────────────────────────────────────
// The invoice above, a payment slip below: cut along the line and the slip
// has everything needed to pay.
function Statement(d: Doc) {
  const { s, fz } = d
  const { t } = d
  const f = facts(d)
  const slipBg = /^#[0-9a-f]{6}$/i.test(t.accentColor) ? tint(t.accentColor, 0.86) : '#FCEFC7'
  return (
    <Page size={d.paper} style={{ fontFamily: 'Helvetica', padding: s(44), paddingBottom: s(64), color: BODY, backgroundColor: PAPER }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Text style={{ fontSize: fz(48), fontFamily: 'Helvetica-Bold', color: INK }}>INVOICE</Text>
        <View style={{ alignItems: 'flex-end', maxWidth: s(240) }}>
          <Logo url={d.profile.logo_url} size={s(30)} />
          <Text style={{ fontSize: fz(11.5), fontFamily: 'Helvetica-Bold', color: INK, marginTop: s(d.profile.logo_url ? 6 : 0), textAlign: 'right' }}>{f.firmName}</Text>
          {[f.firm.address, f.firm.contact, f.firm.vat].filter(Boolean).map(l => <Text key={l} style={{ fontSize: fz(8), color: MUTED, marginTop: s(2), textAlign: 'right' }}>{l}</Text>)}
        </View>
      </View>

      <View style={{ flexDirection: 'row', marginTop: s(26), marginBottom: s(20), gap: s(24) }}>
        <View style={{ flex: 2 }}>
          <Text style={{ fontSize: fz(8.5), color: MUTED }}>Billed to</Text>
          <Text style={{ fontSize: fz(11.5), fontFamily: 'Helvetica-Bold', color: INK, marginTop: s(3) }}>{d.invoice.client_name}</Text>
          {f.clientLines.map(l => <Text key={l} style={{ fontSize: fz(9), color: MUTED, marginTop: s(2) }}>{l}</Text>)}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: fz(8.5), color: MUTED }}>Invoice</Text>
          <Text style={{ fontSize: fz(10), color: INK, marginTop: s(3) }}>{d.invoice.invoice_number}</Text>
          <Text style={{ fontSize: fz(8.5), color: MUTED, marginTop: s(6) }}>Issued</Text>
          <Text style={{ fontSize: fz(10), color: INK, marginTop: s(3) }}>{f.issued}</Text>
        </View>
        {d.invoice.project ? (
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fz(8.5), color: MUTED }}>For</Text>
            <Text style={{ fontSize: fz(10), color: INK, marginTop: s(3) }}>{d.invoice.project}</Text>
          </View>
        ) : null}
      </View>

      <Items d={d} />
      <Sums d={d} width="46%" />
      <View style={{ alignSelf: 'flex-end', width: '46%', flexDirection: 'row', justifyContent: 'space-between', marginTop: s(10), paddingTop: s(8), borderTopWidth: s(1.5), borderTopColor: INK, borderTopStyle: 'solid' }}>
        <Text style={{ fontSize: fz(11), fontFamily: 'Helvetica-Bold', color: INK }}>{d.paid ? 'Total paid' : 'Total due'}</Text>
        <Text style={{ fontSize: fz(13), fontFamily: 'Helvetica-Bold', color: INK }}>{f.fmt(d.invoice.total)}</Text>
      </View>
      <View style={{ marginTop: s(18) }}><Notes d={d} color={INK} /></View>

      {/* The slip */}
      <View wrap={false} style={{ marginTop: s(28) }}>
        <Text style={{ fontSize: fz(7.5), color: MUTED, marginBottom: s(4) }}>Cut here and keep with your payment</Text>
        <View style={{ borderTopWidth: s(1), borderTopColor: '#B6BCC8', borderTopStyle: 'dashed' }} />
        <View style={{ marginTop: s(14), padding: s(18), backgroundColor: slipBg, borderRadius: s(6), flexDirection: 'row', gap: s(24) }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: fz(9), color: INK }}>{d.paid ? 'Paid' : 'Amount due'}</Text>
            <Text style={{ fontSize: fz(24), fontFamily: 'Helvetica-Bold', color: INK, marginTop: s(2) }}>{f.fmt(d.invoice.total)}</Text>
            <View style={{ marginTop: s(4) }}><DueLine d={d} color={INK} sub={INK} /></View>
            <Text style={{ fontSize: fz(9), color: INK, marginTop: s(10) }}>From {d.invoice.client_name}</Text>
            <Text style={{ fontSize: fz(9), color: INK, marginTop: s(2) }}>To {f.firmName}</Text>
            <Text style={{ fontSize: fz(9), color: INK, marginTop: s(2) }}>Reference <Text style={{ fontFamily: 'Helvetica-Bold' }}>{d.invoice.invoice_number}</Text></Text>
          </View>
          {f.payBlocks.length > 0 && (
            <View style={{ flex: 1.3 }}>
              {f.payBlocks.map((b, i) => (
                <View key={i} style={{ marginBottom: s(8) }}>
                  <Text style={{ fontSize: fz(9.5), fontFamily: 'Helvetica-Bold', color: INK }}>{b.title}</Text>
                  {b.rows.map(([l, v]) => <Text key={l} style={{ fontSize: fz(9), color: INK, marginTop: s(2) }}>{l}: <Text style={{ fontFamily: 'Helvetica-Bold' }}>{v}</Text></Text>)}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
      <Footer d={d} />
    </Page>
  )
}

// Saved template ids stay the same, so existing choices carry over.
const LAYOUTS: Record<string, (d: Doc) => ReactElement> = {
  'dark-modern': Classic,
  'clean-light': Ledger,
  'minimal':     Letter,
  'charcoal':    Sidebar,
  'bold-amber':  Statement,
}

// ─── Public export — signature unchanged ─────────────────────────────────────
export async function generateInvoicePDF(
  invoice:  Record<string, any>,
  items:    Record<string, any>[],
  profile:  Record<string, any>,
  options?: {
    showPaidStamp?:  boolean
    theme?:          string | null
    primaryColor?:   string | null
    headerColor?:    string | null
    paperSize?:      string | null
  }
): Promise<Buffer> {
  const key = options?.theme ?? profile.invoice_theme ?? 'dark-modern'
  const t = resolveTheme(key, options?.primaryColor ?? profile.brand_color_primary, options?.headerColor ?? profile.brand_color_header)
  const Layout = LAYOUTS[key] ?? Classic
  const paid = !!options?.showPaidStamp || invoice.status === 'paid'
  const paper: Paper = (options?.paperSize ?? profile.invoice_paper_size) === 'A5' ? 'A5' : 'A4'
  return renderToBuffer(<Document><Layout invoice={invoice} items={items} profile={profile} paid={paid} t={t} paper={paper} {...scalers(paper)} /></Document>)
}
