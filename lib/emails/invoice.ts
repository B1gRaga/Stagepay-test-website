import { esc, longDate, invoiceLink, greeting, nowrap, amountPanel, emailShell, paragraphs, panelRow, plain } from './shell'

// The email that carries an invoice PDF: a new invoice, the same with the
// business's own message, or a receipt once it's paid.
export function invoiceEmail(o: {
  senderName: string
  profile?: Record<string, any> | null
  invoice: { invoice_number: string; client_name?: string | null; due_date?: string | null; public_token?: string | null; deposit_amount?: unknown }
  amount: string
  kind: 'invoice' | 'custom' | 'receipt'
  message?: string | null
  depositText?: string
}) {
  const link = invoiceLink(o.invoice.public_token)
  const num = o.invoice.invoice_number
  const due = longDate(o.invoice.due_date)
  const hello = greeting(o.invoice.client_name)

  if (o.kind === 'receipt') {
    const lead = `Thank you. ${o.senderName} has received your payment for invoice ${num}.`
    const html = emailShell({
      title: 'Payment received',
      preheader: `${o.amount} received for invoice ${num}. Your receipt is attached.`,
      senderName: o.senderName, profile: o.profile,
      bodyHtml: paragraphs([esc(hello), nowrap(esc(lead), num)])
        + panelRow(amountPanel(`Paid · ${num}`, o.amount, { text: 'Paid in full' })),
      button: link ? { href: link, label: 'View receipt' } : null,
      closing: 'The paid invoice is attached for your records.',
    })
    const text = plain([hello, '', lead, '', `Paid: ${o.amount}`, '', link ? `View receipt: ${link}` : '', 'The paid invoice is attached for your records.', '', `${o.senderName}, sent with StagePay`])
    return { html, text }
  }

  const lead = o.kind === 'custom' && o.message?.trim()
    ? o.message.trim()
    : `${o.senderName} has sent you invoice ${num}.`
  const when = due ? `Due ${due}` : 'Due on receipt'
  const html = emailShell({
    title: `Invoice ${num}`,
    preheader: `${o.amount} for invoice ${num}. ${when}.`,
    senderName: o.senderName, profile: o.profile,
    bodyHtml: paragraphs([esc(hello), nowrap(esc(lead), num)])
      + panelRow(amountPanel(`Amount due · ${num}`, o.amount, { text: o.depositText ? `${when}. ${o.depositText}` : when })),
    button: link ? { href: link, label: 'View and pay', note: 'Payment details are on the invoice page. The PDF is attached.' } : null,
    closing: link ? '' : 'The invoice is attached as a PDF.',
  })
  const text = plain([hello, '', lead, '', `Amount due: ${o.amount}`, when, o.depositText ?? '', '', link ? `View and pay: ${link}` : '', 'The invoice is attached as a PDF.', '', `${o.senderName}, sent with StagePay`])
  return { html, text }
}
