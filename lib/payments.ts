// Money in cents-safe steps: payments add up exactly to the invoice total.
export function cents(n: number) {
  return Math.round(Number(n || 0) * 100) / 100
}

export function paidSoFar(payments: { amount: number | string }[] | null | undefined) {
  return cents((payments ?? []).reduce((s, p) => s + Number(p.amount || 0), 0))
}

// What the client still owes. Never below zero.
export function balanceDue(total: number | string, payments: { amount: number | string }[] | null | undefined) {
  return Math.max(0, cents(Number(total || 0) - paidSoFar(payments)))
}

// Today in Botswana, as YYYY-MM-DD.
export function todayIso() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Gaborone' }).format(new Date())
}

// How a walk-in client paid at the counter. Kept as the payment's note, so it
// shows on the receipt and in the payments list.
export const PAYMENT_METHODS = ['Cash', 'Orange Money', 'MyZaka', 'Smega', 'Bank transfer', 'Card'] as const
