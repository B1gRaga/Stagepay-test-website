import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.stubEnv('NEXT_PUBLIC_TEAMS_ENABLED', '1')

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser   = vi.fn()
const mockInviteSingle    = vi.fn()   // the pending invite, looked up by token
const mockAlreadyMember   = vi.fn()   // an active membership on the same team
const mockMemberUpdate    = vi.fn()
const mockProfileUpdate   = vi.fn()

// A query chain whose filters are recorded; it resolves to `result`.
function chain(result: () => unknown, record?: (calls: unknown[][]) => void) {
  const calls: unknown[][] = []
  const c: Record<string, unknown> = {
    eq: (...a: unknown[]) => { calls.push(a); return c },
    then: (resolve: (v: unknown) => void) => { record?.(calls); resolve(result()) },
  }
  return c
}

function buildServiceClient() {
  return {
    from: (table: string) => {
      if (table === 'team_members') return {
        select: (cols: string) => {
          const c: Record<string, unknown> = { eq: () => c }
          if (cols.includes('teams!inner')) c.single = mockInviteSingle
          else c.maybeSingle = mockAlreadyMember
          return c
        },
        update: (values: unknown) => chain(() => ({ error: null }), calls => mockMemberUpdate(values, calls)),
      }
      if (table === 'profiles') return {
        update: (values: unknown) => chain(() => ({ error: null }), calls => mockProfileUpdate(values, calls)),
      }
      return {}
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  createServiceClient: () => buildServiceClient(),
}))

function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/team/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const INVITE = { data: { id: 'm-1', team_id: 'team-1', email: 'a@b.com', status: 'pending', teams: { owner_id: 'owner-1', name: 'Acme Tutors' } } }

// ── Tests ──────────────────────────────────────────────────────────────────
describe('POST /api/team/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAlreadyMember.mockResolvedValue({ data: null })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/team/accept/route')
    expect((await POST(makeRequest({ token: 'tok-1' }))).status).toBe(401)
  })

  it('returns 400 when token is missing', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    const { POST } = await import('@/app/api/team/accept/route')
    expect((await POST(makeRequest({}))).status).toBe(400)
  })

  it('returns 404 when the invite does not exist or was already used', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockInviteSingle.mockResolvedValue({ data: null })
    const { POST } = await import('@/app/api/team/accept/route')
    expect((await POST(makeRequest({ token: 'used-or-bogus' }))).status).toBe(404)
  })

  it('refuses the owner joining their own team', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'owner-1' })
    mockInviteSingle.mockResolvedValue(INVITE)
    const { POST } = await import('@/app/api/team/accept/route')
    expect((await POST(makeRequest({ token: 'tok-1' }))).status).toBe(400)
    expect(mockMemberUpdate).not.toHaveBeenCalled()
  })

  it('returns 409 when they are already on this team', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockInviteSingle.mockResolvedValue(INVITE)
    mockAlreadyMember.mockResolvedValue({ data: { id: 'm-0' } })
    const { POST } = await import('@/app/api/team/accept/route')
    expect((await POST(makeRequest({ token: 'tok-1' }))).status).toBe(409)
    expect(mockMemberUpdate).not.toHaveBeenCalled()
  })

  it('joins, opens the team business, and leaves their own plan alone', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockInviteSingle.mockResolvedValue(INVITE)
    const { POST } = await import('@/app/api/team/accept/route')
    const res = await POST(makeRequest({ token: 'tok-1' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, business: 'Acme Tutors' })

    const [memberValues, memberFilters] = mockMemberUpdate.mock.calls[0]
    expect(memberValues).toMatchObject({ user_id: 'user-1', status: 'active', invite_token: null })
    expect(memberFilters).toContainEqual(['id', 'm-1'])

    const [profileValues, profileFilters] = mockProfileUpdate.mock.calls[0]
    expect(profileValues).toEqual({ current_account_id: 'owner-1' })
    expect(profileFilters).toContainEqual(['id', 'user-1'])
  })
})
