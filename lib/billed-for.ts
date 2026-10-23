// The optional "billed for" line on an invoice: the student for a tuition
// centre, the project for a contractor. One column, named by business type.

export const BILLED_FOR_MAX = 100

export function billedForLabel(businessType?: string | null): string {
  switch (businessType) {
    case 'tuition_centre': return 'Student'
    case 'contractor':
    case 'freelancer':
    case 'agency':         return 'Project'
    default:               return 'For'
  }
}

export function billedForPlaceholder(businessType?: string | null): string {
  switch (billedForLabel(businessType)) {
    case 'Student': return 'e.g. Thato Mosweu'
    case 'Project': return 'e.g. Block 8 kitchen renovation'
    default:        return 'e.g. Wedding on 12 December'
  }
}

// "Student: *Thato Mosweu*" for WhatsApp, or '' when there is none.
export function billedForWaLine(businessType: string | null | undefined, billedFor: string | null | undefined): string {
  const v = billedFor?.trim()
  return v ? `${billedForLabel(businessType)}: *${v}*` : ''
}
