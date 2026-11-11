// Records a walk through the live app as the e2e test account, one video per
// scene, on a desktop and on a phone. For ads and tutorials; also doubles as a
// launch-day dry run (every scene logs what it saw or where it failed).
//
//   node scripts/record-demo.mjs [--phase=create|view|all] [--out=<dir>] [--device=desktop|phone|all]
//
// Needs E2E_EMAIL / E2E_PASSWORD (read from .env.local). Sends go only to
// Resend's black-hole address; wa.me is blocked, so nothing reaches a person.
import { chromium, devices } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const args = Object.fromEntries(process.argv.slice(2).map(a => { const [k, v = 'true'] = a.replace(/^--/, '').split('='); return [k, v] }))
const BASE = process.env.E2E_BASE_URL || 'https://getstagepay.co'
const OUT = args.out || path.join(process.env.USERPROFILE || '', 'Downloads', 'StagePay-ads', 'screen-recordings', new Date().toISOString().slice(0, 10))
const PHASE = args.phase || 'all'
const DEVICE = args.device || 'all'

// Demo data. The client email is Resend's test sink: accepted, delivered nowhere.
const DEMO = {
  firm: 'Thuto Tuition Centre', owner: 'Naledi Kgosi',
  client: process.env.DEMO_CLIENT || 'Kabo Motswana', phone: '+267 71 234 567', email: 'delivered@resend.dev',
  billedFor: process.env.DEMO_BILLED_FOR || 'Lesego (Form 3)', project: 'November tuition fees',
  items: [['Mathematics — 8 lessons', '8', '60'], ['Physical Science — 8 lessons', '8', '60']],
}

function loadEnv() {
  try {
    for (const line of fs.readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch {}
}
loadEnv()
const EMAIL = process.env.E2E_EMAIL, PASSWORD = process.env.E2E_PASSWORD
if (!EMAIL || !PASSWORD) { console.error('E2E_EMAIL / E2E_PASSWORD not set'); process.exit(1) }

// Playwright's own recorder captures CSS pixels, so a phone would come out at
// 412 px wide. The phone is recorded with `hidpi` instead: Chromium is launched
// with a forced device scale factor and a direct screencast gives device-pixel
// frames (1080 wide), which ffmpeg stitches into the video.
const PHONE_DSF = 2.625
const DEVICES = {
  desktop: { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1, video: { width: 1920, height: 1080 } },
  phone:   { ...devices['Pixel 7'], deviceScaleFactor: PHONE_DSF, hidpi: true, video: { width: 1080, height: 2400 } },
}
const FFMPEG = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright', 'ffmpeg-1013', 'ffmpeg-win64.exe')

// Device-pixel screencast of one page, written to `${target}` when stopped.
async function startScreencast(page, target, size) {
  const cdp = await page.context().newCDPSession(page)
  const dir = target.replace(/\.webm$/, '.frames')
  fs.mkdirSync(dir, { recursive: true })
  const frames = [] // { file, t }
  cdp.on('Page.screencastFrame', ({ data, sessionId, metadata }) => {
    const file = path.join(dir, `f${String(frames.length).padStart(5, '0')}.jpg`)
    fs.writeFileSync(file, Buffer.from(data, 'base64'))
    frames.push({ file, t: metadata.timestamp })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 })
  return async function stop() {
    const ended = Date.now() / 1000
    await cdp.send('Page.stopScreencast').catch(() => {})
    await cdp.detach().catch(() => {})
    if (frames.length === 0) { fs.rmSync(dir, { recursive: true, force: true }); return }
    // Each frame lasts until the next one arrived; the last one until the scene ended.
    fs.writeFileSync(path.join(dir, 'frames.txt'), frames.map((f, i) => {
      const next = i + 1 < frames.length ? frames[i + 1].t : ended
      return `${path.basename(f.file)} ${Math.max(0.02, next - f.t).toFixed(3)}`
    }).join('\n') + '\n')
    if (await stitch(dir, target)) fs.rmSync(dir, { recursive: true, force: true })
  }
}

// Frames arrive whenever the page changes, so the video is built at a steady
// 30 fps by repeating each frame for as long as it was on screen. Playwright's
// ffmpeg is a small build (no concat demuxer), so the frames are piped in.
const FPS = 30
async function stitch(dir, target) {
  const { spawn } = await import('node:child_process')
  const lines = fs.readFileSync(path.join(dir, 'frames.txt'), 'utf8').trim().split('\n')
  const frames = []
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i].trim()
    // "f00001.jpg 0.040", or the older concat-list form: file '…'\nduration 0.040
    const m = l.match(/^file '(.+)'$/)
    if (m) {
      const d = lines[i + 1]?.match(/^duration ([\d.]+)/)
      if (d) { frames.push({ file: path.join(dir, path.basename(m[1])), d: Number(d[1]) }); i++ }
      continue
    }
    const [file, d] = l.split(' ')
    if (file && d) frames.push({ file: path.join(dir, file), d: Number(d) })
  }
  const ff = spawn(FFMPEG, [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-avioflags', 'direct', '-fpsprobesize', '0', '-probesize', '32', '-analyzeduration', '0',
    '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', 'pipe:0',
    '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-pix_fmt', 'yuv420p',
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '28', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1',
    target,
  ])
  let err = ''
  let broken = false
  ff.stderr.on('data', d => { err += d })
  ff.stdin.on('error', () => { broken = true }) // ffmpeg quit: stop feeding, report its stderr
  const done = new Promise(res => ff.on('close', res))
  const write = buf => new Promise(res => { if (broken) return res(); if (!ff.stdin.write(buf)) ff.stdin.once('drain', res); else res() })
  let carry = 0 // time not yet covered by a whole frame
  for (const f of frames) {
    if (broken) break
    const buf = fs.readFileSync(f.file)
    carry += f.d
    const n = Math.floor(carry * FPS)
    carry -= n / FPS
    for (let i = 0; i < n && !broken; i++) await write(buf)
  }
  if (!broken) ff.stdin.end()
  const code = await done
  if (code !== 0) console.error('ffmpeg failed:', err.trim())
  return code === 0
}

// --stitch: rebuild videos from frame folders a failed encode left behind.
async function stitchLeftovers() {
  for (const device of Object.keys(DEVICES)) {
    const dir = path.join(OUT, device)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.frames'))) {
      const target = path.join(dir, f.replace(/\.frames$/, '.webm'))
      const ok = await stitch(path.join(dir, f), target)
      note(device, f.replace(/\.frames$/, ''), ok ? 'stitched' : 'FAILED')
      if (ok) fs.rmSync(path.join(dir, f), { recursive: true, force: true })
    }
  }
}

const sleep = ms => new Promise(r => setTimeout(r, ms))
const notes = []
function note(device, scene, status, detail = '') {
  notes.push({ device, scene, status, detail })
  console.log(`[${device}] ${scene}: ${status}${detail ? ' — ' + detail : ''}`)
}

async function type(loc, text, delay = 55) { await loc.click(); await loc.pressSequentially(text, { delay }) }

async function scrollThrough(page, { step = 420, pause = 550, settle = 1500 } = {}) {
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  for (let y = 0; y < total; y += step) {
    await page.evaluate(y => window.scrollTo({ top: y, behavior: 'smooth' }), Math.min(y + step, total))
    await sleep(pause)
  }
  await sleep(settle)
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' }))
  await sleep(900)
}

async function signIn(page) {
  await page.goto(BASE + '/auth/login')
  // Already signed in from an earlier page in this context: the login page bounces to the dashboard.
  if (/\/(dashboard|onboarding)/.test(page.url())) return
  await page.getByLabel('Email address').waitFor()
  await sleep(800)
  await type(page.getByLabel('Email address'), EMAIL, 45)
  await type(page.getByLabel('Password', { exact: true }), PASSWORD, 30)
  await sleep(400)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 })
  await page.waitForLoadState('networkidle').catch(() => {})
}

// One recorded scene = one page = one video file.
async function scene(context, device, name, fn) {
  const page = await context.newPage()
  const started = Date.now()
  const target = path.join(OUT, device, `${name}.webm`)
  const stop = DEVICES[device].hidpi ? await startScreencast(page, target, DEVICES[device].video) : null
  try {
    await fn(page)
    note(device, name, 'ok', `${Math.round((Date.now() - started) / 1000)}s`)
  } catch (e) {
    const shot = path.join(OUT, device, `${name}-FAILED.png`)
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {})
    note(device, name, 'FAILED', String(e.message || e).split('\n')[0])
  } finally {
    if (stop) await stop()
    const video = page.video()
    await page.close()
    if (video) {
      await video.saveAs(target).catch(() => {})
      await video.delete().catch(() => {})
    }
  }
}

// Set the demo business name through Settings (not recorded).
async function setupBusiness(context) {
  const page = await context.newPage()
  try {
    await signIn(page)
    await page.goto(BASE + '/settings?panel=firm')
    const firm = page.getByLabel('Business name')
    await firm.waitFor()
    if ((await firm.inputValue()) !== DEMO.firm) {
      await firm.fill(DEMO.firm)
      await page.getByLabel('Your name').fill(DEMO.owner)
      await page.getByRole('button', { name: 'Save', exact: true }).click()
      await page.getByRole('status').filter({ hasText: 'Saved' }).waitFor({ timeout: 15_000 })
    }
    note('setup', 'business name', 'ok', DEMO.firm)
  } catch (e) {
    note('setup', 'business name', 'FAILED', String(e.message || e).split('\n')[0])
  } finally { await page.close() }
}

// Remove invoices a spoiled take left behind (--delete=INV-...,INV-...), through
// the app's own Invoices page so reminders and payments go with them.
async function deleteInvoices(context, numbers) {
  const page = await context.newPage()
  try {
    await signIn(page)
    for (const num of numbers) {
      await page.goto(BASE + '/invoices')
      const btn = page.getByRole('button', { name: `Delete ${num}` })
      if (!(await btn.count())) { note('setup', `delete ${num}`, 'skipped', 'not listed'); continue }
      await btn.click()
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete', exact: true }).click()
      await page.getByRole('button', { name: `Delete ${num}` }).waitFor({ state: 'detached', timeout: 15_000 })
      note('setup', `delete ${num}`, 'ok')
    }
  } catch (e) {
    note('setup', 'delete', 'FAILED', String(e.message || e).split('\n')[0])
  } finally { await page.close() }
}

// Sending books automatic reminders, and the demo client has a WhatsApp number,
// so switch them off for the demo invoices (--reminders-off=INV-...,INV-...).
async function switchOffReminders(context, numbers) {
  const page = await context.newPage()
  try {
    await signIn(page)
    await page.goto(BASE + '/reminders')
    await page.getByRole('heading', { level: 1 }).waitFor()
    await page.waitForLoadState('networkidle').catch(() => {})
    for (const num of numbers) {
      const sw = page.getByRole('switch', { name: `Automatic reminders for ${num}` })
      if (!(await sw.count())) { note('cleanup', `reminders ${num}`, 'skipped', 'not listed'); continue }
      if ((await sw.getAttribute('aria-checked')) === 'true') { await sw.click(); await sleep(1500) }
      note('cleanup', `reminders ${num}`, (await sw.getAttribute('aria-checked')) === 'false' ? 'off' : 'STILL ON')
    }
  } catch (e) {
    note('cleanup', 'reminders', 'FAILED', String(e.message || e).split('\n')[0])
  } finally { await page.close() }
}

async function run(deviceName) {
  const d = DEVICES[deviceName]
  const outDir = path.join(OUT, deviceName)
  fs.mkdirSync(outDir, { recursive: true })
  // Full Chromium rather than the headless shell: it has the built-in PDF viewer the invoice page embeds.
  const browser = await chromium.launch({
    headless: true, channel: 'chromium', slowMo: 90,
    args: d.hidpi ? [`--force-device-scale-factor=${d.deviceScaleFactor}`] : [],
  })
  const { video, hidpi, ...ctxOpts } = d
  const context = await browser.newContext({
    ...ctxOpts,
    locale: 'en-BW', timezoneId: 'Africa/Gaborone', colorScheme: 'light',
    ...(hidpi ? {} : { recordVideo: { dir: outDir, size: video } }),
  })
  // Nothing leaves for WhatsApp, and no popup windows.
  await context.route(/wa\.me|whatsapp\.com/, r => r.abort())
  context.on('page', p => { if (p !== context.pages()[0]) p.on('load', () => {}) })

  const isPhone = deviceName === 'phone'
  let createdInvoiceUrl = null

  if (args.delete) await deleteInvoices(context, args.delete.split(','))

  if (PHASE === 'all' || PHASE === 'create') {
    await setupBusiness(context)

    await scene(context, deviceName, '01-landing', async page => {
      await page.goto(BASE + '/')
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(2500)
      await scrollThrough(page, { step: isPhone ? 500 : 600, pause: 700 })
    })

    await scene(context, deviceName, '02-sign-in', async page => {
      await signIn(page)
      await sleep(3500)
    })

    await scene(context, deviceName, '03-new-invoice', async page => {
      await page.goto(BASE + '/new-invoice')
      await page.getByLabel('Name', { exact: true }).waitFor()
      await sleep(1200)
      await type(page.getByLabel('Name', { exact: true }), DEMO.client)
      await type(page.getByLabel('WhatsApp number'), DEMO.phone, 40)
      await type(page.getByLabel(/^Email/), DEMO.email, 35)
      const bf = page.locator('#ni-billed-for')
      if (await bf.count()) await type(bf, DEMO.billedFor)
      await type(page.getByLabel('Description'), DEMO.project)
      for (let i = 0; i < DEMO.items.length; i++) {
        if (i > 0) { await page.getByRole('button', { name: 'Add an item' }).click(); await sleep(400) }
        const [desc, qty, rate] = DEMO.items[i]
        await type(page.getByLabel(`Item ${i + 1}`, { exact: true }), desc)
        await page.getByLabel(`Quantity for item ${i + 1}`).fill(qty)
        // A known item name pre-fills last time's rate, so replace rather than type into it.
        const rateBox = page.getByLabel(`Rate for item ${i + 1}`)
        await rateBox.click(); await rateBox.fill(''); await rateBox.pressSequentially(rate, { delay: 80 })
        await sleep(500)
      }
      await page.getByRole('button', { name: '7 days' }).click()
      await sleep(1200)
      if (isPhone) {
        await page.getByRole('button', { name: 'Preview' }).click()
        await sleep(2500)
        await page.getByRole('button', { name: 'Send by email' }).click()
      } else {
        await page.getByRole('button', { name: 'Send by email' }).click()
      }
      const dialog = page.getByRole('dialog')
      await dialog.waitFor({ timeout: 20_000 })
      await sleep(1000)
      const to = dialog.getByLabel('Their email')
      if (!(await to.inputValue())) await type(to, DEMO.email, 35)
      await sleep(600)
      await dialog.getByRole('button', { name: 'Send email' }).click()
      await page.getByText('Invoice sent!').waitFor({ timeout: 30_000 })
      await page.waitForURL(/\/invoices\/[0-9a-f-]+/, { timeout: 30_000 })
      createdInvoiceUrl = page.url()
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(3000)
      await scrollThrough(page, { step: 400, pause: 600 })
    })

    await scene(context, deviceName, '04-record-payment', async page => {
      if (!createdInvoiceUrl) throw new Error('no invoice from the previous scene')
      await page.goto(createdInvoiceUrl)
      await page.getByRole('button', { name: 'Record payment' }).waitFor()
      await sleep(1500)
      await page.getByRole('button', { name: 'Record payment' }).click()
      await sleep(800)
      // The amount box opens pre-filled with what's owed; a part payment replaces it.
      const amt = page.getByLabel(/^Amount/)
      await amt.click(); await amt.fill(''); await amt.pressSequentially('480', { delay: 90 })
      await type(page.getByLabel('Note (optional)'), 'Orange Money', 50)
      await sleep(500)
      await page.getByRole('button', { name: 'Save payment' }).click()
      await page.getByText('still owed').first().waitFor({ timeout: 15_000 })
      await sleep(3500)
    })

    await scene(context, deviceName, '05-invoices-list', async page => {
      await page.goto(BASE + '/invoices')
      await page.getByRole('heading', { level: 1 }).waitFor()
      await sleep(2000)
      for (const f of ['Paid', 'All']) {
        const chip = page.getByRole('group', { name: 'Filter by status' }).getByRole('button', { name: f, exact: true })
        if (await chip.count()) { await chip.click(); await sleep(1800) }
      }
      await scrollThrough(page)
    })
  }

  if (PHASE === 'all' || PHASE === 'view') {
    await scene(context, deviceName, '06-dashboard', async page => {
      await signIn(page)
      await page.goto(BASE + '/dashboard')
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(3000)
      await scrollThrough(page)
    })

    await scene(context, deviceName, '07-reminders', async page => {
      await page.goto(BASE + '/reminders')
      await page.getByRole('heading', { level: 1 }).waitFor()
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(2500)
      await scrollThrough(page)
    })

    await scene(context, deviceName, '08-clients', async page => {
      await page.goto(BASE + '/clients')
      await page.getByRole('heading', { level: 1 }).waitFor()
      await sleep(2500)
      await scrollThrough(page)
    })

    await scene(context, deviceName, '09-settings-plan', async page => {
      await page.goto(BASE + '/settings?panel=plan')
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(2500)
      await scrollThrough(page)
    })

    await scene(context, deviceName, '10-branding', async page => {
      await page.goto(BASE + '/settings?panel=brand')
      await page.locator('.brand-pdf-box canvas').waitFor({ timeout: 25_000 })
      await sleep(2500)
      await scrollThrough(page)
    })

    const token = process.env.DEMO_INVOICE_TOKEN
    if (token) {
      await scene(context, deviceName, '11-what-the-client-sees', async page => {
        await page.goto(BASE + '/invoice/' + token)
        await page.getByRole('heading', { level: 1 }).waitFor()
        await page.waitForLoadState('networkidle').catch(() => {})
        await sleep(3000)
        await scrollThrough(page, { step: 380, pause: 650 })
      })
    } else note(deviceName, '11-what-the-client-sees', 'skipped', 'set DEMO_INVOICE_TOKEN')
  }

  if (args['reminders-off']) await switchOffReminders(context, args['reminders-off'].split(','))

  await context.close()
  await browser.close()
  // Setup and cleanup pages record too; only the named scenes are wanted.
  for (const f of fs.readdirSync(outDir)) if (f.startsWith('page@')) fs.rmSync(path.join(outDir, f))
}

fs.mkdirSync(OUT, { recursive: true })
if (args.stitch) { await stitchLeftovers(); process.exit(0) }
for (const name of DEVICE === 'all' ? ['desktop', 'phone'] : [DEVICE]) await run(name)
fs.writeFileSync(path.join(OUT, `dry-run-notes-${PHASE}.json`), JSON.stringify({ base: BASE, when: new Date().toISOString(), notes }, null, 2))
console.log('\nSaved to', OUT)
const failed = notes.filter(n => n.status === 'FAILED')
console.log(failed.length ? `${failed.length} scene(s) failed` : 'All scenes recorded')
