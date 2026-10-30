// Days after the due date a reminder can go out on, and the ones on by default.
// The person's choice is saved on their profile (reminder_days, migration 043).
export const REMINDER_DAYS = [3, 7, 14, 30] as const
export const DEFAULT_REMINDER_DAYS = [3, 7, 14]

// A clean copy of a saved or submitted list of days; null if it isn't a list.
export function cleanReminderDays(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null
  return REMINDER_DAYS.filter(d => v.includes(d))
}
