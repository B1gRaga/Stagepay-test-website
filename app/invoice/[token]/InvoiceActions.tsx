'use client'

export default function InvoiceActions({ token, invoiceNumber }: { token: string; invoiceNumber: string }) {
  return (
    <div style={{ padding: '20px 40px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
      <a
        href={`/invoice/${token}/pdf`}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', background: '#0f172a', color: '#fff' }}
      >
        ↓ Download PDF
      </a>
      <button
        onClick={() => window.print()}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '11px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, background: 'transparent', color: '#475569', border: '1px solid #e2e8f0', cursor: 'pointer' }}
      >
        🖨 Print
      </button>
    </div>
  )
}
