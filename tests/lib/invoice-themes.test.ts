import { describe, it, expect } from 'vitest'
import { resolveTheme, THEME_ORDER, THEME_PRESETS, contrast, tint } from '@/lib/invoice-themes'

const ORANGES = ['#F2A900', '#C98C00', '#FCEFC7']
const colours = (t: object) => Object.entries(t).filter(([k]) => k !== 'name').map(([, v]) => String(v).toUpperCase())

describe('resolveTheme with a custom accent', () => {
  it.each(THEME_ORDER)('leaves no brand orange in %s', id => {
    const t = resolveTheme(id, '#0E7C66', null)
    for (const o of ORANGES) expect(colours(t)).not.toContain(o)
    expect(t.accentColor).toBe('#0E7C66')
    expect(t.grandRowBg).toBe('#0E7C66')
  })

  it('turns the pale orange fills into a tint of the accent', () => {
    const t = resolveTheme('dark-modern', '#0E7C66', null)
    expect(t.tableRowAltBg).toBe(tint('#0E7C66', 0.8))
    expect(t.metaCardBg).toBe(tint('#0E7C66', 0.8))
  })

  it.each(THEME_ORDER)('keeps text readable on a dark accent and header in %s', id => {
    const t = resolveTheme(id, '#1A1A1A', '#FFFFFF')
    expect(contrast(t.grandRowText, t.grandRowBg)).toBeGreaterThanOrEqual(3)
    expect(contrast(t.tableHeadText, t.tableHeadBg)).toBeGreaterThanOrEqual(3)
    expect(contrast(t.headerFirmColor, t.headerBg)).toBeGreaterThanOrEqual(3)
    expect(contrast(t.invoiceLabelColor, t.headerBg)).toBeGreaterThanOrEqual(3)
  })

  it('returns the template untouched without custom colours', () => {
    expect(resolveTheme('minimal')).toBe(THEME_PRESETS['minimal'])
    expect(resolveTheme('nope')).toBe(THEME_PRESETS['dark-modern'])
  })
})
