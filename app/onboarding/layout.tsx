import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AuthStairs } from '@/components/auth/AuthStairs'

// Onboarding sits on the same stairs as sign-up, which it follows.
export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')
  return <AuthStairs>{children}</AuthStairs>
}
