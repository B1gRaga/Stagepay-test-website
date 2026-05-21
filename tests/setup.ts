import { vi } from 'vitest'

// Mock Next.js server-only APIs that don't exist outside request context
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    getAll: () => [],
    get:    vi.fn(),
    set:    vi.fn(),
  })),
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => { throw new Error(`REDIRECT:${url}`) }),
}))

// Sentry is a no-op in tests
vi.mock('@sentry/nextjs', () => ({
  captureException: vi.fn(),
  init: vi.fn(),
}))
