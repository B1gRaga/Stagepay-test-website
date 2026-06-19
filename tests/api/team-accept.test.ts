import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockGetCachedUser   = vi.fn()
const mockMemberSingle    = vi.fn()
const mockProfileSingle   = vi.fn()
const mockMemberUpdateEq  = vi.fn().mockResolvedValue({ error: null })
const mockProfileUpdateEq = vi.fn().mockResolvedValue({ error: null })

function buildServiceClient() {
  return {
    from: (table: string) => {
      if (table === 'team_members') return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: mockMemberSingle,
        update: vi.fn(() => ({ eq: mockMemberUpdateEq })),
      }
      if (table === 'profiles') return {
        select: vi.fn().mockReturnThis(),
        eq:     vi.fn().mockReturnThis(),
        single: mockProfileSingle,
        update: vi.fn(() => ({ eq: mockProfileUpdateEq })),
      }
      return {}
    },
  }
}

vi.mock('@/lib/supabase/server', () => ({
  getCachedUser: (...args: unknown[]) => mockGetCachedUser(...args),
  createServiceClient: () => buildServiceClient(),
}))

// ── Helpers ────────────────────────────────────────────────────────────────
function makeRequest(body: unknown) {
  return new NextRequest('http://localhost/api/team/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('POST /api/team/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockMemberUpdateEq.mockResolvedValue({ error: null })
    mockProfileUpdateEq.mockResolvedValue({ error: null })
  })

  it('returns 401 when not authenticated', async () => {
    mockGetCachedUser.mockResolvedValue(null)
    const { POST } = await import('@/app/api/team/accept/route')
    const res = await POST(makeRequest({ token: 'tok-1' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when token is missing', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    const { POST } = await import('@/app/api/team/accept/route')
    const res = await POST(makeRequest({}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when the invite does not exist or was already used', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockMemberSingle.mockResolvedValue({ data: null })
    const { POST } = await import('@/app/api/team/accept/route')
    const res = await POST(makeRequest({ token: 'used-or-bogus' }))
    expect(res.status).toBe(404)
  })

  it('returns 409 when the user is already a member of another team', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockMemberSingle.mockResolvedValue({ data: { id: 'm-1', team_id: 'team-1', email: 'a@b.com', status: 'pending' } })
    mockProfileSingle.mockResolvedValue({ data: { team_id: 'team-other' } })
    const { POST } = await import('@/app/api/team/accept/route')
    const res = await POST(makeRequest({ token: 'tok-1' }))
    expect(res.status).toBe(409)
    expect(mockMemberUpdateEq).not.toHaveBeenCalled()
  })

  it('activates the membership and upgrades the profile to business on success', async () => {
    mockGetCachedUser.mockResolvedValue({ id: 'user-1' })
    mockMemberSingle.mockResolvedValue({ data: { id: 'm-1', team_id: 'team-1', email: 'a@b.com', status: 'pending' } })
    mockProfileSingle.mockResolvedValue({ data: { team_id: null } })
    const { POST } = await import('@/app/api/team/accept/route')
    const res = await POST(makeRequest({ token: 'tok-1' }))
    expect(res.status).toBe(200)
    expect(mockMemberUpdateEq).toHaveBeenCalledWith('id', 'm-1')
    expect(mockProfileUpdateEq).toHaveBeenCalledWith('id', 'user-1')
  })
})
