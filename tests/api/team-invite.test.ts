import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser     = vi.fn()
const mockProfileSingle     = vi.fn()
const mockTeamInsertSingle  = vi.fn()
const mockProfileUpdateEq   = vi.fn().mockResolvedValue({ error: null })
const mockTeamMembersEq     = vi.fn()
const mockUpsertSingle      = vi.fn()

function buildAuthedClient() {
  return {
    from: (table: string) => {
      if (table === 'profiles') return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: mockProfileSingle,
      }
      return {}
    },
  }
}

function buildServiceClient() {
  return {
    from: (table: string) => {
      if (table === 'teams') return {
        insert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockTeamInsertSingle })) })),
      }
      if (table === 'profiles') return {
        update: vi.fn(() => ({ eq: mockProfileUpdateEq })),
      }
      if (table === 'team_members') return {
        select: vi.fn(() => ({ eq: mockTeamMembersEq })),
        upsert: vi.fn(() => ({ select: vi.fn(() => ({ single: mockUpsertSingle })) })),
      }
      return {}
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  createClient:  async () => buildAuthedClient(),
  createServiceClient: () => buildServiceClient(),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest('http://localhost/api/team/invite', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('POST /api/team/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfileUpdateEq.mockResolvedValue({ error: null })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'a@b.com' }))
    expect(res.status).toBe(401)
  })

  it('returns 403 when the user is not on the Business plan', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1', email: 'owner@co.com' })
    mockProfileSingle.mockResolvedValue({ data: { plan: 'pro', firm_name: 'Acme', team_id: null } })
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'a@b.com' }))
    expect(res.status).toBe(403)
  })

  it('returns 400 for an invalid email', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1', email: 'owner@co.com' })
    mockProfileSingle.mockResolvedValue({ data: { plan: 'business', firm_name: 'Acme', team_id: 'team-1' } })
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'not-an-email' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when inviting yourself', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1', email: 'Owner@Co.com' })
    mockProfileSingle.mockResolvedValue({ data: { plan: 'business', firm_name: 'Acme', team_id: 'team-1' } })
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'owner@co.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'You cannot invite yourself' })
  })

  it('creates a team and links the owner when the profile has no team yet', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1', email: 'owner@co.com' })
    mockProfileSingle.mockResolvedValue({ data: { plan: 'business', firm_name: 'Acme', team_id: null } })
    mockTeamInsertSingle.mockResolvedValue({ data: { id: 'team-new' }, error: null })
    mockTeamMembersEq.mockResolvedValue({ count: 0 })
    mockUpsertSingle.mockResolvedValue({ data: { invite_token: 'tok-1' }, error: null })
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'new@co.com' }))
    expect(res.status).toBe(200)
    expect(mockProfileUpdateEq).toHaveBeenCalledWith('id', 'user-1')
    expect(await res.json()).toMatchObject({ inviteUrl: expect.stringContaining('/join/tok-1') })
  })

  it('returns 500 when team creation fails', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1', email: 'owner@co.com' })
    mockProfileSingle.mockResolvedValue({ data: { plan: 'business', firm_name: 'Acme', team_id: null } })
    mockTeamInsertSingle.mockResolvedValue({ data: null, error: { message: 'insert failed' } })
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'new@co.com' }))
    expect(res.status).toBe(500)
  })

  it('returns 400 when the team is already at max size per the application-level count check', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1', email: 'owner@co.com' })
    mockProfileSingle.mockResolvedValue({ data: { plan: 'business', firm_name: 'Acme', team_id: 'team-1' } })
    // 4 existing members + the owner = 5, already at MAX_TEAM_SIZE
    mockTeamMembersEq.mockResolvedValue({ count: 4 })
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'new@co.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('Team is full') })
  })

  it('returns 409 when the email is already a team member', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1', email: 'owner@co.com' })
    mockProfileSingle.mockResolvedValue({ data: { plan: 'business', firm_name: 'Acme', team_id: 'team-1' } })
    mockTeamMembersEq.mockResolvedValue({ count: 1 })
    mockUpsertSingle.mockResolvedValue({ data: null, error: { code: '23505', message: 'duplicate' } })
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'existing@co.com' }))
    expect(res.status).toBe(409)
  })

  it('returns 400 when the DB size-guard trigger rejects the insert as a race-condition backstop', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1', email: 'owner@co.com' })
    mockProfileSingle.mockResolvedValue({ data: { plan: 'business', firm_name: 'Acme', team_id: 'team-1' } })
    mockTeamMembersEq.mockResolvedValue({ count: 3 })
    mockUpsertSingle.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'team full' } })
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'new@co.com' }))
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: expect.stringContaining('Team is full') })
  })

  it('builds the invite URL from the request origin header when present', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1', email: 'owner@co.com' })
    mockProfileSingle.mockResolvedValue({ data: { plan: 'business', firm_name: 'Acme', team_id: 'team-1' } })
    mockTeamMembersEq.mockResolvedValue({ count: 0 })
    mockUpsertSingle.mockResolvedValue({ data: { invite_token: 'tok-2' }, error: null })
    const { POST } = await import('@/app/api/team/invite/route')
    const res = await POST(makeRequest({ email: 'new@co.com' }, { origin: 'https://app.stagepay.co.bw' }))
    expect(await res.json()).toMatchObject({ inviteUrl: 'https://app.stagepay.co.bw/join/tok-2' })
  })
})
