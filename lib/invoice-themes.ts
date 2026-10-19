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
    const defaultAccent = base.accentColor
    // Replace every colour field that was using the theme's default accent colour
    for (const key of Object.keys(result)) {
      if (result[key] === defaultAccent) result[key] = primaryColor
    }
    // Always override core brand-expression fields regardless of their base value
    result.accentColor      = primaryColor
    result.grandRowBg       = primaryColor
    result.footerBrandColor = primaryColor
  }

  if (headerColor && /^#[0-9a-f]{6}$/i.test(headerColor)) {
    result.headerBg = headerColor
  }

  return result as unknown as InvoiceTheme
}
