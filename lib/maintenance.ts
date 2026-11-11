// Emergency off switch, for a suspected break-in or a bad data problem.
// Set MAINTENANCE_MODE=1 on Vercel and redeploy: the portal, public invoice
// links and every API route answer "down for maintenance", and the crons stop
// sending. The landing page stays up. Steps are in docs/SECURITY-RUNBOOK.md.
export function maintenanceOn(): boolean {
  return process.env.MAINTENANCE_MODE === '1'
}

export const MAINTENANCE_MESSAGE = 'StagePay is down for maintenance. Please try again later.'

// A self-contained page: it must not depend on the app, the database or any script.
export const MAINTENANCE_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Back soon — StagePay</title>
</head>
<body style="margin:0;min-height:100dvh;display:grid;place-items:center;background:#FAF7F0;color:#1F2A44;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:24px">
<main style="max-width:420px">
<h1 style="font-size:28px;font-weight:800;letter-spacing:-0.02em;margin:0">StagePay is down for maintenance</h1>
<p style="font-size:16px;line-height:1.55;color:#3D4659;margin:12px 0 0">We’re working on StagePay and will be back soon. Your invoices and clients are safe. Please try again later.</p>
<p style="font-size:16px;line-height:1.55;color:#3D4659;margin:12px 0 0">Need help now? WhatsApp 73998627 or email getstagepay@gmail.com.</p>
</main>
</body>
</html>`
