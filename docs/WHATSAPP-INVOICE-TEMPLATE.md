# WhatsApp template for sending invoices from StagePay's number

"Send all on WhatsApp" (a whole class in one tap) goes out from StagePay's own
WhatsApp number through the Meta Cloud API. Meta only delivers a message the
business starts with an **approved template**. The reminders already use one
(`payment_reminder`). Invoices need their own, described here.

Until the template is approved and its name is set on Vercel as
`WHATSAPP_INVOICE_TEMPLATE`, the bulk-send button answers "isn't switched on
yet" and nothing is sent. Single invoices keep going out from the person's own
phone (wa.me) as before.

## The template to submit

In Meta Business Suite → WhatsApp Manager → Message templates → Create.

| Field | Value |
|---|---|
| Name | `invoice_ready` |
| Category | **Utility** |
| Language | English (`en`) |

**Body**

```
Hello from {{1}} 👋

Invoice {{2}} for {{3}} is ready ({{4}}). It is due {{5}}.

Tap the button below to view it and see how to pay. Thank you!
```

Sample values Meta asks for when submitting:

| Variable | Sample |
|---|---|
| {{1}} | Thuto Tuition Centre |
| {{2}} | INV-202611-034 |
| {{3}} | P1,100.00 |
| {{4}} | Student: Lesedi Phiri · November fees |
| {{5}} | 13 Dec 2026 |

**Button**: Call to action → *Visit website* → **Dynamic** URL

```
https://getstagepay.co/invoice/{{1}}
```

Sample for the button variable: any real public token, e.g. `3f9c1e2b7a4d4c0f9a1b2c3d4e5f6a7b`
(open any invoice → "View" link; the token is the last part of the URL).

The code sends `[senderName, invoiceNumber, amount, about, dueDate]` as the body
variables and the invoice's `public_token` as the button variable, in
`app/api/invoices/bulk-send/route.ts`. If the wording above is changed, keep
the five body variables and the one button variable in that order.

## Or submit it through the API

With the system-user token and the WhatsApp Business Account id (WhatsApp
Manager → the account's Settings page shows "WhatsApp Business Account ID"):

```bash
curl -X POST "https://graph.facebook.com/v23.0/<WABA_ID>/message_templates" \
  -H "Authorization: Bearer $WHATSAPP_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "invoice_ready",
    "category": "UTILITY",
    "language": "en",
    "components": [
      { "type": "BODY",
        "text": "Hello from {{1}} 👋\n\nInvoice {{2}} for {{3}} is ready ({{4}}). It is due {{5}}.\n\nTap the button below to view it and see how to pay. Thank you!",
        "example": { "body_text": [["Thuto Tuition Centre", "INV-202611-034", "P1,100.00", "Student: Lesedi Phiri · November fees", "13 Dec 2026"]] } },
      { "type": "BUTTONS", "buttons": [
        { "type": "URL", "text": "View invoice", "url": "https://getstagepay.co/invoice/{{1}}", "example": ["3f9c1e2b7a4d4c0f9a1b2c3d4e5f6a7b"] } ] }
    ]
  }'
```

Utility templates are usually approved within minutes, sometimes up to 24 hours.
Then on Vercel: `WHATSAPP_INVOICE_TEMPLATE=invoice_ready` (production) and redeploy.

## Limits to know about

- **Daily new recipients.** Meta caps how many *different* numbers a business
  number may start conversations with in a rolling 24 hours. StagePay's number
  is on the starting tier: **250**. The cap rises to 1,000 / 10,000 / 100,000 as
  the number sends well and the business is verified (Meta Business
  Verification in Business Settings → Security Centre). The app enforces the
  cap from `WHATSAPP_DAILY_RECIPIENTS` (default 250) and keeps
  `WHATSAPP_RESERVED_FOR_REMINDERS` (default 25) of it for the night's
  reminders. Numbers reached in the last 24 hours do not count again. When the
  tier changes, change the env var.
- **Cost.** Each message opens a utility conversation that Meta bills StagePay
  for (cents per message; it varies by country). That is why the feature comes
  with the Business plan (`BULK_SEND_PLANS` in `lib/plans.ts`).
- **Quality rating.** Many blocks or reports lower the number's rating and can
  cut the tier. Parents should expect the message: schools should tell them
  invoices come from StagePay on WhatsApp.
- **Delivery reports** arrive later through the webhook (`/api/whatsapp/webhook`)
  and update `invoice_sends`, which the invoice's timeline shows as
  "Sent on WhatsApp · Delivered / Read" or "WhatsApp could not deliver it".
