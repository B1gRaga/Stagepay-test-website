// How a client can pay: bank accounts and Botswana mobile money wallets,
// stored as a list on the profile (first one is the preferred method).

export type PaymentKind = 'bank' | 'orange' | 'myzaka' | 'smega'

export type PaymentMethod = {
  kind: PaymentKind
  bank?: string           // bank only
  account_name?: string   // bank: name on the account; wallets: registered name
  number?: string         // bank: account number; wallets: phone number or merchant code
  branch_code?: string    // bank only
  swift?: string          // bank only
}

export const MAX_METHODS = 6

export const KIND_LABEL: Record<PaymentKind, string> = {
  bank:   'Bank account',
  orange: 'Orange Money',
  myzaka: 'MyZaka',
  smega:  'Smega',
}

const FIELDS: (keyof Omit<PaymentMethod, 'kind'>)[] = ['bank', 'account_name', 'number', 'branch_code', 'swift']

// Cleans one method from a request; returns null when it isn't a usable method.
export function cleanMethod(raw: unknown): PaymentMethod | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.kind !== 'string' || !(r.kind in KIND_LABEL)) return null
  const m: PaymentMethod = { kind: r.kind as PaymentKind }
  for (const f of FIELDS) {
    if (f !== 'account_name' && f !== 'number' && m.kind !== 'bank') continue
    const v = typeof r[f] === 'string' ? (r[f] as string).replace(/<[^>]*>/g, '').trim().slice(0, 80) : ''
    if (v) m[f] = v
  }
  return m.number ? m : null
}

// One block per method, ready to print: a title and label/value rows.
export function paymentBlocks(list: unknown): { title: string; rows: [string, string][] }[] {
  if (!Array.isArray(list)) return []
  return list.map(cleanMethod).filter((m): m is PaymentMethod => !!m).map(m => {
    if (m.kind === 'bank') {
      const rows: [string, string | undefined][] = [
        ['Account name', m.account_name],
        ['Account number', m.number],
        ['Branch code', m.branch_code],
        ['SWIFT', m.swift],
      ]
      return { title: m.bank || KIND_LABEL.bank, rows: rows.filter((r): r is [string, string] => !!r[1]) }
    }
    const rows: [string, string | undefined][] = [
      ['Number', m.number],
      ['Name', m.account_name],
    ]
    return { title: KIND_LABEL[m.kind], rows: rows.filter((r): r is [string, string] => !!r[1]) }
  })
}
