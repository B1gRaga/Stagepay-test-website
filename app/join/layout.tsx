import { AuthStairs } from '@/components/auth/AuthStairs'

// Invite links sit on the same stairs as sign-in, which they often follow.
export default function JoinLayout({ children }: { children: React.ReactNode }) {
  return <AuthStairs>{children}</AuthStairs>
}
