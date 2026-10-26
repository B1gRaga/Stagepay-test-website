import { esc, nowrap, amountPanel, emailShell, paragraphs, panelRow, plain } from './shell'

// To the business: a client tapped "I've paid" on their invoice page. It asks
// them to check their MyZaka / bank SMS and confirm in StagePay.
export function paymentClaimEmail(o: {
  invoice: { id: string; invoice_number: string; client_name?: string | null }
  amount: string
  reference: string
}) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const link = appUrl ? `${appUrl}/invoices/${o.invoice.id}` : ''
  const who = o.invoice.client_name || 'Your client'
  const num = o.invoice.invoice_number
  const lead = `${who} says they have paid invoice ${num}.`
  const check = 'Check your MyZaka, Orange Money or bank messages for this reference, then confirm it in StagePay. Confirming marks the invoice paid and stops reminders.'

  const html = emailShell({
    title: 'Payment to confirm',
    preheader: `${who} says they paid ${o.amount}. Reference ${o.reference}.`,
    senderName: 'StagePay',
    bodyHtml: paragraphs([nowrap(esc(lead), num), esc(check)])
      + panelRow(amountPanel(`Reference · ${o.reference}`, o.amount, { text: `Invoice ${num}` })),
    button: link ? { href: link, label: 'Check and confirm' } : null,
  })
  const text = plain([lead, '', `Amount: ${o.amount}`, `Reference: ${o.reference}`, '', check, '', link ? `Check and confirm: ${link}` : ''])
  return { html, text, subject: `${who} says they paid ${num}` }
}
