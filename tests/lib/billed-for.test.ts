import { describe, it, expect } from 'vitest'
import { billedForLabel, billedForWaLine } from '@/lib/billed-for'

describe('billed for', () => {
  it('names the line by business type', () => {
    expect(billedForLabel('tuition_centre')).toBe('Student')
    expect(billedForLabel('contractor')).toBe('Project')
    expect(billedForLabel('salon')).toBe('For')
    expect(billedForLabel(null)).toBe('For')
  })

  it('makes a bold WhatsApp line, or nothing when empty', () => {
    expect(billedForWaLine('tuition_centre', ' Thato Mosweu ')).toBe('Student: *Thato Mosweu*')
    expect(billedForWaLine('tuition_centre', '  ')).toBe('')
    expect(billedForWaLine('tuition_centre', null)).toBe('')
  })
})
