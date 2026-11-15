import { describe, it, expect } from 'vitest'
import { canBulkSend, canSendFromStagePay } from '@/lib/plans'

// Messages from StagePay's WhatsApp number cost StagePay money.
describe('sending from StagePay’s number', () => {
  it('one invoice at a time needs Pro or Business', () => {
    expect(canSendFromStagePay('free')).toBe(false)
    expect(canSendFromStagePay(null)).toBe(false)
    expect(canSendFromStagePay('pro')).toBe(true)
    expect(canSendFromStagePay('business')).toBe(true)
  })

  it('a whole class at once needs Business', () => {
    expect(canBulkSend('free')).toBe(false)
    expect(canBulkSend('pro')).toBe(false)
    expect(canBulkSend('business')).toBe(true)
  })
})
