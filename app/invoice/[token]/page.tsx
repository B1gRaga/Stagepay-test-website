import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import InvoiceActions from './InvoiceActions'

type Props = { params: Promise<{ token: string }> }

function fmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 2 })}`
}

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
    .select('firm_name, name, email, address, city, country, vat_number')
    .eq('id', invoice.user_id)
    .single()

  const sym = invoice.currency || 'P'
  const senderName = profile?.firm_name || profile?.name || 'StagePay'
  const items: any[] = invoice.invoice_items || []

  return (
    <>
      <style>{`
        body { background: #f1f5f9 !important; padding: 24px 16px; }
        .sp-card { background: #fff; max-width: 720px; margin: 0 auto; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,.08); overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #1e293b; }
        .sp-header { padding: 32px 40px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px; }
        .sp-firm { font-size: 22px; font-weight: 800; letter-spacing: 1px; color: #10b981; }
        .sp-firm-detail { font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.6; }
        .sp-inv-label { font-size: 28px; font-weight: 900; letter-spacing: 3px; color: #0f172a; text-align: right; }
        .sp-inv-meta { font-size: 12px; color: #64748b; text-align: right; margin-top: 4px; line-height: 1.7; }
        .sp-body { padding: 28px 40px; }
        .sp-bill-row { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 28px; }
        .sp-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 6px; }
        .sp-bill-name { font-size: 16px; font-weight: 700; color: #0f172a; }
        .sp-bill-detail { font-size: 12px; color: #64748b; margin-top: 3px; line-height: 1.6; }
        .sp-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        .sp-table th { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .8px; color: #94a3b8; padding: 10px 8px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-align: left; }
        .sp-table th:not(:first-child) { text-align: right; }
        .sp-table td { font-size: 13px; color: #334155; padding: 10px 8px; border-bottom: 1px solid #f1f5f9; }
        .sp-table td:not(:first-child) { text-align: right; }
        .sp-table tr:last-child td { border-bottom: none; }
        .sp-totals { display: flex; justify-content: flex-end; margin-top: 8px; }
        .sp-totals-inner { width: 260px; }
        .sp-total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; color: #475569; }
        .sp-grand { background: #10b981; border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; margin-top: 10px; }
        .sp-grand span { color: #fff; font-weight: 700; font-size: 15px; }
        .sp-notes { margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        .sp-notes p { font-size: 12px; color: #64748b; line-height: 1.7; margin-top: 6px; }
        .sp-footer { padding: 16px 40px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
        @media (max-width: 560px) { .sp-header, .sp-body { padding-left: 20px; padding-right: 20px; } .sp-inv-label { font-size: 20px; } }
        @media print { body { background: #fff !important; padding: 0; } .sp-card { box-shadow: none; border-radius: 0; } }
      `}</style>

      <div className="sp-card">
        {/* Header */}
        <div className="sp-header">
          <div>
            <div className="sp-firm">{senderName}</div>
            <div className="sp-firm-detail">
              {profile?.address && <>{profile.address}<br /></>}
              {profile?.city && <>{profile.city}{profile?.country ? `, ${profile.country}` : ''}<br /></>}
              {profile?.email && <>{profile.email}<br /></>}
              {profile?.vat_number && <>VAT: {profile.vat_number}</>}
            </div>
          </div>
          <div>
            <div className="sp-inv-label">INVOICE</div>
            <div className="sp-inv-meta">
              {invoice.invoice_number}<br />
              Issued: {invoice.issue_date}<br />
              {invoice.due_date && <span style={{ color: '#ef4444' }}>Due: {invoice.due_date}</span>}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="sp-body">
          <div className="sp-bill-row">
            <div>
              <div className="sp-label">Bill to</div>
              <div className="sp-bill-name">{invoice.client_name}</div>
              <div className="sp-bill-detail">
                {invoice.client_address && <>{invoice.client_address}<br /></>}
                {invoice.client_email && <>{invoice.client_email}<br /></>}
                {invoice.client_phone && <>{invoice.client_phone}</>}
              </div>
            </div>
            {invoice.project && (
              <div style={{ textAlign: 'right' }}>
                <div className="sp-label">Project</div>
                <div style={{ fontSize: '12px', color: '#475569', maxWidth: '200px' }}>{invoice.project}</div>
              </div>
            )}
          </div>

          <table className="sp-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, i: number) => (
                <tr key={i}>
                  <td>{item.description}</td>
                  <td>{item.quantity}</td>
                  <td>{fmt(item.unit_price, sym)}</td>
                  <td>{fmt(item.amount, sym)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="sp-totals">
            <div className="sp-totals-inner">
              <div className="sp-total-row"><span>Subtotal</span><span>{fmt(invoice.subtotal, sym)}</span></div>
              <div className="sp-total-row"><span>VAT ({invoice.vat_rate}%)</span><span>{fmt(invoice.vat_amount, sym)}</span></div>
              {invoice.deposit_amount > 0 && (
                <div className="sp-total-row" style={{ color: '#f59e0b' }}>
                  <span>Deposit paid</span><span>−{fmt(invoice.deposit_amount, sym)}</span>
                </div>
              )}
              <div className="sp-grand"><span>Balance Due</span><span>{fmt(invoice.total, sym)}</span></div>
            </div>
          </div>

          {invoice.notes && (
            <div className="sp-notes">
              <div className="sp-label">Notes</div>
              <p>{invoice.notes}</p>
            </div>
          )}
        </div>

        <InvoiceActions token={token} invoiceNumber={invoice.invoice_number} />

        <div className="sp-footer">Generated by StagePay · stagepay.co.bw</div>
      </div>
    </>
  )
}
