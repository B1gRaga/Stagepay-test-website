import type { Metadata } from 'next'
import Link from 'next/link'
import { LogoFull } from '@/components/Logo'
import { activeProvider } from '@/lib/billing'

export const metadata: Metadata = {
  title: 'Privacy notice — StagePay',
  description: 'What StagePay collects, why, who else receives it, and how to have it changed or removed.',
}

const CONTACT = { whatsapp: '73998627', email: 'getstagepay@gmail.com' }
const UPDATED = '5 November 2026'

// Every outside service that receives personal data. Keep this list in step
// with the code: adding a service means adding a row here.
const SERVICES: { name: string; what: string; where: string }[] = [
  { name: 'Supabase', what: 'Our database and sign-in. Holds your account, business details, clients, invoices and the waitlist.', where: 'Ireland (EU)' },
  { name: 'Vercel', what: 'Hosts the website and app. Counts page visits and measures page speed without cookies or tracking you between sites.', where: 'Outside Botswana' },
  { name: 'Sentry', what: 'Error reports, so we can fix what breaks. For a small share of visits, and when an error happens, it records how the page changed, with all text hidden and images blocked.', where: 'Outside Botswana' },
  { name: 'Resend', what: 'Sends emails: invoices and reminders you send, sign-in and password emails, and plan notices.', where: 'Outside Botswana' },
  { name: 'Meta (WhatsApp)', what: 'Delivers the WhatsApp messages StagePay sends for you, such as automatic reminders.', where: 'Outside Botswana' },
  { name: 'Upstash', what: 'Short-lived counts of requests per internet address, to stop abuse.', where: 'Outside Botswana' },
  { name: 'Have I Been Pwned', what: 'Checks whether a new password has appeared in a data breach. Only the first 5 characters of a scrambled copy of the password are sent, never the password.', where: 'Outside Botswana' },
]

const CSS = `
.pv{--ink:#1F2A44;--amber:#F2A900;--paper:#FAF7F0;--paper-2:#F1ECE1;--white:#FFFFFF;--muted:#5B6475;--line:#E4DDCF;
  background:var(--paper);color:var(--ink);font-family:var(--font-manrope),'Segoe UI',Arial,sans-serif;font-size:17px;line-height:1.6;min-height:100vh;-webkit-font-smoothing:antialiased}
.pv *{box-sizing:border-box}
.pv a{color:inherit;font-weight:700}
.pv :focus-visible{outline:3px solid var(--amber);outline-offset:3px;border-radius:6px}
.pv-top{border-bottom:1px solid var(--line);padding:0 16px}
.pv-top div{max-width:760px;margin-inline:auto;height:64px;display:flex;align-items:center;justify-content:space-between;gap:16px}
.pv-top svg{height:28px;width:auto;display:block}
.pv-top a.back{font-size:15px;font-weight:600;text-decoration:none;color:var(--muted)}
.pv main{max-width:760px;margin-inline:auto;padding:48px 16px 80px}
.pv h1{font-size:clamp(32px,6vw,44px);font-weight:800;letter-spacing:-.02em;line-height:1.1;margin:0}
.pv .updated{color:var(--muted);font-size:15px;margin:10px 0 0}
.pv .lead{font-size:19px;margin:24px 0 0;max-width:62ch}
.pv h2{font-size:22px;font-weight:800;letter-spacing:-.01em;margin:44px 0 10px}
.pv p,.pv ul{margin:10px 0 0}
.pv ul{padding-left:22px}
.pv li{margin-top:6px}
.pv .card{background:var(--white);border:1px solid var(--line);border-radius:16px;padding:6px 18px;margin-top:14px}
.pv .svc{display:grid;grid-template-columns:150px minmax(0,1fr);gap:4px 16px;padding:14px 0;border-top:1px solid var(--line)}
.pv .svc:first-child{border-top:0}
.pv .svc b{font-size:16px}
.pv .svc span{font-size:15px}
.pv .svc small{display:block;color:var(--muted);font-size:14px;margin-top:2px}
.pv .note{background:var(--paper-2);border-radius:12px;padding:14px 16px;font-size:15px;margin-top:14px}
@media (max-width:560px){.pv .svc{grid-template-columns:1fr}}
`

export default function PrivacyPage() {
  // Whoever takes plan payments (lib/billing/provider.ts) is named here too.
  const pay = activeProvider()
  const services = [
    ...SERVICES,
    { name: pay.name, what: 'Takes your plan payment on its own secure page. It handles your card or bank details; we never see them.', where: pay.where },
  ]
  return (
    <div className="pv">
      <style>{CSS}</style>
      <header className="pv-top">
        <div>
          <Link href="/" aria-label="StagePay home"><LogoFull /></Link>
          <Link href="/" className="back">Back to StagePay</Link>
        </div>
      </header>

      <main>
        <h1>Privacy notice</h1>
        <p className="updated">Last updated {UPDATED}</p>
        <p className="lead">
          StagePay helps businesses in Botswana send invoices and get paid. This page explains what we collect,
          why, who else receives it, and how to have it changed or removed. We don&apos;t sell personal information,
          and we don&apos;t use it for advertising.
        </p>

        <h2>Who we are</h2>
        <p>
          StagePay is built and run in Botswana. For anything about your information, email{' '}
          <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> or WhatsApp{' '}
          <a href={`https://wa.me/267${CONTACT.whatsapp}`} target="_blank" rel="noopener noreferrer">{CONTACT.whatsapp}</a>.
        </p>

        <h2>What we collect</h2>
        <p><b>When you join the waitlist:</b> your name, WhatsApp number, type of business, town, how you invoice today,
          your answer about the price, and, if you give them, your email and a note. We also note which link brought
          you to us and who referred you, if anyone did.</p>
        <p><b>When you have an account:</b> your name, email and password (stored scrambled, never readable by us), and the
          business details you add: business name, phone, address, VAT number, logo, and the bank or mobile money
          details you want printed on your invoices.</p>
        <p><b>Your clients&apos; details:</b> the names, phone numbers, email addresses and invoice details you enter.
          You decide what to enter. We use it only to make, send and follow up your invoices for you.</p>
        <p><b>When a client opens an invoice link:</b> if they press &ldquo;I&apos;ve paid&rdquo;, the payment reference
          they type in. Clients don&apos;t need an account.</p>
        <p><b>Plans and payments:</b> your plan, when it ends, and {pay.name}&apos;s reference for each payment.
          You pay on {pay.name}&apos;s own page. We never see or store card numbers or mobile money PINs.</p>
        <p><b>Technical details:</b> your internet address, browser and device type, the pages you use, and error reports.</p>

        <h2>Why we use it</h2>
        <ul>
          <li>To run your account and do what you ask: make invoices, send them by WhatsApp or email, and send reminders.</li>
          <li>To tell you about your account: sign-in emails, password resets, a payment claimed by a client, and plan endings.</li>
          <li>To message people on the waitlist on WhatsApp about the launch, only if they ticked the box to allow it.</li>
          <li>To keep StagePay safe and working: stopping abuse, finding and fixing errors.</li>
          <li>To understand how the website is used, so we can improve it.</li>
        </ul>

        <h2>Who else receives it</h2>
        <p>We use these services to run StagePay. Each one receives only what it needs for its job.</p>
        <div className="card">
          {services.map(s => (
            <div className="svc" key={s.name}>
              <b>{s.name}</b>
              <span>{s.what}<small>Where: {s.where}</small></span>
            </div>
          ))}
        </div>
        <p>We may also share information if the law requires it.</p>

        <h2>Information stored outside Botswana</h2>
        <p>Some of these services store or handle information outside Botswana, as listed above. We choose services that
          protect information with encryption and access controls.</p>

        <h2>Cookies and your browser</h2>
        <ul>
          <li><b>Sign-in cookies</b> keep you signed in. StagePay can&apos;t work without them. We don&apos;t use
            advertising or tracking cookies.</li>
          <li><b>Saved in your browser:</b> your light or dark theme, and an invoice you started but haven&apos;t saved yet,
            so you don&apos;t lose it. These never leave your device.</li>
        </ul>

        <h2>How long we keep it</h2>
        <ul>
          <li>Account information, for as long as you have an account.</li>
          <li>A client you delete can be restored for 90 days, and is then removed for good. Invoices you already
            sent keep the client&apos;s name and contact details, as your record of what you billed.</li>
          <li>Waitlist details, until launch and for as long as you stay on our list. Ask and we&apos;ll remove you.</li>
          <li>Error reports and visit counts are kept for a limited time by Sentry and Vercel, then deleted.</li>
        </ul>

        <h2>Your choices</h2>
        <p>You can ask us to show you the information we hold about you, correct it, or delete it, and you can ask us to
          stop sending you messages. Email <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a> and we&apos;ll reply
          within 14 days. To close your account and delete its information, email us from the address you signed up with.</p>
        <p>If you&apos;re a client of a business that uses StagePay, that business decides what is on your invoice. Ask them
          first; we&apos;ll help them with your request.</p>

        <h2>Messages we send</h2>
        <p>Invoices, reminders, and sign-in and plan emails are part of the service, not marketing. We only send
          launch news to people who agreed to it. To stop launch news, reply &ldquo;STOP&rdquo; on WhatsApp or
          email us.</p>

        <h2>Keeping it safe</h2>
        <p>Information travels encrypted. Each account can only reach its own records, invoice links are long random
          codes that can&apos;t be guessed, and you can turn on two-step sign-in in Settings.</p>

        <h2>Changes to this notice</h2>
        <p>When we change this notice, we update the date at the top. If a change affects how we use your information,
          we&apos;ll tell account holders by email first.</p>

        <p className="note">StagePay is for businesses and is not for use by anyone under 18.</p>
      </main>
    </div>
  )
}
