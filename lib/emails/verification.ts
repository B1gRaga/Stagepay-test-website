import { Resend } from 'resend'
import { esc, emailShell, paragraphs, plain } from './shell'
import { createServiceClient } from '@/lib/supabase/server'

// Verification emails: to StagePay when a business submits, and to the
// business's owner when it is approved or declined. Never throw: the
// submission or decision is saved either way.

const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, '')
const SUPPORT = 'getstagepay@gmail.com'

async function send(to: string, subject: string, html: string, text: string) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return
  const from = (process.env.RESEND_FROM_EMAIL || 'invoices@getstagepay.co').replace(/\.$/, '')
  try {
    const { error } = await new Resend(apiKey).emails.send({ from: `StagePay <${from}>`, to: [to], subject, html, text })
    if (error) console.error('[Verification] email failed:', error.message)
  } catch (err) {
    console.error('[Verification] email failed:', err instanceof Error ? err.message : err)
  }
}

export async function emailNewSubmission(o: { businessName: string; registeredName: string; registrationNumber: string; submitter: string }) {
  const to = process.env.VERIFICATION_NOTIFY_EMAIL || SUPPORT
  const link = appUrl() ? `${appUrl()}/admin/verifications` : ''
  const lead = `${o.businessName} asked to be verified.`
  const facts = `Registered name: ${o.registeredName}\nCIPA number: ${o.registrationNumber}\nSent by: ${o.submitter}`
  const html = emailShell({
    title: 'Business to verify',
    preheader: `${o.registeredName} · ${o.registrationNumber}`,
    senderName: 'StagePay',
    bodyHtml: paragraphs([esc(lead), esc(facts)]),
    button: link ? { href: link, label: 'Review it' } : null,
  })
  await send(to, `Verify: ${o.registeredName}`, html, plain([lead, '', facts, '', link ? `Review: ${link}` : '']))
}

export async function emailDecision(o: { accountId: string; businessName: string; approved: boolean; note?: string | null }) {
  const { data } = await createServiceClient().auth.admin.getUserById(o.accountId)
  const to = data?.user?.email
  if (!to) return
  const link = appUrl() ? `${appUrl()}/settings?panel=verify` : ''
  const paras = o.approved
    ? [`${o.businessName} is verified.`, 'You can now send invoices from StagePay’s WhatsApp number, one at a time or to a whole class at once.']
    : [`We couldn’t verify ${o.businessName} yet.`, o.note ? `Reason: ${o.note}` : 'The details didn’t match CIPA’s register.', `Fix the details and send them again in Settings, or reply to ${SUPPORT}. You can still send invoices from your own WhatsApp.`]
  const html = emailShell({
    title: o.approved ? 'Your business is verified' : 'Verification needs another look',
    preheader: paras[1],
    senderName: 'StagePay',
    bodyHtml: paragraphs(paras.map(p => esc(p))),
    button: link ? { href: link, label: o.approved ? 'Open StagePay' : 'Check the details' } : null,
  })
  await send(to, o.approved ? 'Your business is verified on StagePay' : 'Your StagePay verification needs another look', html, plain([...paras, '', link]))
}
