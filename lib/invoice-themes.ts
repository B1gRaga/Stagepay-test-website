export interface InvoiceTheme {
  name:              string
  // Header
  headerBg:          string
  headerFirmColor:   string
  headerSubColor:    string
  invoiceLabelColor: string   // "INVOICE" title in header
  // Table
  tableHeadBg:       string
  tableHeadText:     string
  tableRowAltBg:     string
  // Totals pill
  grandRowBg:        string
  grandRowText:      string
  // Legacy / shared
  boxBg:             string
  lineColor:         string
  bodyText:          string
  accentColor:       string
  // Footer
  footerBg:          string
  footerBrandColor:  string  // "STAGEPAY" bold text
  footerTextColor:   string  // muted footer text
  // Meta / address cards
  metaCardBg:        string
  metaCardBorder:    string  // empty = no border
  // Page
  pageBg:            string
}

export const THEME_PRESETS: Record<string, InvoiceTheme> = {
  'dark-modern': {
    name:              'Dark Modern',
    headerBg:          '#1F2A44',
    headerFirmColor:   '#F2A900',
    headerSubColor:    '#9FBCC8',
    invoiceLabelColor: '#F2A900',
    tableHeadBg:       '#1F2A44',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#FCEFC7',
    grandRowBg:        '#F2A900',
    grandRowText:      '#1F2A44',
    boxBg:             '#FAF7F0',
    lineColor:         '#E4DDCF',
    bodyText:          '#1F2A44',
    accentColor:       '#F2A900',
    footerBg:          '#1F2A44',
    footerBrandColor:  '#F2A900',
    footerTextColor:   '#9FBCC8',
    metaCardBg:        '#FCEFC7',
    metaCardBorder:    '',
    pageBg:            '#FFFFFF',
  },
  'clean-light': {
    name:              'Clean Light',
    headerBg:          '#F8FAFC',
    headerFirmColor:   '#1E2D3D',
    headerSubColor:    '#94A3B8',
    invoiceLabelColor: '#1F2A44',
    tableHeadBg:       '#1F2A44',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#FCEFC7',
    grandRowBg:        '#1E2D3D',
    grandRowText:      '#FFFFFF',
    boxBg:             '#F1F5F9',
    lineColor:         '#E2EBF0',
    bodyText:          '#1E2D3D',
    accentColor:       '#3B82F6',
    footerBg:          '#1F2A44',
    footerBrandColor:  '#F2A900',
    footerTextColor:   '#94A3B8',
    metaCardBg:        '#FFFFFF',
    metaCardBorder:    '#E2EBF0',
    pageBg:            '#FFFFFF',
  },
  'minimal': {
    name:              'Minimal',
    headerBg:          '#FFFFFF',
    headerFirmColor:   '#1F2A44',
    headerSubColor:    '#94A3B8',
    invoiceLabelColor: '#1F2A44',
    tableHeadBg:       '#F2A900',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#FCEFC7',
    grandRowBg:        '#1F2A44',
    grandRowText:      '#FFFFFF',
    boxBg:             '#F8FAFC',
    lineColor:         '#E8EDF2',
    bodyText:          '#1F2A44',
    accentColor:       '#1F2A44',
    footerBg:          '#F8FAFC',
    footerBrandColor:  '#F2A900',
    footerTextColor:   '#94A3B8',
    metaCardBg:        '#F8FAFC',
    metaCardBorder:    '#E2EBF0',
    pageBg:            '#FFFFFF',
  },
  'charcoal': {
    name:              'Charcoal',
    headerBg:          '#1F2A44',
    headerFirmColor:   '#F2A900',
    headerSubColor:    '#9FBCC8',
    invoiceLabelColor: '#F2A900',
    tableHeadBg:       '#18213A',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#2B3756',
    grandRowBg:        '#F2A900',
    grandRowText:      '#1F2A44',
    boxBg:             '#2B3756',
    lineColor:         '#32415A',
    bodyText:          '#FAF7F0',
    accentColor:       '#F2A900',
    footerBg:          '#1F2A44',
    footerBrandColor:  '#F2A900',
    footerTextColor:   '#5F7E8C',
    metaCardBg:        '#2B3756',
    metaCardBorder:    '#32415A',
    pageBg:            '#18213A',
  },
  'bold-amber': {
    name:              'Bold Amber',
    headerBg:          '#F2A900',
    headerFirmColor:   '#1F2A44',
    headerSubColor:    '#1F2A44',
    invoiceLabelColor: '#1F2A44',
    tableHeadBg:       '#1F2A44',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#FCEFC7',
    grandRowBg:        '#C98C00',
    grandRowText:      '#1F2A44',
    boxBg:             '#FCEFC7',
    lineColor:         '#F2DD9E',
    bodyText:          '#1F2A44',
    accentColor:       '#C98C00',
    footerBg:          '#F2A900',
    footerBrandColor:  '#1F2A44',
    footerTextColor:   '#6B4A00',
    metaCardBg:        '#FCEFC7',
    metaCardBorder:    '',
    pageBg:            '#FFFFFF',
  },
}

export const THEME_ORDER = ['dark-modern', 'clean-light', 'minimal', 'charcoal', 'bold-amber']

export function resolveTheme(
  themeKey?:     string | null,
  primaryColor?: string | null,
  headerColor?:  string | null,
): InvoiceTheme {
  const base = THEME_PRESETS[themeKey ?? 'dark-modern'] ?? THEME_PRESETS['dark-modern']
  if (!primaryColor && !headerColor) return base

  const result = { ...base } as Record<string, string>

  if (primaryColor && /^#[0-9a-f]{6}$/i.test(primaryColor)) {
    // Every shade of the brand orange follows the custom accent: the strong
    // ones become the accent, the pale fills become a light tint of it.
    const pale = tint(primaryColor, 0.8)
    for (const key of Object.keys(result)) {
      const v = result[key].toUpperCase()
      if (BRAND_ORANGES.includes(v) || v === base.accentColor.toUpperCase()) result[key] = primaryColor
      else if (v === BRAND_PALE) result[key] = pale
    }
    result.accentColor      = primaryColor
    result.grandRowBg       = primaryColor
    result.footerBrandColor = primaryColor
  }

  if (headerColor && /^#[0-9a-f]{6}$/i.test(headerColor)) {
    result.headerBg = headerColor
  }

  // Custom colours can make text unreadable on them; switch that text to white or ink.
  const pairs: [string, string][] = [
    ['grandRowText', 'grandRowBg'], ['tableHeadText', 'tableHeadBg'],
    ['headerFirmColor', 'headerBg'], ['invoiceLabelColor', 'headerBg'], ['headerSubColor', 'headerBg'],
    ['footerBrandColor', 'footerBg'], ['footerTextColor', 'footerBg'],
  ]
  for (const [fg, bg] of pairs) {
    if (contrast(result[fg], result[bg]) < (fg === 'headerSubColor' || fg === 'footerTextColor' ? 2.5 : 3)) {
      result[fg] = contrast('#FFFFFF', result[bg]) >= contrast(INK, result[bg]) ? '#FFFFFF' : INK
    }
  }

  return result as unknown as InvoiceTheme
}

const BRAND_ORANGES = ['#F2A900', '#C98C00']
const BRAND_PALE    = '#FCEFC7'
const INK           = '#1F2A44'

function rgb(hex: string) {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

// Mixes a colour with white: amount 0 = the colour, 1 = white.
export function tint(hex: string, amount: number) {
  return '#' + rgb(hex).map(c => Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0')).join('').toUpperCase()
}

function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map(c => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

export function contrast(a: string, b: string) {
  if (!/^#[0-9a-f]{6}$/i.test(a) || !/^#[0-9a-f]{6}$/i.test(b)) return 21
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
