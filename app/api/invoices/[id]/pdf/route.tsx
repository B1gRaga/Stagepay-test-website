import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer'

type Params = { params: Promise<{ id: string }> }

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 10, padding: 48, color: '#1E293B', backgroundColor: '#ffffff' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#10B981', letterSpacing: 2 },
  badge: { fontSize: 9, color: '#64748B', marginTop: 3 },
  divider: { borderBottom: '1pt solid #E2E8F0', marginVertical: 16 },
  label: { fontSize: 8, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 },
  value: { fontSize: 10, color: '#1E293B' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F8FAFC', padding: '8pt 6pt', borderBottom: '1pt solid #E2E8F0' },
  tableRow: { flexDirection: 'row', padding: '7pt 6pt', borderBottom: '1pt solid #F1F5F9' },
  col1: { flex: 4, color: '#1E293B' },
  col2: { flex: 1, textAlign: 'right', color: '#475569' },
  col3: { flex: 1, textAlign: 'right', color: '#475569' },
  col4: { flex: 1.2, textAlign: 'right', color: '#1E293B' },
  th: { fontSize: 8, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 },
  totalsBlock: { alignSelf: 'flex-end', width: '40%', marginTop: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  totalLabel: { color: '#64748B', fontSize: 10 },
  totalValue: { color: '#1E293B', fontSize: 10 },
  grandTotal: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#10B981', padding: '8pt 10pt', borderRadius: 4, marginTop: 8 },
  grandLabel: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 11 },
  grandValue: { color: '#ffffff', fontFamily: 'Helvetica-Bold', fontSize: 11 },
  footer: { position: 'absolute', bottom: 32, left: 48, right: 48, borderTop: '1pt solid #E2E8F0', paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#94A3B8' },
})

function InvoicePDF({ invoice, items, profile }: {
  invoice: Record<string, any>
  items: Record<string, any>[]
  profile: Record<string, any>
}) {
  const sym = invoice.currency || 'P'
  const fmt = (n: number) => `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 2 })}`

  return (
    <Document>
      <Page size="A4" style={styles.page}>

        <View style={styles.row}>
          <View>
            <Text style={styles.logo}>{profile.firm_name || profile.name || 'StagePay'}</Text>
            {profile.address && <Text style={styles.badge}>{profile.address}</Text>}
            {profile.city && <Text style={styles.badge}>{profile.city}, {profile.country}</Text>}
            {profile.vat_number && <Text style={styles.badge}>VAT: {profile.vat_number}</Text>}
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#0F172A', letterSpacing: 2 }}>INVOICE</Text>
            <Text style={styles.badge}>{invoice.invoice_number}</Text>
            <Text style={styles.badge}>Issued: {invoice.issue_date}</Text>
            {invoice.due_date && <Text style={{ ...styles.badge, color: '#EF4444' }}>Due: {invoice.due_date}</Text>}
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View>
            <Text style={styles.label}>Bill to</Text>
            <Text style={{ ...styles.value, fontFamily: 'Helvetica-Bold', fontSize: 12 }}>{invoice.client_name}</Text>
            {invoice.client_address && <Text style={styles.badge}>{invoice.client_address}</Text>}
            {invoice.client_email && <Text style={styles.badge}>{invoice.client_email}</Text>}
            {invoice.client_phone && <Text style={styles.badge}>{invoice.client_phone}</Text>}
            {invoice.client_vat && <Text style={styles.badge}>VAT: {invoice.client_vat}</Text>}
          </View>
          {invoice.project && (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.label}>Project</Text>
              <Text style={{ ...styles.value, maxWidth: 180, textAlign: 'right' }}>{invoice.project}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        <View style={styles.tableHeader}>
          <Text style={{ ...styles.th, ...styles.col1 }}>Description</Text>
          <Text style={{ ...styles.th, ...styles.col2 }}>Qty</Text>
          <Text style={{ ...styles.th, ...styles.col3 }}>Rate</Text>
          <Text style={{ ...styles.th, ...styles.col4 }}>Amount</Text>
        </View>
        {items.map((item: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={styles.col1}>{item.description}</Text>
            <Text style={styles.col2}>{item.quantity}</Text>
            <Text style={styles.col3}>{fmt(item.unit_price)}</Text>
            <Text style={styles.col4}>{fmt(item.amount)}</Text>
          </View>
        ))}

        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal</Text>
            <Text style={styles.totalValue}>{fmt(invoice.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>VAT ({invoice.vat_rate}%)</Text>
            <Text style={styles.totalValue}>{fmt(invoice.vat_amount)}</Text>
          </View>
          {invoice.deposit_amount > 0 && (
            <View style={styles.totalRow}>
              <Text style={{ ...styles.totalLabel, color: '#F59E0B' }}>Deposit paid</Text>
              <Text style={{ ...styles.totalValue, color: '#F59E0B' }}>−{fmt(invoice.deposit_amount)}</Text>
            </View>
          )}
          <View style={styles.grandTotal}>
            <Text style={styles.grandLabel}>Balance Due</Text>
            <Text style={styles.grandValue}>{fmt(invoice.total)}</Text>
          </View>
        </View>

        {invoice.notes && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.label}>Notes</Text>
            <Text style={{ ...styles.value, color: '#64748B', marginTop: 4 }}>{invoice.notes}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Generated by StagePay · getstagepay.co</Text>
          <Text style={styles.footerText}>{invoice.invoice_number}</Text>
        </View>

      </Page>
    </Document>
  )
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabaseAny = supabase as any
  const [{ data: invoice }, { data: profile }] = await Promise.all([
    supabaseAny.from('invoices').select('*, invoice_items(*)').eq('id', id).eq('user_id', user.id).single(),
    supabaseAny.from('profiles').select('*').eq('id', user.id).single(),
  ])

  if (!invoice) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const buffer = await renderToBuffer(
    <InvoicePDF invoice={invoice} items={invoice.invoice_items || []} profile={profile || {}} />
  )

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
    },
  })
}
