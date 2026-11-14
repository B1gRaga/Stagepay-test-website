# StagePay security runbook

What to do if StagePay is hacked, or you think it might be. Work from the top. Don't skip to investigating before the app is contained.

Keep a copy of this page somewhere outside GitHub (printed, or saved on your phone). If your GitHub account is the thing that was broken into, you may not be able to open it here.

**Signs of a break-in:** customers report invoices or messages they didn't send; data is missing or changed; a login alert you don't recognise from GitHub, Vercel, Supabase, Meta or Gmail; a deployment or commit you didn't make; a burst of errors in Sentry.

## 1. Contain it (first 15 minutes)

Do these in order. Each one closes a different door.

1. **Turn the app off.** In Vercel: project `stagepay-test-website` → Settings → Environment Variables → add `MAINTENANCE_MODE` = `1` for Production → then Deployments → the top one → Redeploy. It takes about two minutes. After that:
   - every portal page and public invoice link shows "StagePay is down for maintenance"
   - every API call is refused
   - the daily jobs stop, so no reminders, emails or WhatsApp messages go out
   - the landing page stays up
2. **If a bad deployment is the problem,** use Vercel → Deployments → pick the last good one → Promote (roll back) instead of, or as well as, step 1.
3. **Sign everyone out and cut direct database access.** Maintenance mode only closes the app. Someone holding a stolen sign-in token or key can still talk to Supabase directly. In Supabase → Project Settings → API / JWT Keys: generate a new JWT secret. This signs out every user and makes the old `anon` and `service_role` keys useless. The app will not work again until row 1 of the table in step 2 is done, which is fine while it is in maintenance.

To turn the app back on later: delete `MAINTENANCE_MODE` (or set it to `0`) and redeploy.

## 2. Change every key (first hour)

Change each key where it is issued, then update it in Vercel → Environment Variables, then redeploy once at the end.

| # | Key in Vercel | Where to change it |
|---|---|---|
| 1 | `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API (new values appear after the JWT secret change) |
| 2 | `CRON_SECRET` | Make up a new long random value; it only lives in Vercel |
| 3 | `RESEND_API_KEY` | resend.com → API Keys: delete the old one, create a new one |
| 4 | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_APP_SECRET`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` | Meta Business → System users (new token); Meta app → Settings → Basic (reset app secret); the verify token must be changed in both Vercel and the Meta webhook settings |
| 5 | `UPSTASH_REDIS_REST_TOKEN` | Upstash console → the database → reset the token |
| 6 | `DPO_COMPANY_TOKEN` (or the RealPay keys once it is in use) | Ask the payment provider's support to issue a new one |
| 7 | `CRONITOR_KEY`, `SENTRY_AUTH_TOKEN` | Cronitor and Sentry settings |

Also update the same keys in `.env.local` on your own computer.

## 3. Lock your own accounts

Most break-ins at small companies start with a stolen admin login, not a flaw in the app.

For each of GitHub, Vercel, Supabase, Meta Business, Resend, Sentry, the payment provider, and the Gmail account they all send password resets to:

1. Change the password. Use a different one for each.
2. Turn on two-step login if it is off.
3. Open the list of signed-in devices / sessions and sign out everything you don't recognise.
4. Look for access you didn't grant: GitHub → Settings → Applications, SSH keys, Personal access tokens, and the repository's Collaborators and Deploy keys; Vercel → Team members and Tokens; Supabase → Organization members and Access tokens.

Start with Gmail. Whoever holds it can reset all the others.

## 4. Find out what happened

- **What was changed in the database.** Supabase → SQL Editor. The `audit_log` table records every insert, update and delete on the business tables for the last 180 days.

  ```sql
  -- Everything that changed in the last 3 days, newest first
  select at, table_name, action, row_id, account_id, actor_id, actor_role, old_data, new_data
    from audit_log
   where at > now() - interval '3 days'
   order by at desc;

  -- Everything one user changed
  select * from audit_log where actor_id = '<user id>' order by at desc;

  -- Changes made with the service key or from the SQL editor (not by a signed-in user)
  select * from audit_log where actor_id is null and at > now() - interval '3 days' order by at desc;

  -- Which businesses were touched, and how much
  select account_id, count(*) from audit_log where at > now() - interval '3 days' group by 1 order by 2 desc;
  ```

  The audit log does not record who *viewed* data, only what was changed.
- **Who signed in and what was requested.** Supabase → Logs (Auth and API). On the free plan these go back one day only, so look straight away and export what matters.
- **What the app did.** Vercel → the project → Logs, and Sentry → Issues.
- **Whether the code was changed.** GitHub → the repository → Commits and Actions. Vercel → Deployments: every deployment should match a commit you recognise.

Write down what you find, with times. You will need it for step 6.

## 5. Put the data back

- **A row was changed:** the audit row's `old_data` holds the values from before the change. Set them back with an `update`.
- **A row was deleted:** the audit row's `old_data` holds the whole row. For example, to restore one deleted invoice:

  ```sql
  insert into invoices
  select (jsonb_populate_record(null::invoices, old_data)).*
    from audit_log
   where table_name = 'invoices' and action = 'DELETE' and row_id = '<invoice id>'
   order by at desc limit 1;
  ```

  Restore `invoices` before `invoice_items` and `invoice_payments`.
- **A client was deleted in the app:** it can be restored from the Clients screen for 90 days.
- **Large-scale damage:** restore from a Supabase backup (Database → Backups). This is only available on a paid Supabase plan. The free plan keeps no backups.

## 6. Tell people

- **Affected customers.** Tell them plainly what happened, what information was involved, what you have done, and what they should do (for example, watch for fake invoices). Don't wait until you know everything.
- **The regulator: within 72 hours.** The Data Protection Act 2024 requires a breach of personal data to be reported to the Information and Data Protection Commission (IDPC) **within 72 hours of becoming aware of it**. The clock starts when you know, not when you've finished investigating, so report what you know and add to it later. Write down the time you found out.
  - Include: what happened and when, what kinds of information and roughly how many people are affected (businesses, and their clients or parents), what you've done to contain it, what people should do, and who to contact (getstagepay@gmail.com, WhatsApp 73998627).
  - If the breach is likely to put people at high risk (for example bank details, or enough to send convincing fake invoices), tell those people directly too, without waiting.
  - Keep a record of every breach, even ones you decide not to report: what happened, the effect, and what you did. The IDPC can ask for it.
  - Check the IDPC's current reporting form or address with a local adviser. The 72-hour deadline comes from secondary sources on the Act; confirm it against the Act itself.
- **Providers.** If a key was abused, tell that provider (Meta, Resend, the payment provider). They can block misuse on their side.

## 7. Turn it back on

1. Every key in step 2 is changed and updated in Vercel.
2. The way in has been found and closed. If you don't know how they got in, say so to customers and keep watching.
3. Remove `MAINTENANCE_MODE` and redeploy.
4. Sign in, create a test invoice, and check Sentry for new errors.
5. Check that the next morning's reminders run (Cronitor).

## Contacts

| Service | Where to get help |
|---|---|
| Vercel | vercel.com/help |
| Supabase | supabase.com/dashboard/support |
| Meta (WhatsApp) | business.facebook.com/business/help |
| Resend | resend.com/help |
| Sentry | sentry.io/support |
| GitHub | support.github.com |

StagePay support line: WhatsApp 73998627, getstagepay@gmail.com.
