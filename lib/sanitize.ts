const TAG_RE = /<[^>]*>/g

export function stripTags(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.replace(TAG_RE, '').trim()
}

export function stripTagsOrNull(value: unknown): string | null {
  if (value == null) return null
  const s = stripTags(value)
  return s === '' ? null : s
}
