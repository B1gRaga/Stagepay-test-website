// Click-to-chat: opens the user's own WhatsApp with the message pre-filled,
// so manual sends come from the freelancer's real number at no cost and
// aren't limited by Meta's 24h window / template rules.

// wa.me needs the full international number. Botswana mobiles are often saved
// as the local 8 digits (7X XXX XXX), so those get the 267 country code.
export function waNumber(phone: string) {
  const digits = phone.replace(/^whatsapp:/, '').replace(/\D/g, '').replace(/^00/, '')
  return /^7\d{7}$/.test(digits) ? `267${digits}` : digits
}

export function waLink(phone: string, text?: string) {
  const base = `https://wa.me/${waNumber(phone)}`
  return text ? `${base}?text=${encodeURIComponent(text)}` : base
}

// Must be called synchronously inside the click handler — browsers block
// window.open after an await.
export function openWhatsApp(phone: string, text: string) {
  window.open(waLink(phone, text), '_blank', 'noopener')
}

export function publicInvoiceUrl(token: string | null | undefined) {
  return token ? `${window.location.origin}/invoice/${token}` : ''
}

// Records the send by moving a draft to 'sent'. The click-to-chat send can't
// be confirmed, so this is best-effort and never throws.
export async function markInvoiceSent(invoiceId: string) {
  try {
    await fetch(`/api/invoices/${invoiceId}`, {
      method: 'PATCH', credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'sent' }),
    })
  } catch {}
}
