import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: vi.fn() }))
vi.mock('@/lib/whatsapp', () => ({ isWhatsAppConfigured: () => true }))

import { plannedReminders } from '@/lib/reminder-schedule'
import { cleanReminderDays, DEFAULT_REMINDER_DAYS } from '@/lib/reminder-days'
import { dayMonthYear } from '@/lib/format-date'

const NOW = new Date('2026-10-30T12:00:00Z')
const inv = { due_date: '2026-11-29', client_email: 'thato@example.com', client_phone: '+267 71 234 567' }

describe('plannedReminders', () => {
  it('schedules each chosen day at 08:00 in Gaborone, by email', () => {
    const rows = plannedReminders(inv, [3, 7, 14], { whatsapp: false, now: NOW })
    expect(rows.map(r => [r.channel, r.days_after_due, r.send_at])).toEqual([
      ['email', 3, '2026-12-02T06:00:00.000Z'],
      ['email', 7, '2026-12-06T06:00:00.000Z'],
      ['email', 14, '2026-12-13T06:00:00.000Z'],
    ])
    expect(rows[0]).toMatchObject({ recipient_email: 'thato@example.com', recipient_phone: null })
  })

  it('adds WhatsApp only when it is switched on and there is a number', () => {
    const both = plannedReminders(inv, [3], { whatsapp: true, now: NOW })
    expect(both.map(r => r.channel)).toEqual(['email', 'whatsapp'])
    expect(both[1]).toMatchObject({ recipient_phone: '+267 71 234 567', recipient_email: null })

    const noPhone = plannedReminders({ ...inv, client_phone: null }, [3], { whatsapp: true, now: NOW })
    expect(noPhone.map(r => r.channel)).toEqual(['email'])
  })

  it('schedules nothing without a way to reach the client or without a due date', () => {
    expect(plannedReminders({ ...inv, client_email: '  ' }, [3], { whatsapp: false, now: NOW })).toEqual([])
    expect(plannedReminders({ ...inv, due_date: null }, [3], { whatsapp: true, now: NOW })).toEqual([])
  })

  it('skips days already past, so a late send is not chased several times at once', () => {
    const rows = plannedReminders({ ...inv, due_date: '2026-10-20' }, [3, 7, 14, 30], { whatsapp: false, now: NOW })
    expect(rows.map(r => r.days_after_due)).toEqual([14, 30])
  })

  it('crosses month and year ends correctly', () => {
    const rows = plannedReminders({ ...inv, due_date: '2026-12-30' }, [3], { whatsapp: false, now: NOW })
    expect(rows[0].send_at).toBe('2027-01-02T06:00:00.000Z')
  })
})

describe('cleanReminderDays', () => {
  it('keeps only the allowed days, in order, and rejects anything that is not a list', () => {
    expect(cleanReminderDays([30, 3, 5, 14, 3])).toEqual([3, 14, 30])
    expect(cleanReminderDays([])).toEqual([])
    expect(cleanReminderDays('3,7')).toBeNull()
    expect(DEFAULT_REMINDER_DAYS).toEqual([3, 7, 14])
  })
})

describe('dayMonthYear', () => {
  it('writes dates the way clients read them', () => {
    expect(dayMonthYear('2026-11-29')).toBe('29 Nov 2026')
    expect(dayMonthYear('2026-01-05T00:00:00Z')).toBe('5 Jan 2026')
    expect(dayMonthYear(null)).toBe('')
  })
})
