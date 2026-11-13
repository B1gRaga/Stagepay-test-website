// WhatsApp sending via Meta's WhatsApp Cloud API (no Twilio).
//
// Env:
//   WHATSAPP_ACCESS_TOKEN       System-user access token from Meta Business
//   WHATSAPP_PHONE_NUMBER_ID    The sender number's ID (not the phone number itself)
//   WHATSAPP_API_VERSION        Optional, defaults to v23.0
//   WHATSAPP_TEMPLATE_LANG      Optional, defaults to 'en'
//
// Free-form text only delivers inside the 24h window after the client last
// messaged the business number. Anything business-initiated (invoice sends,
// reminders) must use a Meta-approved template — callers pass one when the
// relevant template env var is set.

import { withRetry, NonRetryableError } from '@/lib/retry'

export type WhatsAppTemplate = {
  name: string
  params: string[]          // body variables {{1}}, {{2}}, ... in order
  // The variable part of a dynamic-URL button, e.g. the invoice's public token
  // for a "View invoice" button whose URL is https://getstagepay.co/invoice/{{1}}.
  buttonParams?: string[]
}

export function isWhatsAppConfigured() {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

// Normalises "whatsapp:+267 71 234 567" style input to the bare international
// digits the Cloud API wants. Botswana mobiles are often saved as the local
// 8 digits (7X XXX XXX); those get the 267 country code, as wa.me links do.
export function barePhone(phone: string) {
  const digits = phone.replace(/^whatsapp:/, '').replace(/\D/g, '').replace(/^00/, '')
  return /^7\d{7}$/.test(digits) ? `267${digits}` : digits
}

// What Meta's error means for the person sending, in plain words.
// https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes
export function whatsAppErrorText(message: string): string {
  const code = Number(message.match(/\(#?(\d{3,6})\)/)?.[1] ?? message.match(/\b(1[23]\d{4})\b/)?.[1])
  switch (code) {
    case 131026: return 'This number is not on WhatsApp'
    case 131047: return 'WhatsApp needs an approved template for this message'
    case 132000: case 132001: case 132012: case 132015: case 132016:
      return 'The message template is missing or not approved yet'
    case 131056: return 'WhatsApp is pausing messages to this number for now; try again later'
    case 130429: case 131048: case 131049: case 80007:
      return 'WhatsApp is limiting how fast StagePay can send; try the rest in a few minutes'
    case 131031: case 131042: case 131045: case 131005: case 190:
      return 'StagePay’s WhatsApp account needs attention; we are on it'
    default: return message.replace(/^\(#?\d+\)\s*/, '').slice(0, 160) || 'WhatsApp could not send it'
  }
}

// Template variables may not contain newlines, tabs or 4+ consecutive spaces.
function cleanParam(value: string) {
  return value.replace(/\s+/g, ' ').trim() || '-'
}

export async function sendWhatsApp(
  to: string,
  { text, template, documentUrl }: { text: string; template?: WhatsAppTemplate | null; documentUrl?: string },
) {
  const token         = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  if (!token || !phoneNumberId) throw new NonRetryableError('WhatsApp not configured')
  // Meta's dashboard shows tokens shortened ("EAAG…"); a copied short form can't go in a header.
  if (/[^\x21-\x7E]/.test(token)) throw new NonRetryableError('WHATSAPP_ACCESS_TOKEN is malformed (it contains "…" or spaces). Paste the full token from Meta.')

  const version = process.env.WHATSAPP_API_VERSION || 'v23.0'
  const payload: Record<string, unknown> = {
    messaging_product: 'whatsapp',
    recipient_type:    'individual',
    to:                barePhone(to),
  }

  if (template) {
    payload.type = 'template'
    payload.template = {
      name:     template.name,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
      components: [
        {
          type:       'body',
          parameters: template.params.map(p => ({ type: 'text', text: cleanParam(p) })),
        },
        ...(template.buttonParams?.length ? [{
          type: 'button', sub_type: 'url', index: '0',
          parameters: template.buttonParams.map(p => ({ type: 'text', text: cleanParam(p) })),
        }] : []),
      ],
    }
  } else if (documentUrl) {
    payload.type = 'document'
    payload.document = { link: documentUrl, caption: text.slice(0, 1024), filename: 'invoice.pdf' }
  } else {
    payload.type = 'text'
    payload.text = { body: text.slice(0, 4096), preview_url: true }
  }

  return withRetry(async () => {
    const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
      method:  'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      const msg = data?.error?.message || `WhatsApp API error (${res.status})`
      // 4xx (bad number, unapproved template, expired token) will never
      // succeed on retry; 429 and 5xx are transient.
      if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new NonRetryableError(msg)
      throw new Error(msg)
    }
    return data as { messages?: { id: string }[] }
  })
}
