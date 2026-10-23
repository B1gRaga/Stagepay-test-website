import { describe, it, expect, vi, afterEach } from 'vitest'
import { sharePdf } from '@/lib/wa-share'

// Closing the share menu is not a failure: the send screen stays as it was.
// Any other error makes the screen offer the wa.me link instead.
describe('sharePdf', () => {
  afterEach(() => vi.unstubAllGlobals())
  const file = new File(['%PDF'], 'INV-001.pdf', { type: 'application/pdf' })

  it('passes the PDF and message to the share menu', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { share })
    expect(await sharePdf(file, 'Here is invoice INV-001')).toBe('shared')
    expect(share).toHaveBeenCalledWith({ files: [file], text: 'Here is invoice INV-001' })
  })

  it('reports a closed share menu as cancelled', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError')) })
    expect(await sharePdf(file, '')).toBe('cancelled')
  })

  it('reports anything else as failed', async () => {
    vi.stubGlobal('navigator', { share: vi.fn().mockRejectedValue(new DOMException('no', 'NotAllowedError')) })
    expect(await sharePdf(file, '')).toBe('failed')
  })
})
