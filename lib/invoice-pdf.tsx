import { renderToBuffer, Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

const GREEN  = '#10B981'
const NAVY   = '#0F172A'
const SLATE  = '#64748B'
const LIGHT  = '#F8FAFC'
const LINE   = '#E2E8F0'
const RED    = '#EF4444'
const WHITE  = '#FFFFFF'

const s = StyleSheet.create({
  page:        { fontFamily: 'Helvetica', fontSize: 10, padding: 40, color: NAVY, backgroundColor: WHITE },

  // ── Header bar ───────────────────────────────────────────────────────────
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: NAVY, padding: '16pt 20pt', marginHorizontal: -40, marginTop: -40, marginBottom: 20 },
  logo:        { width: 60, height: 20, objectFit: 'contain', marginBottom: 4 },
  firmName:    { fontSize: 16, fontFamily: 'Helvetica-Bold', color: GREEN, letterSpacing: 1 },
  firmDetail:  { fontSize: 8, color: '#94A3B8', marginTop: 2 },
  invTitle:    { fontSize: 24, fontFamily: 'Helvetica-Bold', color: GREEN, textAlign: 'right', letterSpacing: 2 },
  invMeta:     { fontSize: 9, color: '#94A3B8', textAlign: 'right', marginTop: 2 },
  invDue:      { fontSize: 9, color: RED, textAlign: 'right', marginTop: 2 },

  // ── FROM / BILL TO boxes ─────────────────────────────────────────────────
  boxes:       { flexDirection: 'row', marginBottom: 16 },
  box:         { flex: 1, backgroundColor: LIGHT, padding: '10pt 12pt', marginRight: 8, borderRadius: 3 },
  boxLast:     { flex: 1, backgroundColor: LIGHT, padding: '10pt 12pt', borderRadius: 3 },
  boxLabel:    { fontSize: 7, fontFamily: 'Helvetica-Bold', color: GREEN, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 },
  boxName:     { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY, marginBottom: 3 },
  boxDetail:   { fontSize: 8, color: SLATE, marginTop: 2 },

  // ── Project strip ────────────────────────────────────────────────────────
  projectRow:  { flexDirection: 'row', marginBottom: 14 },
  projectLabel:{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: SLATE, letterSpacing: 1, textTransform: 'uppercase', marginRight: 6, marginTop: 1 },
  projectVal:  { fontSize: 9, color: NAVY },

  // ── Table ────────────────────────────────────────────────────────────────
  tableHead:   { flexDirection: 'row', backgroundColor: NAVY, padding: '6pt 8pt' },
  tableRow:    { flexDirection: 'row', padding: '6pt 8pt', borderBottom: `1pt solid ${LINE}` },
  tableRowAlt: { flexDirection: 'row', padding: '6pt 8pt', borderBottom: `1pt solid ${LINE}`, backgroundColor: LIGHT },
  th:          { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: WHITE, letterSpacing: 0.5 },
  td:          { fontSize: 9, color: NAVY },
  tdMuted:     { fontSize: 9, color: SLATE },
  col1:        { flex: 4 },
  col2:        { flex: 1, textAlign: 'right' },
  col3:        { flex: 1.2, textAlign: 'right' },
  col4:        { flex: 1.4, textAlign: 'right' },

  // ── Totals ───────────────────────────────────────────────────────────────
  totalsWrap:  { alignSelf: 'flex-end', width: '42%', marginTop: 10 },
  totalRow:    { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLbl:    { fontSize: 9, color: SLATE },
  totalVal:    { fontSize: 9, color: NAVY },
  grandRow:    { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: GREEN, padding: '8pt 10pt', borderRadius: 3, marginTop: 6 },
  grandLbl:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: WHITE },
  grandVal:    { fontSize: 11, fontFamily: 'Helvetica-Bold', color: WHITE },

  // ── Notes ────────────────────────────────────────────────────────────────
  notesLbl:    { fontSize: 7, fontFamily: 'Helvetica-Bold', color: SLATE, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 3, marginTop: 16 },
  notesVal:    { fontSize: 9, color: SLATE, lineHeight: 1.5 },

  // ── Footer ───────────────────────────────────────────────────────────────
  footer:      { position: 'absolute', bottom: 28, left: 40, right: 40, borderTop: `1pt solid ${LINE}`, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerTxt:   { fontSize: 7.5, color: '#CBD5E1' },
})

function InvoicePDF({ invoice, items, profile }: {
  invoice: Record<string, any>
  items:   Record<string, any>[]
  profile: Record<string, any>
}) {
  const sym = invoice.currency || 'P'
  const fmt = (n: number) => `${sym}${Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`

  const firmName    = profile.firm_name || profile.name || 'Your Company'
  const firmAddress = [profile.address, profile.city, profile.country].filter(Boolean).join(', ')
  const firmContact = [profile.email, profile.phone].filter(Boolean).join('  ·  ')
  const firmVat     = profile.vat_number

  return (
    <Document>
      <Page size="A4" style={s.page}>

        {/* ── Header bar ── */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {profile.logo_url ? (
              <Image src={profile.logo_url} style={s.logo} />
            ) : null}
            <View>
              <Text style={s.firmName}>{firmName}</Text>
              {firmAddress ? <Text style={s.firmDetail}>{firmAddress}</Text> : null}
              {firmContact ? <Text style={s.firmDetail}>{firmContact}</Text> : null}
              {firmVat     ? <Text style={s.firmDetail}>VAT: {firmVat}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={s.invTitle}>INVOICE</Text>
            <Text style={s.invMeta}>{invoice.invoice_number}</Text>
            <Text style={s.invMeta}>Issued: {invoice.issue_date}</Text>
            {invoice.due_date
              ? <Text style={s.invDue}>Due: {invoice.due_date}</Text>
              : null}
          </View>
        </View>

        {/* ── FROM / BILL TO ── */}
        <View style={s.boxes}>
          <View style={s.box}>
            <Text style={s.boxLabel}>From</Text>
            <Text style={s.boxName}>{firmName}</Text>
            {firmAddress ? <Text style={s.boxDetail}>{firmAddress}</Text> : null}
            {firmContact ? <Text style={s.boxDetail}>{firmContact}</Text> : null}
            {firmVat     ? <Text style={s.boxDetail}>VAT: {firmVat}</Text> : null}
          </View>
          <View style={s.boxLast}>
            <Text style={s.boxLabel}>Bill To</Text>
            <Text style={s.boxName}>{invoice.client_name}</Text>
            {invoice.client_address ? <Text style={s.boxDetail}>{invoice.client_address}</Text> : null}
            {invoice.client_email   ? <Text style={s.boxDetail}>{invoice.client_email}</Text>   : null}
            {invoice.client_phone   ? <Text style={s.boxDetail}>{invoice.client_phone}</Text>   : null}
            {invoice.client_vat     ? <Text style={s.boxDetail}>VAT: {invoice.client_vat}</Text>: null}
          </View>
        </View>

        {/* ── Project ── */}
        {invoice.project ? (
          <View style={s.projectRow}>
            <Text style={s.projectLabel}>Project:</Text>
            <Text style={s.projectVal}>{invoice.project}</Text>
          </View>
        ) : null}

        {/* ── Line items table ── */}
        <View style={s.tableHead}>
          <Text style={{ ...s.th, ...s.col1 }}>Description</Text>
          <Text style={{ ...s.th, ...s.col2 }}>Qty</Text>
          <Text style={{ ...s.th, ...s.col3 }}>Rate</Text>
          <Text style={{ ...s.th, ...s.col4 }}>Amount</Text>
        </View>
        {items.map((item: any, i: number) => (
          <View key={i} style={i % 2 === 0 ? s.tableRow : s.tableRowAlt}>
            <Text style={{ ...s.td,    ...s.col1 }}>{item.description}</Text>
            <Text style={{ ...s.tdMuted, ...s.col2 }}>{item.quantity}</Text>
            <Text style={{ ...s.tdMuted, ...s.col3 }}>{fmt(item.unit_price)}</Text>
            <Text style={{ ...s.td,    ...s.col4 }}>{fmt(item.amount)}</Text>
          </View>
        ))}

        {/* ── Totals ── */}
        <View style={s.totalsWrap}>
          <View style={s.totalRow}>
            <Text style={s.totalLbl}>Subtotal</Text>
            <Text style={s.totalVal}>{fmt(invoice.subtotal)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={s.totalLbl}>VAT ({invoice.vat_rate}%)</Text>
            <Text style={s.totalVal}>{fmt(invoice.vat_amount)}</Text>
          </View>
          {invoice.deposit_amount > 0 ? (
            <View style={s.totalRow}>
              <Text style={{ ...s.totalLbl, color: '#F59E0B' }}>Deposit paid</Text>
              <Text style={{ ...s.totalVal, color: '#F59E0B' }}>−{fmt(invoice.deposit_amount)}</Text>
            </View>
          ) : null}
          <View style={s.grandRow}>
            <Text style={s.grandLbl}>Balance Due</Text>
            <Text style={s.grandVal}>{fmt(invoice.total)}</Text>
          </View>
        </View>

        {/* ── Notes ── */}
        {invoice.notes ? (
          <View>
            <Text style={s.notesLbl}>Notes</Text>
            <Text style={s.notesVal}>{invoice.notes}</Text>
          </View>
        ) : null}

        {/* ── Footer ── */}
        <View style={s.footer}>
          <Text style={s.footerTxt}>Generated by StagePay</Text>
          <Text style={s.footerTxt}>{invoice.invoice_number}</Text>
        </View>

      </Page>
    </Document>
  )
}

export async function generateInvoicePDF(
  invoice: Record<string, any>,
  items:   Record<string, any>[],
  profile: Record<string, any>
): Promise<Buffer> {
  return renderToBuffer(
    <InvoicePDF invoice={invoice} items={items} profile={profile} />
  )
}
