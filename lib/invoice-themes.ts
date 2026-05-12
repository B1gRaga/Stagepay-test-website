export interface InvoiceTheme {
  name:            string
  headerBg:        string
  headerFirmColor: string
  headerSubColor:  string
  tableHeadBg:     string
  tableHeadText:   string
  tableRowAltBg:   string
  grandRowBg:      string
  grandRowText:    string
  boxBg:           string
  lineColor:       string
  bodyText:        string
  accentColor:     string
  footerTextColor: string
  pageBg:          string
}

export const THEME_PRESETS: Record<string, InvoiceTheme> = {
  'dark-modern': {
    name:            'Dark Modern',
    headerBg:        '#0F172A',
    headerFirmColor: '#10B981',
    headerSubColor:  '#94A3B8',
    tableHeadBg:     '#0F172A',
    tableHeadText:   '#FFFFFF',
    tableRowAltBg:   '#F8FAFC',
    grandRowBg:      '#10B981',
    grandRowText:    '#FFFFFF',
    boxBg:           '#F8FAFC',
    lineColor:       '#E2E8F0',
    bodyText:        '#0F172A',
    accentColor:     '#10B981',
    footerTextColor: '#CBD5E1',
    pageBg:          '#FFFFFF',
  },
  'clean-light': {
    name:            'Clean Light',
    headerBg:        '#FFFFFF',
    headerFirmColor: '#1E2D3D',
    headerSubColor:  '#94A3B8',
    tableHeadBg:     '#F1F5F9',
    tableHeadText:   '#1E2D3D',
    tableRowAltBg:   '#F8FAFC',
    grandRowBg:      '#1E2D3D',
    grandRowText:    '#FFFFFF',
    boxBg:           '#F1F5F9',
    lineColor:       '#E2EBF0',
    bodyText:        '#1E2D3D',
    accentColor:     '#3B82F6',
    footerTextColor: '#94A3B8',
    pageBg:          '#FFFFFF',
  },
  'minimal': {
    name:            'Minimal',
    headerBg:        '#FFFFFF',
    headerFirmColor: '#0F172A',
    headerSubColor:  '#94A3B8',
    tableHeadBg:     '#FFFFFF',
    tableHeadText:   '#0F172A',
    tableRowAltBg:   '#FAFAFA',
    grandRowBg:      '#0F172A',
    grandRowText:    '#FFFFFF',
    boxBg:           '#F8FAFC',
    lineColor:       '#E8EDF2',
    bodyText:        '#0F172A',
    accentColor:     '#0F172A',
    footerTextColor: '#94A3B8',
    pageBg:          '#FFFFFF',
  },
  'charcoal': {
    name:            'Charcoal',
    headerBg:        '#12293B',
    headerFirmColor: '#10B981',
    headerSubColor:  '#94A3B8',
    tableHeadBg:     '#12293B',
    tableHeadText:   '#FFFFFF',
    tableRowAltBg:   '#1E3448',
    grandRowBg:      '#10B981',
    grandRowText:    '#FFFFFF',
    boxBg:           '#1A3045',
    lineColor:       '#243547',
    bodyText:        '#E2EBF0',
    accentColor:     '#10B981',
    footerTextColor: '#64748B',
    pageBg:          '#152336',
  },
  'bold-emerald': {
    name:            'Bold Emerald',
    headerBg:        '#10B981',
    headerFirmColor: '#0F172A',
    headerSubColor:  '#0F172A',
    tableHeadBg:     '#059669',
    tableHeadText:   '#FFFFFF',
    tableRowAltBg:   '#E8F8F2',
    grandRowBg:      '#059669',
    grandRowText:    '#FFFFFF',
    boxBg:           '#E8F8F2',
    lineColor:       '#D1F0E4',
    bodyText:        '#0F172A',
    accentColor:     '#059669',
    footerTextColor: '#0F172A',
    pageBg:          '#FFFFFF',
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
