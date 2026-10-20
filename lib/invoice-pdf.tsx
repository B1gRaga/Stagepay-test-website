import { renderToBuffer, Document, Page, Text, View, Image, Svg, Path, Rect } from '@react-pdf/renderer'
import { resolveTheme, type InvoiceTheme } from './invoice-themes'
import { paymentBlocks } from './payment-methods'
import { firmLines } from './firm-details'

// ─── constants ────────────────────────────────────────────────────────────────
const PAD     = 36           // page padding (pt)
const AMBER   = '#F2A900'
const PALE_AM = '#FCEFC7'
const MUTED   = '#94A3B8'
const INK     = '#1F2A44'
const WHITE   = '#FFFFFF'

// ─── Logo placeholder ─────────────────────────────────────────────────────────
// Ink circle, amber border, inner ring, the real bracket+bar brand mark
// (same path as components/Logo.tsx, kept in sync by hand since this is a
// separate react-pdf render tree, not a DOM one).
function LogoMark() {
  const D = 38
  return (
    <View style={{
      width: D, height: D, borderRadius: D / 2,
      backgroundColor: INK,
      borderWidth: 1.8, borderColor: AMBER, borderStyle: 'solid',
      flexShrink: 0, overflow: 'hidden',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* Decorative inner ring at 84% radius */}
      <View style={{
        position: 'absolute',
        top: 3, left: 3,
        width: D - 6, height: D - 6,
        borderRadius: (D - 6) / 2,
        borderWidth: 0.6, borderColor: AMBER, borderStyle: 'solid',
        opacity: 0.3,
      }} />
      {/* Bracket + bar brand mark, scaled to a 20pt box within the circle */}
      <Svg width={20} height={20} viewBox="0 0 92.6 92.6">
        <Path d="M24 92.6 V69.73 H46.87 V46.87 H69.73 V92.6 Z" fill={WHITE} />
        <Rect x={69.73} y={24} width={22.87} height={68.6} fill={AMBER} />
      </Svg>
    </View>
  )
}

// ─── Meta pill (issue date / due date / terms / status) ───────────────────────
function MetaCard({ label, value, valueColor, t }: {
  label:       string
  value:       string
  valueColor?: string
  t:           InvoiceTheme
}) {
  const hasBorder = !!t.metaCardBorder
  return (
    <View style={{
      flex: 1, minHeight: 22, borderRadius: 5,
      backgroundColor: t.metaCardBg,
      ...(hasBorder ? { borderWidth: 0.8, borderColor: t.metaCardBorder, borderStyle: 'solid' } : {}),
      padding: '3pt 8pt',
      justifyContent: 'space-between',
    }}>
      <Text style={{ fontSize: 6, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.3 }}>
        {label}
      </Text>
      <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: valueColor ?? t.bodyText }}>
        {value}
      </Text>
    </View>
  )
}

// ─── Address pill (FROM / BILL TO) ────────────────────────────────────────────
function AddressCard({ label, name, line1, line2, t }: {
  label:  string
  name:   string
  line1?: string
  line2?: string
  t:      InvoiceTheme
}) {
  const hasBorder = !!t.metaCardBorder
  return (
    <View style={{
      flex: 1, minHeight: 24, borderRadius: 5,
      backgroundColor: t.metaCardBg,
      ...(hasBorder ? { borderWidth: 0.8, borderColor: t.metaCardBorder, borderStyle: 'solid' } : {}),
      padding: '4pt 10pt',
    }}>
      <Text style={{
        fontSize: 6, fontFamily: 'Helvetica-Bold', color: AMBER,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3,
      }}>
        {label}
      </Text>
      <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold', color: t.bodyText }}>
        {name}
      </Text>
      {line1 ? <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 2 }}>{line1}</Text> : null}
      {line2 ? <Text style={{ fontSize: 7.5, color: MUTED, marginTop: 1 }}>{line2}</Text> : null}
    </View>
  )
}

// ─── Main invoice component ───────────────────────────────────────────────────
function InvoicePDF({ invoice, items, profile, showPaidStamp, theme: t }: {
  invoice:        Record<string, any>
  items:          Record<string, any>[]
  profile:        Record<string, any>
  showPaidStamp?: boolean
  theme:          InvoiceTheme
}) {
  const sym = invoice.currency || 'P'
  const fmt = (n: number) => `${sym}${Number(n ?? 0).toLocaleString('en', { minimumFractionDigits: 2 })}`

  // Firm info
  const firm        = firmLines(profile)
  const firmName    = firm.name || 'Your Company'
  const firmAddress = firm.address
  const firmContact = firm.contact
  const subLabel    = firm.vat
  const payBlocks   = paymentBlocks(profile.payment_methods)

  // Meta
  // Invoices store issue and due dates, not a terms field: derive "Net N" from the gap.
  const dueDays     = invoice.due_days != null ? Number(invoice.due_days)
    : invoice.issue_date && invoice.due_date
      ? Math.round((Date.parse(invoice.due_date) - Date.parse(invoice.issue_date)) / 86_400_000)
      : null
  const terms       = dueDays != null && dueDays > 0 ? `Net ${dueDays} days` : 'Due on Receipt'
  const statusLabel = invoice.status === 'paid' ? 'PAID' : invoice.status === 'overdue' ? 'OVERDUE' : 'UNPAID'
  const statusColor = invoice.status === 'paid' ? AMBER : invoice.status === 'overdue' ? '#F0B376' : '#F35480'

  // Deposit
  const depositAmt  = Number(invoice.deposit_amount ?? 0)
  const hasDeposit  = depositAmt > 0
  const depositPct  = Number(invoice.subtotal) > 0
    ? Math.round((depositAmt / Number(invoice.subtotal)) * 100)
    : 0

  return (
    <Document>
      <Page
        size="A4"
        style={{
          fontFamily: 'Helvetica',
          fontSize: 10,
          padding: PAD,
          paddingBottom: PAD + 32,   // room for absolute footer
          color: t.bodyText,
          backgroundColor: t.pageBg,
        }}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
          backgroundColor: t.headerBg,
          marginHorizontal: -PAD, marginTop: -PAD, marginBottom: 12,
          padding: `12pt ${PAD}pt`,
          borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
        }}>
          {/* Left: logo + firm info */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {profile.logo_url
              ? <Image src={profile.logo_url} style={{ width: 38, height: 38, borderRadius: 19, objectFit: 'contain', flexShrink: 0 }} />
              : <LogoMark />
            }
            <View>
              <Text style={{ fontSize: 17, fontFamily: 'Helvetica-Bold', color: t.headerFirmColor }}>
                {firmName}
              </Text>
              {subLabel ? <Text style={{ fontSize: 8, color: AMBER, marginTop: 2 }}>{subLabel}</Text> : null}
              {/* Thin amber rule */}
              <View style={{ width: 30, height: 1, backgroundColor: AMBER, marginTop: 3, marginBottom: 3 }} />
              {firmAddress
                ? <Text style={{ fontSize: 6.5, color: t.headerSubColor }}>{firmAddress}</Text>
                : null}
              {firmContact
                ? <Text style={{ fontSize: 6.5, color: t.headerSubColor, marginTop: 1 }}>{firmContact}</Text>
                : null}
            </View>
          </View>

          {/* Right: INVOICE + number */}
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{
              fontSize: 36, fontFamily: 'Helvetica-Bold',
              color: t.invoiceLabelColor, letterSpacing: 2,
            }}>
              INVOICE
            </Text>
            <Text style={{ fontSize: 9, color: t.headerSubColor, marginTop: 2 }}>
              {invoice.invoice_number}
            </Text>
          </View>
        </View>

        {/* ── META ROW ───────────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 5, marginBottom: 14 }}>
          <MetaCard label="Issue Date"    value={invoice.issue_date  ?? '—'}          t={t} />
          <MetaCard label="Due Date"      value={invoice.due_date    ?? 'On Receipt'} t={t} />
          <MetaCard label="Payment Terms" value={terms}                               t={t} />
          <MetaCard label="Status"        value={statusLabel} valueColor={statusColor} t={t} />
        </View>

        {/* ── FROM / BILL TO ─────────────────────────────────────────────────── */}
        <View style={{ flexDirection: 'row', gap: 5, marginBottom: 16 }}>
          <AddressCard
            label="From"
            name={firmName}
            line1={firmAddress || undefined}
            line2={firmContact || undefined}
            t={t}
          />
          <AddressCard
            label="Bill To"
            name={invoice.client_name}
            line1={invoice.client_email || invoice.client_address || undefined}
            line2={invoice.project      || invoice.client_phone   || undefined}
            t={t}
          />
        </View>

        {/* ── TABLE HEADER ───────────────────────────────────────────────────── */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: t.tableHeadBg,
          borderRadius: 4,
          padding: '7pt 10pt',
          marginBottom: 4,
        }}>
          <Text style={{ flex: 4,   fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: t.tableHeadText, textTransform: 'uppercase', letterSpacing: 0.5 }}>Description</Text>
          <Text style={{ flex: 1,   fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: t.tableHeadText, textAlign: 'center',  letterSpacing: 0.5 }}>Qty</Text>
          <Text style={{ flex: 1.2, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: t.tableHeadText, textAlign: 'center',  letterSpacing: 0.5 }}>Rate</Text>
          <Text style={{ flex: 1.4, fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: t.tableHeadText, textAlign: 'right',   letterSpacing: 0.5 }}>Amount</Text>
        </View>

        {/* ── TABLE ROWS ─────────────────────────────────────────────────────── */}
        {items.map((item: any, i: number) => (
          <View key={i} style={{
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: i % 2 === 0 ? t.tableRowAltBg : 'transparent',
            borderRadius: 3,
            paddingVertical: 8, paddingHorizontal: 10,
            marginBottom: 2,
          }}>
            <Text style={{ flex: 4,   fontSize: 8.5, color: t.bodyText }}>
              {item.description}
            </Text>
            <Text style={{ flex: 1,   fontSize: 8.5, color: MUTED, textAlign: 'center' }}>
              {item.quantity}
            </Text>
            <Text style={{ flex: 1.2, fontSize: 8.5, color: MUTED, textAlign: 'center' }}>
              {fmt(item.unit_price)}
            </Text>
            <Text style={{ flex: 1.4, fontSize: 8.5, color: t.bodyText, fontFamily: 'Helvetica-Bold', textAlign: 'right' }}>
              {fmt(item.amount)}
            </Text>
          </View>
        ))}

        {/* ── SUBTOTALS ──────────────────────────────────────────────────────── */}
        <View style={{ alignSelf: 'flex-end', width: '56%', marginTop: 16 }}>
          {/* Thin rule */}
          <View style={{ height: 1, backgroundColor: t.lineColor, marginBottom: 6 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 7 }}>
            <Text style={{ fontSize: 8.5, color: MUTED }}>Subtotal</Text>
            <Text style={{ fontSize: 8.5, color: t.bodyText }}>{fmt(invoice.subtotal)}</Text>
          </View>
          {Number(invoice.vat_rate) > 0 ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 8.5, color: MUTED }}>{profile.tax_label || 'VAT'} ({Number(invoice.vat_rate)}%)</Text>
              <Text style={{ fontSize: 8.5, color: t.bodyText }}>{fmt(invoice.vat_amount)}</Text>
            </View>
          ) : null}
        </View>

        {/* ── TOTAL DUE PILL ─────────────────────────────────────────────────── */}
        <View style={{
          alignSelf: 'flex-end', width: '56%',
          height: 16, borderRadius: 7,
          backgroundColor: t.grandRowBg,
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: 10,
          marginTop: 16,
        }}>
          <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: t.grandRowText }}>
            TOTAL DUE
          </Text>
          <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: t.grandRowText }}>
            {fmt(invoice.total)}
          </Text>
        </View>

        {/* ── DEPOSIT REQUIRED PILL ──────────────────────────────────────────── */}
        {hasDeposit && (
          <View style={{
            alignSelf: 'flex-end', width: '56%',
            minHeight: 20, borderRadius: 7,
            backgroundColor: PALE_AM,
            borderWidth: 1, borderColor: AMBER, borderStyle: 'solid',
            paddingHorizontal: 10, paddingVertical: 4,
            marginTop: 6,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: AMBER }}>
                DEPOSIT REQUIRED ({depositPct}%)
              </Text>
              <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: t.bodyText }}>
                {fmt(depositAmt)}
              </Text>
            </View>
            <Text style={{ fontSize: 6.5, color: MUTED, marginTop: 2 }}>
              Due upon signing / commencement
            </Text>
          </View>
        )}

        {/* ── PAYMENT DETAILS ────────────────────────────────────────────────── */}
        {payBlocks.length > 0 && !showPaidStamp ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{
              fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: t.bodyText,
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
            }}>
              Payment details
            </Text>
            {payBlocks.map((b, i) => (
              <View key={i} style={{ marginBottom: 4 }} wrap={false}>
                <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: t.bodyText, lineHeight: 1.5 }}>{b.title}</Text>
                <Text style={{ fontSize: 7, color: t.bodyText, lineHeight: 1.5 }}>
                  {b.rows.map(([label, value], j) => `${j ? '   ·   ' : ''}${label}: ${value}`).join('')}
                </Text>
              </View>
            ))}
            <Text style={{ fontSize: 6.5, color: MUTED, marginTop: 2 }}>
              Please use {invoice.invoice_number} as the payment reference.
            </Text>
          </View>
        ) : null}

        {/* ── TERMS & CONDITIONS ─────────────────────────────────────────────── */}
        {invoice.notes ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{
              fontSize: 6.5, fontFamily: 'Helvetica-Bold', color: t.bodyText,
              textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4,
            }}>
              Terms &amp; Conditions
            </Text>
            <Text style={{ fontSize: 6.5, color: MUTED, lineHeight: 1.6 }}>
              {invoice.notes}
            </Text>
          </View>
        ) : null}

        {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
        <View style={{
          position: 'absolute', bottom: -PAD, left: -PAD, right: -PAD,
          backgroundColor: t.footerBg,
          borderTopLeftRadius: 10, borderTopRightRadius: 10,
          padding: `8pt ${PAD}pt`,
          flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <View>
            <Text style={{ fontSize: 5.5, fontFamily: 'Helvetica-Bold', color: t.footerBrandColor }}>
              STAGEPAY
            </Text>
            <Text style={{ fontSize: 5, color: t.footerTextColor, marginTop: 1 }}>
              Generated by StagePay · Professional Invoicing for Botswana
            </Text>
          </View>
          <Text style={{ fontSize: 6, color: t.footerTextColor, textAlign: 'right' }}>
            Page 1 of 1 · {invoice.invoice_number}
          </Text>
        </View>

        {/* ── PAID STAMP ─────────────────────────────────────────────────────── */}
        {showPaidStamp && (
          <>
            <View style={{
              position: 'absolute', top: 240, left: 0, right: 0,
              alignItems: 'center', transform: 'rotate(-35deg)', opacity: 0.08,
            }}>
              <Text style={{ fontSize: 120, fontFamily: 'Helvetica-Bold', color: t.accentColor, letterSpacing: 18 }}>
                PAID
              </Text>
            </View>
            <View style={{
              position: 'absolute', top: 58, right: 36,
              borderRadius: 4, backgroundColor: t.accentColor, padding: '7pt 14pt',
            }}>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold', color: t.grandRowText, letterSpacing: 4 }}>
                PAID
              </Text>
            </View>
          </>
        )}

      </Page>
    </Document>
  )
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
  }
): Promise<Buffer> {
  const theme = resolveTheme(
    options?.theme        ?? profile.invoice_theme,
    options?.primaryColor ?? profile.brand_color_primary,
    options?.headerColor  ?? profile.brand_color_header,
  )
  return renderToBuffer(
    <InvoicePDF
      invoice={invoice}
      items={items}
      profile={profile}
      showPaidStamp={options?.showPaidStamp}
      theme={theme}
    />
  )
}
