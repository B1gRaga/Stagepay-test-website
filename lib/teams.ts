// Shared team accounts are built but stay off until they've been trialled
// (step 5 of the plan). Set NEXT_PUBLIC_TEAMS_ENABLED=1 to turn them on.
export const TEAMS_ENABLED = process.env.NEXT_PUBLIC_TEAMS_ENABLED === '1'

export const TEAM_ROLES = ['admin', 'staff'] as const
export type TeamRole = typeof TEAM_ROLES[number]

export const ROLE_LABEL: Record<TeamRole | 'owner', string> = {
  owner: 'Owner',
  admin: 'Admin',
  staff: 'Staff',
}

export const ROLE_HELP: Record<TeamRole, string> = {
  admin: 'Everything except billing and the team: invoices, clients and all business settings.',
  staff: 'Invoices, clients, reminders and the dashboard. Can’t delete, cancel or change settings.',
}

export function isTeamRole(v: unknown): v is TeamRole {
  return typeof v === 'string' && (TEAM_ROLES as readonly string[]).includes(v)
}
