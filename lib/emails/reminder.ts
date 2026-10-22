import { resolveTheme, contrast } from '@/lib/invoice-themes'

// The payment reminder email, sent by the daily reminder job and by "send
// now". Built for email clients: tables, inline styles, no web fonts, and a
// plain-text twin. It leads with what is owed and by when, links to the
// client's invoice page, and carries the business's own colour.

const INK = '#1F2A44'
const MUTED = '#5B6475'
const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function longDate(d?: string | null) {
  if (!d) return ''
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00Z`)
  return isNaN(+date) ? String(d) : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Whole days late (Botswana time); 0 or less means not yet due.
function daysLate(d?: string | null) {
  if (!d) return 0
  const today = new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 10)
  return Math.round((+new Date(`${today}T00:00:00Z`) - +new Date(`${String(d).slice(0, 10)}T00:00:00Z`)) / 86_400_000)
}

export function reminderEmail(o: {
  senderName: string
  profile?: Record<string, any> | null
  invoice: { invoice_number: string; client_name?: string | null; due_date?: string | null; public_token?: string | null }
  amount: string
  message?: string | null
}) {
  const t = resolveTheme(o.profile?.invoice_theme, o.profile?.brand_color_primary, o.profile?.brand_color_header)
  const button = contrast(t.accentColor, '#FFFFFF') >= 2.2 ? t.accentColor : INK
  const buttonText = contrast('#FFFFFF', button) >= contrast(INK, button) ? '#FFFFFF' : INK
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const link = appUrl && o.invoice.public_token ? `${appUrl}/invoice/${o.invoice.public_token}` : ''

  const due = longDate(o.invoice.due_date)
  const late = daysLate(o.invoice.due_date)
  const when = !due ? '' : late > 0 ? `Was due ${due}, ${late} day${late === 1 ? '' : 's'} ago` : late === 0 ? `Due today, ${due}` : `Due ${due}`
  const name = (o.invoice.client_name || '').trim()
  const hello = name ? `Hi ${name.split(/\s+/)[0]},` : 'Hello,'
  const lead = o.message?.trim()
    || `This is a friendly reminder from ${o.senderName} that invoice ${o.invoice.invoice_number} is still open.`

  const text = [
    hello, '', lead, '',
    `Amount due: ${o.amount}`,
    when, '',
    link ? `View and pay: ${link}` : '',
    'Already paid? Thank you, you can ignore this reminder.', '',
    `${o.senderName}, sent with StagePay`,
  ].filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n')

  const logo = o.profile?.logo_url
    ? `<img src="${esc(o.profile.logo_url)}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;object-fit:contain;margin:0 0 12px">`
    : ''

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Payment reminder</title></head>
<body style="margin:0;padding:0;background:#F4F0E8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.amount)} for invoice ${esc(o.invoice.invoice_number)}${when ? `. ${esc(when)}` : ''}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F0E8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:${INK};">
  <tr><td style="padding:32px 32px 8px;">
    ${logo}<div style="font-size:16px;font-weight:700;color:${INK};">${esc(o.senderName)}</div>
  </td></tr>
  <tr><td style="padding:16px 32px 0;font-size:16px;line-height:1.55;color:${INK};">
    <p style="margin:0 0 12px;">${esc(hello)}</p>
    <p style="margin:0;white-space:pre-wrap;">${esc(lead).split(esc(o.invoice.invoice_number)).join(`<span style="white-space:nowrap;">${esc(o.invoice.invoice_number)}</span>`)}</p>
  </td></tr>
  <tr><td style="padding:24px 32px 0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;border-radius:12px;">
      <tr><td style="padding:20px 22px;">
        <div style="font-size:14px;color:${MUTED};">Amount due · ${esc(o.invoice.invoice_number)}</div>
        <div style="font-size:32px;font-weight:800;letter-spacing:-0.5px;color:${INK};margin-top:4px;">${esc(o.amount)}</div>
        ${when ? `<div style="font-size:15px;font-weight:600;color:${late > 0 ? '#B42318' : INK};margin-top:6px;">${esc(when)}</div>` : ''}
      </td></tr>
    </table>
  </td></tr>
  ${link ? `<tr><td style="padding:24px 32px 0;">
    <a href="${esc(link)}" style="display:inline-block;background:${button};color:${buttonText};font-size:16px;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:999px;">View and pay</a>
    <div style="font-size:13px;color:${MUTED};margin-top:10px;">Payment details and the PDF are on the invoice page.</div>
  </td></tr>` : ''}
  <tr><td style="padding:24px 32px 32px;font-size:14px;line-height:1.55;color:${MUTED};">
    Already paid? Thank you, you can ignore this reminder.
  </td></tr>
</table>
<div style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:12px;color:#8A8F99;padding-top:16px;">Sent by ${esc(o.senderName)} with StagePay</div>
</td></tr>
</table>
</body></html>`

  return { html, text }
}
