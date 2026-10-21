import { AuthStairs } from '@/components/auth/AuthStairs'

// Sign in and sign up share one shell, so moving between them keeps the
// stairs in place and only the form changes.
export default function StairsLayout({ children }: { children: React.ReactNode }) {
  return <AuthStairs>{children}</AuthStairs>
}
