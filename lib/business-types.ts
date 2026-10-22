// The kinds of business StagePay asks about at sign-up and onboarding.
// Values must stay in step with VALID_BUSINESS_TYPES in /api/profile.
export const BUSINESS_TYPES = [
  { value: 'tuition_centre', label: 'Tuition Centre' },
  { value: 'contractor',     label: 'Contractor' },
  { value: 'freelancer',     label: 'Freelancer' },
  { value: 'salon',          label: 'Salon' },
  { value: 'agency',         label: 'Agency' },
  { value: 'other',          label: 'Other' },
] as const
