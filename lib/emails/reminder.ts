import { esc, longDate, daysLate, invoiceLink, greeting, nowrap, amountPanel, emailShell, paragraphs, panelRow, plain } from './shell'

// The payment reminder email, sent by the daily reminder job and by "send
// now". It leads with what is owed and how late it is, and links to the
// client's invoice page.
export function reminderEmail(o: {
  senderName: string
  profile?: Record<string, any> | null
  invoice: { invoice_number: string; client_name?: string | null; due_date?: string | null; public_token?: string | null }
  amount: string
  message?: string | null
}) {
  const link = invoiceLink(o.invoice.public_token)
  const due = longDate(o.invoice.due_date)
  const late = daysLate(o.invoice.due_date)
  const when = !due ? '' : late > 0 ? `Was due ${due}, ${late} day${late === 1 ? '' : 's'} ago` : late === 0 ? `Due today, ${due}` : `Due ${due}`
  const hello = greeting(o.invoice.client_name)
  const lead = o.message?.trim()
    || `This is a friendly reminder from ${o.senderName} that invoice ${o.invoice.invoice_number} is still open.`
  const closing = 'Already paid? Thank you, you can ignore this reminder.'

  const html = emailShell({
    title: 'Payment reminder',
    preheader: `${o.amount} for invoice ${o.invoice.invoice_number}${when ? `. ${when}` : ''}.`,
    senderName: o.senderName,
    profile: o.profile,
    bodyHtml: paragraphs([esc(hello), nowrap(esc(lead), o.invoice.invoice_number)])
      + panelRow(amountPanel(`Amount due · ${o.invoice.invoice_number}`, o.amount, { text: when, alert: late > 0 })),
    button: link ? { href: link, label: 'View and pay', note: 'Payment details and the PDF are on the invoice page.' } : null,
    closing,
  })

  const text = plain([
    hello, '', lead, '',
    `Amount due: ${o.amount}`, when, '',
    link ? `View and pay: ${link}` : '',
    closing, '',
    `${o.senderName}, sent with StagePay`,
  ])

  return { html, text }
}
