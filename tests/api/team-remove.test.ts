import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser    = vi.fn()
const mockMemberSingle     = vi.fn()
const mockProfileUpdateEq  = vi.fn().mockResolvedValue({ error: null })
const mockMemberDeleteEq   = vi.fn().mockResolvedValue({ error: null })

function buildAuthedClient() {
  return {
    from: (table: string) => {
      if (table === 'team_members') return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: mockMemberSingle,
      }
      return {}
    },
  }
}

function buildServiceClient() {
  return {
    from: (table: string) => {
      if (table === 'profiles') return {
        update: vi.fn(() => ({ eq: mockProfileUpdateEq })),
      }
      if (table === 'team_members') return {
        delete: vi.fn(() => ({ eq: mockMemberDeleteEq })),
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
function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/team/remove', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('POST /api/team/remove', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockProfileUpdateEq.mockResolvedValue({ error: null })
    mockMemberDeleteEq.mockResolvedValue({ error: null })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/team/remove/route')
    const res = await POST(makeRequest({ memberId: 'm-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when memberId is missing', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    const { POST } = await import('@/app/api/team/remove/route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the member does not exist', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockMemberSingle.mockResolvedValue({ data: null })
    const { POST } = await import('@/app/api/team/remove/route')
    const res = await POST(makeRequest({ memberId: 'ghost' }))
    expect(res.status).toBe(404)
  })

  it('returns 403 when the requester is not the owner of the member\'s team', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockMemberSingle.mockResolvedValue({
      data: { id: 'm-1', user_id: 'user-2', team_id: 'team-1', teams: { owner_id: 'someone-else' } },
    })
    const { POST } = await import('@/app/api/team/remove/route')
    const res = await POST(makeRequest({ memberId: 'm-1' }))
    expect(res.status).toBe(403)
    expect(mockMemberDeleteEq).not.toHaveBeenCalled()
  })

  it('removes the member and reverts their plan to free when they have a linked account', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'owner-1' })
    mockMemberSingle.mockResolvedValue({
      data: { id: 'm-1', user_id: 'user-2', team_id: 'team-1', teams: { owner_id: 'owner-1' } },
    })
    const { POST } = await import('@/app/api/team/remove/route')
    const res = await POST(makeRequest({ memberId: 'm-1' }))
    expect(res.status).toBe(200)
    expect(mockProfileUpdateEq).toHaveBeenCalledWith('id', 'user-2')
    expect(mockMemberDeleteEq).toHaveBeenCalledWith('id', 'm-1')
  })

  it('removes a still-pending invite without touching any profile', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'owner-1' })
    mockMemberSingle.mockResolvedValue({
      data: { id: 'm-2', user_id: null, team_id: 'team-1', teams: { owner_id: 'owner-1' } },
    })
    const { POST } = await import('@/app/api/team/remove/route')
    const res = await POST(makeRequest({ memberId: 'm-2' }))
    expect(res.status).toBe(200)
    expect(mockProfileUpdateEq).not.toHaveBeenCalled()
    expect(mockMemberDeleteEq).toHaveBeenCalledWith('id', 'm-2')
  })
})
