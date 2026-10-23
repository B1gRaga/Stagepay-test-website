// Options for the pre-launch waitlist form. Values must stay in step with the
// checks in supabase/migrations/038_waitlist_validation.sql.

export const WAITLIST_TOWNS = [
  'Gaborone', 'Francistown', 'Maun', 'Molepolole', 'Mogoditshane', 'Palapye',
  'Serowe', 'Mahalapye', 'Lobatse', 'Kanye', 'Kasane', 'Selebi-Phikwe', 'Other',
] as const

export const CURRENT_METHODS = [
  { value: 'paper',         label: 'Paper receipt book' },
  { value: 'word_excel',    label: 'Word or Excel' },
  { value: 'whatsapp_text', label: 'A WhatsApp message' },
  { value: 'software',      label: 'Accounting software' },
  { value: 'none',          label: 'I don’t send invoices' },
] as const

export const WOULD_PAY = [
  { value: 'yes',     label: 'Yes, that’s fair' },
  { value: 'cheaper', label: 'Only if it were cheaper' },
  { value: 'unsure',  label: 'Not sure yet' },
  { value: 'no',      label: 'No' },
] as const

export const REFERRAL_CODE_RE = /^[a-f0-9]{8}$/
