# What to do once StagePay is registered with CIPA

Compiled 2026-11-14. Everything here is blocked, or only makes sense, once the
company exists on paper. Items marked **(code)** are things Claude builds or
switches; the rest need the founder, a bank, Meta or a payment company.
Tick them off in order; the groups are roughly in the order they unblock each other.

## 1. The paperwork that everything else asks for (week 1)

- [ ] Collect the CIPA certificate of incorporation and the company extract (directors, registered address). Scan both in colour, uncropped; Meta and the payment provider both want the whole page.
- [ ] Open a business bank account in the company's name. Payouts from the payment provider and Meta's proof-of-address check need it.
- [ ] Register with BURS for a company TIN. Decide with an accountant whether to register for VAT now (compulsory only above the turnover threshold); it decides whether subscription prices are shown VAT-inclusive.
- [ ] Get one document with the company name and address on it that is not the CIPA certificate (bank letter, utility bill, lease). Meta asks for this separately.
- [ ] Check whether StagePay must register as a data controller with Botswana's Information and Data Protection Commission under the Data Protection Act. The app stores other businesses' client names and phone numbers, so assume yes until an advisor says otherwise.
- [ ] Set up bookkeeping for StagePay itself (it can use its own receipts).

## 2. Legal text on the product **(code, 1 day)**

- [ ] Add a /terms page (there is none yet) and name the legal entity, registration number and registered address on it, on /privacy and in the landing footer, which today only says "© 2026 StagePay".
- [ ] Put the same details on billing receipts and the subscription emails.
- [ ] If VAT-registered: show VAT on subscription receipts and decide whether listed prices include it.

## 3. Payments (the real launch blocker)

- [ ] Apply for the payment provider's merchant account with the CIPA certificate, bank account and director ID. The decision on 2026-11-05 was **RealPay** (Gaborone office, cards, Instant EFT, debit orders for auto-renewal). DPO stays as the fallback and is already wired.
- [ ] Ask RealPay for API documentation and sandbox keys. Their API is not public; nothing should be guessed.
- [ ] **(code)** Fill in `lib/billing/realpay.ts` (createCheckout and verify), add a webhook route only with signature verification, set `REALPAY_API_URL`, `REALPAY_API_KEY`, `REALPAY_MERCHANT_ID` and `BILLING_PROVIDER=realpay` on Vercel, name RealPay on /privacy, redeploy.
- [ ] Run one real P100 payment end to end: checkout, confirmation, plan flips to Pro, renewal reminder email, the daily reconcile cron sees it.
- [ ] If staying with DPO for a while: ask DPO to enable the other currencies on the merchant account and set `DPO_CURRENCIES` on Vercel; until then everyone is billed in Pula.
- [ ] Decide the Rand and other non-Pula prices (the current rows in `lib/billing/pricing.ts` were a first guess).

## 4. Meta and WhatsApp

- [ ] Business Settings → Security Centre → **Start verification**: legal name exactly as on the CIPA certificate, registered address, company phone, website getstagepay.co; upload the certificate and the proof-of-address document. Expect minutes to two weeks. This lifts the 250-new-numbers-a-day cap, removes the "unverified" label parents may see and is required before the display name "StagePay" can be reviewed.
- [ ] After verification: WhatsApp Manager → phone number → request display-name review, and later the Official Business Account (green tick) once there is some press or a listing to point at.
- [ ] Confirm `invoice_ready` was approved and `WHATSAPP_INVOICE_TEMPLATE=invoice_ready` is set on Vercel (submitted 2026-11-14; not blocked on CIPA, but check it is done).
- [ ] Read the "Messaging limit" and "Quality rating" tiles in WhatsApp Manager and update `WHATSAPP_DAILY_RECIPIENTS` on Vercel to match the new tier.
- [ ] Point `.env.local` at the production number too, or keep the test number deliberately and write that down; today the two differ.

## 5. Infrastructure that must change before paying customers arrive

- [ ] **Vercel Hobby → Pro.** The Hobby plan is for personal, non-commercial use; a paid product must be on Pro. It also gives longer function time, more cron freedom and more than one hour of log retention.
- [ ] **Supabase Free → Pro.** The free plan has no backups. Decided 2026-11-11 to take Pro at launch; turn on daily backups and, if affordable, point-in-time recovery. Turn on leaked-password protection in Auth (a paid feature).
- [ ] Check Resend's plan against expected volume (free tier is 100 emails a day) and move support mail from getstagepay@gmail.com to an address on the domain if the inbox is to be shared.
- [ ] Confirm the Upstash rate-limit database is on a plan that is not deleted after inactivity, or keep relying on the daily keep-alive ping.
- [ ] Set `WHATSAPP_RESERVED_FOR_REMINDERS` deliberately once real reminder volume is known.

## 6. Launch day switches **(code, 1 hour)**

- [ ] Vercel: `NEXT_PUBLIC_SIGNUPS_OPEN=true`; redeploy.
- [ ] Supabase Auth: turn "Allow new users to sign up" back on.
- [ ] Landing page: replace the "coming soon" waitlist copy with sign-up; keep the waitlist form for referrals if wanted.
- [ ] Email the waitlist. The first 100 sign-ups whose email matches a waitlist row get 30 days of Pro automatically (migration 045); say so in the email.
- [ ] Run the e2e dry run against production once more (scripts/record-demo.mjs with the e2e account) and the Reports export for the month.
- [ ] Turn on the Sentry alert rule for `whatsapp.delivery_failed` and billing errors if not already.

## 7. After the first customers

- [ ] Bulk send for a school: confirm the first real class batch delivered, watch the quality rating for a week.
- [ ] Revisit VAT and income reports (scoped 2026-06-19, deferred to the scaling phase).
- [ ] Revisit paid-ad conversion tracking; analytics was removed on 2026-11-05 to avoid a consent banner.
