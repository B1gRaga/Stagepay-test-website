import { esc, emailShell, paragraphs, plain, INK, MUTED } from './shell'
import { cleanMethod, KIND_LABEL, type PaymentMethod } from '@/lib/payment-methods'

// To the account owner: the payment details printed on their invoices just
// changed. Someone who breaks into an account can swap in their own bank
// account and quietly collect the payments, so the owner hears about every
// change, with enough to spot one they didn't make.

const SUPPORT_WHATSAPP = '73998627'

// Long numbers show only their last four digits.
function mask(v?: string) {
  if (!v) return ''
  const s = v.replace(/\s+/g, '')
  return s.length > 4 ? `••••${s.slice(-4)}` : s
}

export function describeMethod(m: PaymentMethod): string {
  const title = m.kind === 'bank' ? (m.bank || KIND_LABEL.bank) : KIND_LABEL[m.kind]
  return [title, m.account_name, mask(m.number)].filter(Boolean).join(' · ')
}

/** The methods as stored, cleaned, in order; for comparing before and after. */
export function methodList(list: unknown): PaymentMethod[] {
  return Array.isArray(list) ? list.map(cleanMethod).filter((m): m is PaymentMethod => !!m) : []
}

export function sameMethods(a: unknown, b: unknown): boolean {
  return JSON.stringify(methodList(a)) === JSON.stringify(methodList(b))
}

export function paymentDetailsChangedEmail(o: {
  businessName: string
  changedBy: string          // the email of whoever saved the change
  methods: PaymentMethod[]   // the details now on invoices
  when: Date
}) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
  const when = o.when.toLocaleString('en-GB', { timeZone: 'Africa/Gaborone', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const lead = `The payment details on ${o.businessName}’s invoices were changed on ${when}, by ${o.changedBy}.`
  const now = o.methods.length ? 'Clients will now be asked to pay to:' : 'Invoices no longer show any payment details.'
  const warn = `If you didn’t make this change, sign in now, check Settings → Payment details, and change your password. Then WhatsApp us on ${SUPPORT_WHATSAPP}.`
  const lines = o.methods.map(describeMethod)

  const list = lines.length
    ? `<tr><td style="padding:12px 32px 0;"><table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border:1px solid #E4DDCF;border-radius:12px;">${lines
        .map(l => `<tr><td style="padding:10px 14px;font-size:15px;color:${INK};border-bottom:1px solid #F1ECE1;">${esc(l)}</td></tr>`).join('')}</table></td></tr>`
    : ''

  const html = emailShell({
    title: 'Your payment details changed',
    preheader: `Check this was you. ${lines[0] ?? ''}`,
    senderName: 'StagePay',
    bodyHtml: paragraphs([esc(lead), esc(now)]) + list
      + `<tr><td style="padding:16px 32px 0;font-size:15px;line-height:1.55;color:${MUTED};">${esc(warn)}</td></tr>`,
    button: appUrl ? { href: `${appUrl}/settings`, label: 'Check payment details' } : null,
  })
  const text = plain([lead, '', now, ...lines.map(l => `- ${l}`), '', warn, '', appUrl ? `Check: ${appUrl}/settings` : ''])
  return { html, text, subject: 'Your payment details were changed' }
}
