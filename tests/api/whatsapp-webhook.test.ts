import { createHmac } from 'node:crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const log = vi.fn()
const logError = vi.fn()
vi.mock('@/lib/logger', () => ({ log: (...a: unknown[]) => log(...a), logError: (...a: unknown[]) => logError(...a) }))

// invoice_sends: one row StagePay sent itself, found by Meta's message id.
let sendRow: { id: string; status: string } | null = null
const sendUpdates: Record<string, unknown>[] = []
vi.mock('@/lib/supabase/server', () => ({
  createServiceClient: () => ({
    from: () => ({
      select: () => ({ eq: (_k: string, v: string) => ({ maybeSingle: async () => ({ data: sendRow && v === 'wamid.1' ? sendRow : null }) }) }),
      update: (row: Record<string, unknown>) => ({ eq: async () => { sendUpdates.push(row); return { error: null } } }),
    }),
  }),
}))

import { GET, POST } from '@/app/api/whatsapp/webhook/route'
import { signatureValid } from '@/lib/whatsapp-webhook'

const SECRET = 'app-secret'
const sign = (raw: string) => 'sha256=' + createHmac('sha256', SECRET).update(raw).digest('hex')
const post = (raw: string, sig: string | null) =>
  new NextRequest('https://getstagepay.co/api/whatsapp/webhook', {
    method: 'POST', body: raw, headers: sig ? { 'x-hub-signature-256': sig } : {},
  })

const failed = JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: { statuses: [{
  id: 'wamid.1', status: 'failed', recipient_id: '26775406331',
  errors: [{ code: 131042, title: 'Business eligibility payment issue', error_data: { details: 'x' } }],
}] } }] }] })

describe('WhatsApp webhook', () => {
  beforeEach(() => {
    log.mockReset(); logError.mockReset()
    sendRow = null; sendUpdates.length = 0
    process.env.WHATSAPP_APP_SECRET = SECRET
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN = 'verify-me'
  })

  const status = (s: string, extra: Record<string, unknown> = {}) => JSON.stringify({ entry: [{ changes: [{ field: 'messages', value: { statuses: [{ id: 'wamid.1', status: s, recipient_id: '26771234567', ...extra }] } }] }] })

  it('moves an invoice send StagePay made to delivered, read or failed, never backwards', async () => {
    sendRow = { id: 'send-1', status: 'sent' }
    await POST(post(status('delivered'), sign(status('delivered'))))
    expect(sendUpdates[0]).toMatchObject({ status: 'delivered', error: null })
    sendRow = { id: 'send-1', status: 'read' }
    await POST(post(status('delivered'), sign(status('delivered'))))
    expect(sendUpdates).toHaveLength(1)
    sendRow = { id: 'send-1', status: 'sent' }
    const f = status('failed', { errors: [{ code: 131026, title: 'Message undeliverable' }] })
    await POST(post(f, sign(f)))
    expect(sendUpdates[1]).toMatchObject({ status: 'failed', error: '131026 Message undeliverable' })
  })

  it('ignores reports for messages it did not send (reminders, tests)', async () => {
    const s = status('delivered').replace('wamid.1', 'wamid.other')
    await POST(post(s, sign(s)))
    expect(sendUpdates).toHaveLength(0)
  })

  it('answers Meta’s check only with the right verify token', async () => {
    const ok = await GET(new NextRequest('https://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42'))
    expect(ok.status).toBe(200)
    expect(await ok.text()).toBe('42')
    const bad = await GET(new NextRequest('https://x/api/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42'))
    expect(bad.status).toBe(403)
  })

  it('rejects a body without a valid signature', async () => {
    expect((await POST(post(failed, null))).status).toBe(401)
    expect((await POST(post(failed, 'sha256=' + '0'.repeat(64)))).status).toBe(401)
    expect(logError).not.toHaveBeenCalled()
  })

  it('reports a failed delivery with Meta’s reason and no full number', async () => {
    const res = await POST(post(failed, sign(failed)))
    expect(res.status).toBe(200)
    expect(logError).toHaveBeenCalledOnce()
    const [event, err, data] = logError.mock.calls[0]
    expect(event).toBe('whatsapp.delivery_failed')
    expect((err as Error).message).toContain('131042')
    expect(data).toMatchObject({ code: 131042, to: '…331' })
    expect(JSON.stringify(data)).not.toContain('26775406331')
  })

  it('compares signatures safely when lengths differ', () => {
    expect(signatureValid('x', 'sha256=short', SECRET)).toBe(false)
    expect(signatureValid('x', sign('x'), SECRET)).toBe(true)
  })
})
