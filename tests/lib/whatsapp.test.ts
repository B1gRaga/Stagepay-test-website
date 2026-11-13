import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { barePhone, whatsAppErrorText } from '@/lib/whatsapp'

// A token copied in Meta's shortened form ("EAAG…") used to crash inside fetch
// with "Cannot convert argument to a ByteString"; it now fails with a clear message.
describe('sendWhatsApp token check', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '123'
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.1' }] }), { status: 200 }))
  })
  afterEach(() => { vi.unstubAllGlobals(); delete process.env.WHATSAPP_ACCESS_TOKEN })

  it('refuses a shortened token without calling Meta', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'EAAG…xyz'
    const { sendWhatsApp } = await import('@/lib/whatsapp')
    await expect(sendWhatsApp('+26771234567', { text: 'hi' })).rejects.toThrow(/WHATSAPP_ACCESS_TOKEN is malformed/)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('sends with a normal token', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'EAAGabc123'
    const { sendWhatsApp } = await import('@/lib/whatsapp')
    await sendWhatsApp('+26771234567', { text: 'hi' })
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer EAAGabc123')
  })

  it('adds a URL button component only when the template has button params', async () => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'EAAGabc123'
    const { sendWhatsApp } = await import('@/lib/whatsapp')
    await sendWhatsApp('71234567', { text: 'x', template: { name: 'invoice_ready', params: ['A', 'B'], buttonParams: ['tok'] } })
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body.to).toBe('26771234567')
    expect(body.template.components).toEqual([
      { type: 'body', parameters: [{ type: 'text', text: 'A' }, { type: 'text', text: 'B' }] },
      { type: 'button', sub_type: 'url', index: '0', parameters: [{ type: 'text', text: 'tok' }] },
    ])
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ messages: [{ id: 'wamid.2' }] }), { status: 200 }))
    await sendWhatsApp('71234567', { text: 'x', template: { name: 'payment_reminder', params: ['A'] } })
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).template.components).toHaveLength(1)
  })
})

describe('barePhone', () => {
  it('gives a local Botswana mobile its country code, like wa.me links do', () => {
    expect(barePhone('71 234 567')).toBe('26771234567')
    expect(barePhone('+267 71 234 567')).toBe('26771234567')
    expect(barePhone('whatsapp:+27 82 123 4567')).toBe('27821234567')
    expect(barePhone('0027821234567')).toBe('27821234567')
  })
})

describe('whatsAppErrorText', () => {
  it('turns Meta’s codes into plain words and trims the rest', () => {
    expect(whatsAppErrorText('(#131026) Message Undeliverable')).toBe('This number is not on WhatsApp')
    expect(whatsAppErrorText('(#132001) Template name does not exist in the translation')).toBe('The message template is missing or not approved yet')
    expect(whatsAppErrorText('(#131047) Re-engagement message')).toBe('WhatsApp needs an approved template for this message')
    expect(whatsAppErrorText('(#100) Something odd')).toBe('Something odd')
  })
})
