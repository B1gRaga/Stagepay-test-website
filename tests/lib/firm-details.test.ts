import { describe, it, expect } from 'vitest'
import { countryCode, countryName } from '@/lib/countries'
import { firmLines } from '@/lib/firm-details'

describe('countries', () => {
  it('reads codes and older full names alike', () => {
    expect(countryCode('BW')).toBe('BW')
    expect(countryCode('bw')).toBe('BW')
    expect(countryCode('Botswana')).toBe('BW')
    expect(countryCode('Atlantis')).toBe('Atlantis')
    expect(countryCode(null)).toBe('')
  })

  it('prints the name, never the code', () => {
    expect(countryName('BW')).toBe('Botswana')
    expect(countryName('Botswana')).toBe('Botswana')
    expect(countryName('')).toBe('')
  })
})

describe('firmLines', () => {
  it('builds the invoice "from" block', () => {
    expect(firmLines({
      firm_name: 'Yugen Studios', name: 'N', email: 'hi@yugen.co.bw', phone: '71234567',
      address: 'Plot 123, Main Mall', city: 'Gaborone', country: 'BW', vat_number: 'P03812345W',
    })).toEqual({
      name: 'Yugen Studios',
      address: 'Plot 123, Main Mall, Gaborone, Botswana',
      contact: 'hi@yugen.co.bw  ·  71234567',
      vat: 'VAT No: P03812345W',
    })
  })

  it('doesn’t repeat a town or country already in the address', () => {
    expect(firmLines({ address: 'Plot 28057, Newtown, Maun, Botswana', city: 'MAUN', country: 'BW' }).address)
      .toBe('Plot 28057, Newtown, Maun, Botswana')
    expect(firmLines({ address: 'Plot 5, Maun Road', city: 'Maun', country: 'BW' }).address)
      .toBe('Plot 5, Maun Road, Maun, Botswana')
  })

  it('falls back to the person’s name and leaves empty parts out', () => {
    expect(firmLines({ firm_name: ' ', name: 'Mpho', country: 'Botswana' }))
      .toEqual({ name: 'Mpho', address: 'Botswana', contact: '', vat: '' })
  })
})
