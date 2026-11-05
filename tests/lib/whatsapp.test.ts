import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

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
})
