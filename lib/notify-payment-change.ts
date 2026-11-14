import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { paymentDetailsChangedEmail, methodList } from '@/lib/emails/payment-details-changed'

// Emails the account owner that the payment details on their invoices
// changed. It goes to the owner's sign-in address (not the business email in
// Settings, which the same person could have just changed). Never throws:
// the change is saved either way.
export async function notifyPaymentDetailsChanged(o: {
  accountId: string
  businessName: string
  changedBy: string
  methods: unknown
}) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  try {
    const { data } = await createServiceClient().auth.admin.getUserById(o.accountId)
    const to = data?.user?.email
    if (!to) return
    const { html, text, subject } = paymentDetailsChangedEmail({
      businessName: o.businessName, changedBy: o.changedBy, methods: methodList(o.methods), when: new Date(),
    })
    const from = (process.env.RESEND_FROM_EMAIL || 'invoices@getstagepay.co').replace(/\.$/, '')
    const { error } = await new Resend(apiKey).emails.send({ from: `StagePay <${from}>`, to: [to], subject, html, text })
    if (error) console.error('[PaymentDetails] email failed:', error.message)
  } catch (err) {
    console.error('[PaymentDetails] email failed:', err instanceof Error ? err.message : err)
  }
}
