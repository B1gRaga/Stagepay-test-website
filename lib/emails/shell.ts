import { resolveTheme, contrast } from '@/lib/invoice-themes'

// The frame every client-facing email shares: the business's name and logo on
// top, a white card on a warm ground, one button in their colour, and a quiet
// footer. Tables and inline styles only, for email clients.

export const INK = '#1F2A44'
export const MUTED = '#5B6475'
export const FONT = "-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

export const esc = (s: unknown) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

export function longDate(d?: string | null) {
  if (!d) return ''
  const date = new Date(`${String(d).slice(0, 10)}T00:00:00Z`)
  return isNaN(+date) ? String(d) : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

// Whole days late (Botswana time); 0 or less means not yet due.
export function daysLate(d?: string | null) {
  if (!d) return 0
  const today = new Date(Date.now() + 2 * 3600_000).toISOString().slice(0, 10)
  return Math.round((+new Date(`${today}T00:00:00Z`) - +new Date(`${String(d).slice(0, 10)}T00:00:00Z`)) / 86_400_000)
}

export function invoiceLink(token?: string | null) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  return appUrl && token ? `${appUrl}/invoice/${token}` : ''
}

export function greeting(clientName?: string | null) {
  const name = (clientName || '').trim()
  return name ? `Hi ${name.split(/\s+/)[0]},` : 'Hello,'
}

// Keeps an invoice number on one line inside escaped text.
export function nowrap(escapedText: string, raw: string) {
  const n = esc(raw)
  return escapedText.split(n).join(`<span style="white-space:nowrap;">${n}</span>`)
}

export function amountPanel(label: string, amount: string, line?: { text: string; alert?: boolean }) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F4EE;border-radius:12px;">
      <tr><td style="padding:20px 22px;">
        <div style="font-size:14px;color:${MUTED};">${esc(label)}</div>
        <div style="font-size:32px;font-weight:800;letter-spacing:-0.5px;color:${INK};margin-top:4px;">${esc(amount)}</div>
        ${line?.text ? `<div style="font-size:15px;font-weight:600;color:${line.alert ? '#B42318' : INK};margin-top:6px;">${esc(line.text)}</div>` : ''}
      </td></tr>
    </table>`
}

export function emailShell(o: {
  title: string
  preheader: string
  senderName: string
  profile?: Record<string, any> | null
  bodyHtml: string
  button?: { href: string; label: string; note?: string } | null
  closing?: string
}) {
  const t = resolveTheme(o.profile?.invoice_theme, o.profile?.brand_color_primary, o.profile?.brand_color_header)
  const btn = contrast(t.accentColor, '#FFFFFF') >= 2.2 ? t.accentColor : INK
  const btnText = contrast('#FFFFFF', btn) >= contrast(INK, btn) ? '#FFFFFF' : INK
  const logo = o.profile?.logo_url
    ? `<img src="${esc(o.profile.logo_url)}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;object-fit:contain;margin:0 0 12px">`
    : ''

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(o.title)}</title></head>
<body style="margin:0;padding:0;background:#F4F0E8;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(o.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F0E8;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;font-family:${FONT};color:${INK};">
  <tr><td style="padding:32px 32px 8px;">
    ${logo}<div style="font-size:16px;font-weight:700;color:${INK};">${esc(o.senderName)}</div>
  </td></tr>
  ${o.bodyHtml}
  ${o.button ? `<tr><td style="padding:24px 32px 0;">
    <a href="${esc(o.button.href)}" style="display:inline-block;background:${btn};color:${btnText};font-size:16px;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:999px;">${esc(o.button.label)}</a>
    ${o.button.note ? `<div style="font-size:13px;color:${MUTED};margin-top:10px;">${esc(o.button.note)}</div>` : ''}
  </td></tr>` : ''}
  <tr><td style="padding:24px 32px 32px;font-size:14px;line-height:1.55;color:${MUTED};">${o.closing ? esc(o.closing) : ''}</td></tr>
</table>
<div style="font-family:${FONT};font-size:12px;color:#8A8F99;padding-top:16px;">Sent by ${esc(o.senderName)} with StagePay</div>
</td></tr>
</table>
</body></html>`
}

// A paragraph block inside the card.
export function paragraphs(htmlParas: string[]) {
  return `<tr><td style="padding:16px 32px 0;font-size:16px;line-height:1.55;color:${INK};">
    ${htmlParas.map((p, i) => `<p style="margin:0 0 ${i === htmlParas.length - 1 ? 0 : 12}px;white-space:pre-wrap;">${p}</p>`).join('\n    ')}
  </td></tr>`
}

export function panelRow(panelHtml: string) {
  return `<tr><td style="padding:24px 32px 0;">${panelHtml}</td></tr>`
}

// Plain-text twin: blank lines collapsed.
export function plain(lines: string[]) {
  return lines.filter((l, i, a) => !(l === '' && (a[i - 1] === '' || i === 0))).join('\n').trim()
}
