import { NextRequest, NextResponse } from 'next/server'
import { log, logError } from '@/lib/logger'
import { signatureValid } from '@/lib/whatsapp-webhook'

// Meta calls this URL with delivery reports for the WhatsApp messages we send
// (sent, delivered, read, failed) and with messages people send to our number.
// We only record outcomes: a failed reminder goes to Sentry with Meta's reason.
// Message text and full phone numbers are never logged.

// Meta checks the URL once when it's saved in the app dashboard.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  if (expected && p.get('hub.mode') === 'subscribe' && p.get('hub.verify_token') === expected) {
    return new NextResponse(p.get('hub.challenge') ?? '', { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

const lastDigits = (n: unknown) => (typeof n === 'string' ? `…${n.slice(-3)}` : undefined)

type MetaError = { code?: number; title?: string; message?: string; error_data?: { details?: string } }
type Status = { id?: string; status?: string; recipient_id?: string; errors?: MetaError[]; pricing?: { category?: string } }

export async function POST(req: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) return new NextResponse('Not configured', { status: 503 })

  const raw = await req.text()
  if (!signatureValid(raw, req.headers.get('x-hub-signature-256'), secret)) {
    return new NextResponse('Bad signature', { status: 401 })
  }

  let body: { entry?: { changes?: { field?: string; value?: { statuses?: Status[]; messages?: { type?: string }[] } }[] }[] }
  try { body = JSON.parse(raw) } catch { return new NextResponse('Bad JSON', { status: 400 }) }

  for (const entry of body.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {}

      for (const s of value.statuses ?? []) {
        const base = { messageId: s.id, to: lastDigits(s.recipient_id), category: s.pricing?.category }
        if (s.status === 'failed') {
          const e = s.errors?.[0] ?? {}
          logError('whatsapp.delivery_failed', new Error(`WhatsApp ${e.code ?? '?'}: ${e.title ?? e.message ?? 'failed'}`), {
            ...base, code: e.code, title: e.title, details: e.error_data?.details,
          })
        } else {
          log('whatsapp.status', { ...base, status: s.status })
        }
      }

      for (const m of value.messages ?? []) {
        log('whatsapp.incoming', { type: m.type })
      }
    }
  }

  // Always 200 once the signature checks out, or Meta keeps retrying.
  return NextResponse.json({ ok: true })
}
