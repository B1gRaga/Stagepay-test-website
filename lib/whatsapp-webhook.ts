import { createHmac, timingSafeEqual } from 'node:crypto'

// Meta signs every webhook body with the app secret: X-Hub-Signature-256: sha256=<hex>.
export function signatureValid(raw: string, header: string | null, secret: string) {
  if (!header?.startsWith('sha256=')) return false
  const expected = Buffer.from(createHmac('sha256', secret).update(raw).digest('hex'))
  const given = Buffer.from(header.slice(7))
  return given.length === expected.length && timingSafeEqual(given, expected)
}
