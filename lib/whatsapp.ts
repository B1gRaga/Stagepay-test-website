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
}

export function isWhatsAppConfigured() {
  return !!(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID)
}

// Normalises "whatsapp:+267 71 234 567" style input to bare digits.
export function barePhone(phone: string) {
  return phone.replace(/^whatsapp:/, '').replace(/\D/g, '')
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
      components: [{
        type:       'body',
        parameters: template.params.map(p => ({ type: 'text', text: cleanParam(p) })),
      }],
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
