// New accounts stay closed until StagePay is registered and launched.
// Set NEXT_PUBLIC_SIGNUPS_OPEN=true in Vercel on launch day to reopen sign-up.
// Supabase Auth → "Allow new users to sign up" must be switched on as well.
export const SIGNUPS_OPEN = process.env.NEXT_PUBLIC_SIGNUPS_OPEN === 'true'
