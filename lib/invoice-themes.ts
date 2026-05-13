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
    headerBg:          '#0F172A',
    headerFirmColor:   '#10B981',
    headerSubColor:    '#94A3B8',
    invoiceLabelColor: '#10B981',
    tableHeadBg:       '#0F172A',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#E8F8F2',
    grandRowBg:        '#10B981',
    grandRowText:      '#FFFFFF',
    boxBg:             '#F8FAFC',
    lineColor:         '#E2E8F0',
    bodyText:          '#0F172A',
    accentColor:       '#10B981',
    footerBg:          '#0F172A',
    footerBrandColor:  '#10B981',
    footerTextColor:   '#CBD5E1',
    metaCardBg:        '#E8F8F2',
    metaCardBorder:    '',
    pageBg:            '#FFFFFF',
  },
  'clean-light': {
    name:              'Clean Light',
    headerBg:          '#F8FAFC',
    headerFirmColor:   '#1E2D3D',
    headerSubColor:    '#94A3B8',
    invoiceLabelColor: '#0F172A',
    tableHeadBg:       '#0F172A',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#E8F8F2',
    grandRowBg:        '#1E2D3D',
    grandRowText:      '#FFFFFF',
    boxBg:             '#F1F5F9',
    lineColor:         '#E2EBF0',
    bodyText:          '#1E2D3D',
    accentColor:       '#3B82F6',
    footerBg:          '#0F172A',
    footerBrandColor:  '#10B981',
    footerTextColor:   '#94A3B8',
    metaCardBg:        '#FFFFFF',
    metaCardBorder:    '#E2EBF0',
    pageBg:            '#FFFFFF',
  },
  'minimal': {
    name:              'Minimal',
    headerBg:          '#FFFFFF',
    headerFirmColor:   '#0F172A',
    headerSubColor:    '#94A3B8',
    invoiceLabelColor: '#0F172A',
    tableHeadBg:       '#10B981',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#E8F8F2',
    grandRowBg:        '#0F172A',
    grandRowText:      '#FFFFFF',
    boxBg:             '#F8FAFC',
    lineColor:         '#E8EDF2',
    bodyText:          '#0F172A',
    accentColor:       '#0F172A',
    footerBg:          '#F8FAFC',
    footerBrandColor:  '#10B981',
    footerTextColor:   '#94A3B8',
    metaCardBg:        '#F8FAFC',
    metaCardBorder:    '#E2EBF0',
    pageBg:            '#FFFFFF',
  },
  'charcoal': {
    name:              'Charcoal',
    headerBg:          '#263244',
    headerFirmColor:   '#10B981',
    headerSubColor:    '#94A3B8',
    invoiceLabelColor: '#10B981',
    tableHeadBg:       '#12293B',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#1E3448',
    grandRowBg:        '#10B981',
    grandRowText:      '#FFFFFF',
    boxBg:             '#1A3045',
    lineColor:         '#243547',
    bodyText:          '#E2EBF0',
    accentColor:       '#10B981',
    footerBg:          '#263244',
    footerBrandColor:  '#10B981',
    footerTextColor:   '#64748B',
    metaCardBg:        '#1A3045',
    metaCardBorder:    '#243547',
    pageBg:            '#152336',
  },
  'bold-emerald': {
    name:              'Bold Emerald',
    headerBg:          '#10B981',
    headerFirmColor:   '#0F172A',
    headerSubColor:    '#0F172A',
    invoiceLabelColor: '#FFFFFF',
    tableHeadBg:       '#0F172A',
    tableHeadText:     '#FFFFFF',
    tableRowAltBg:     '#E8F8F2',
    grandRowBg:        '#059669',
    grandRowText:      '#FFFFFF',
    boxBg:             '#E8F8F2',
    lineColor:         '#D1F0E4',
    bodyText:          '#0F172A',
    accentColor:       '#059669',
    footerBg:          '#10B981',
    footerBrandColor:  '#0F172A',
    footerTextColor:   '#0F4D33',
    metaCardBg:        '#E8F8F2',
    metaCardBorder:    '',
    pageBg:            '#FFFFFF',
  },
}

export const THEME_ORDER = ['dark-modern', 'clean-light', 'minimal', 'charcoal', 'bold-emerald']

export function resolveTheme(
  themeKey?:     string | null,
  primaryColor?: string | null,
  headerColor?:  string | null,
): InvoiceTheme {
  const base = THEME_PRESETS[themeKey ?? 'dark-modern'] ?? THEME_PRESETS['dark-modern']
  return {
    ...base,
    ...(primaryColor ? { accentColor: primaryColor, grandRowBg: primaryColor } : {}),
    ...(headerColor  ? { headerBg:    headerColor  } : {}),
  }
}
