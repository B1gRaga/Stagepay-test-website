import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser = vi.fn()
const mockTeamSingle     = vi.fn()
const mockMembersOrder   = vi.fn()

function buildClient() {
  return {
    from: (table: string) => {
      if (table === 'teams') return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: mockTeamSingle,
      }
      if (table === 'team_members') return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        order:  mockMembersOrder,
      }
      return {}
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  createClient:  async () => buildClient(),
}))

// ── Tests ──────────────────────────────────────────────────────────────────
describe('GET /api/team/members', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { GET } = await import('@/app/api/team/members/route')
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns an empty member list when the user owns no team', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockTeamSingle.mockResolvedValue({ data: null })
    const { GET } = await import('@/app/api/team/members/route')
    const res = await GET()
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ members: [], teamId: null })
    expect(mockMembersOrder).not.toHaveBeenCalled()
  })

  it('returns the team members ordered by invite date when the user owns a team', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockTeamSingle.mockResolvedValue({ data: { id: 'team-1', name: 'Acme' } })
    mockMembersOrder.mockResolvedValue({
      data: [{ id: 'm-1', email: 'a@b.com', status: 'active', invited_at: '2026-01-01', joined_at: '2026-01-02', invite_token: null }],
    })
    const { GET } = await import('@/app/api/team/members/route')
    const res = await GET()
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.teamId).toBe('team-1')
    expect(json.members).toHaveLength(1)
  })

  it('returns an empty array if the members query returns null data', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockTeamSingle.mockResolvedValue({ data: { id: 'team-1', name: 'Acme' } })
    mockMembersOrder.mockResolvedValue({ data: null })
    const { GET } = await import('@/app/api/team/members/route')
    const res = await GET()
    const json = await res.json()
    expect(json.members).toEqual([])
  })
})
