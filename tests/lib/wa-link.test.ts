import { describe, it, expect } from 'vitest'
import { waNumber, waLink } from '@/lib/wa-link'

describe('waNumber', () => {
  it('adds the Botswana country code to a local 8-digit mobile', () => {
    expect(waNumber('75406331')).toBe('26775406331')
    expect(waNumber('71 234 567')).toBe('26771234567')
  })

  it('keeps numbers that already carry a country code', () => {
    expect(waNumber('+267 75 406 331')).toBe('26775406331')
    expect(waNumber('0026775406331')).toBe('26775406331')
    expect(waNumber('whatsapp:+27821234567')).toBe('27821234567')
  })

  it('leaves other local formats alone', () => {
    expect(waNumber('3901234')).toBe('3901234')
  })
})

describe('waLink', () => {
  it('builds a chat link, with the message when given', () => {
    expect(waLink('75406331')).toBe('https://wa.me/26775406331')
    expect(waLink('75406331', 'Hi there')).toBe('https://wa.me/26775406331?text=Hi%20there')
  })
})
