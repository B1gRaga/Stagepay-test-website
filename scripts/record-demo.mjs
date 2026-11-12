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
import { spawnSync } from 'node:child_process'

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
  // Monthly subject fees, one line each: P1,100 + 14% VAT = P1,254.00.
  items: [['Mathematics', '1', '300'], ['Sciences', '1', '500'], ['English', '1', '300']],
  partPayment: '500',
  // The tutorial's client, so it types a new name rather than picking a chip.
  tutorialClient: process.env.TUTORIAL_CLIENT || 'Lesedi Phiri', tutorialBilledFor: process.env.TUTORIAL_BILLED_FOR || 'Amo (Form 2)',
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
  // Desktop is screencast too: a 1440×810 window drawn at 4/3 fills 1920×1080
  // with every glyph rendered at full resolution, and the UI a third larger so
  // it stays readable when the video is watched on a phone.
  desktop: { viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3, hidpi: true, video: { width: 1920, height: 1080 } },
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
    // Arrival time on the same clock as the scene's marks (not the browser's
    // own timestamp), so the video and the narration marks line up exactly.
    const t = Date.now() / 1000
    if (frames.length === 0) firstFrameAt = t * 1000
    frames.push({ file, t })
    cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 97, maxWidth: size.width, maxHeight: size.height, everyNthFrame: 1 })
  return async function stop() {
    const ended = Date.now() / 1000
    await cdp.send('Page.stopScreencast').catch(() => {})
    await cdp.detach().catch(() => {})
    if (frames.length === 0) { fs.rmSync(dir, { recursive: true, force: true }); return }
    // Each frame lasts until the next one arrived; the last one until the scene ended.
    fs.writeFileSync(path.join(dir, 'frames.txt'), frames.map((f, i) => {
      const next = i + 1 < frames.length ? frames[i + 1].t : ended
      // Exact on-screen time, even when tiny: frames arrive in bursts while
      // typing, and rounding them up made those parts play slower than real
      // time (the stitcher carries fractions forward, so nothing is lost).
      return `${path.basename(f.file)} ${Math.max(0, next - f.t).toFixed(4)}`
    }).join('\n') + '\n')
    if (await stitch(dir, target)) {
      // The video must last as long as the scene really did, or narration
      // timed to the marks drifts. Keep the frames if it doesn't.
      const real = ended - frames[0].t
      const got = videoSeconds(target)
      if (Math.abs(got - real) > Math.max(0.5, real * 0.01)) {
        console.error(`timing check failed for ${path.basename(target)}: video ${got.toFixed(1)}s vs real ${real.toFixed(1)}s (frames kept)`)
      } else fs.rmSync(dir, { recursive: true, force: true })
    }
  }
}

// Frames arrive whenever the page changes, so the video is built at a steady
// 30 fps by repeating each frame for as long as it was on screen. Playwright's
// ffmpeg is a small build (no concat demuxer), so the frames are piped in.
const FPS = 30
function videoSeconds(file) {
  const r = spawnSync(FFMPEG, ['-i', file], { encoding: 'utf8' })
  const m = (r.stderr || '').match(/Duration: (\d+):(\d+):([\d.]+)/)
  return m ? Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]) : 0
}
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
    // A near-lossless master: the shareable MP4 is made from this, so any
    // softness here would carry into every final video.
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '15', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1',
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

// The send step: WhatsApp is the selling point; SEND_VIA=email for the other take.
const SEND_VIA = process.env.SEND_VIA === 'email' ? 'email' : 'whatsapp'

// A visible pointer, so viewers see what was pressed: a soft cursor that moves
// to each control (desktop) and a ripple where it was pressed (both). Added to
// the page after it has loaded, so it never gets in the way of hydration.
// (Chromium reports touch points on the desktop profile too, so the device is passed in.)
const POINTER_SCRIPT = touch => `(() => {
  const touch = ${touch ? 'true' : 'false'}
  if (window !== window.top) return // not inside the embedded PDF viewer
  if (touch) {
    // A recording can't show the phone's share sheet, so take the "Open in
    // WhatsApp" route (message + invoice link) instead of "Share PDF".
    try { Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }) } catch {}
    try { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }) } catch {}
  }
  function mount() {
    if (document.getElementById('__rec-cursor') || !document.body) return
    const style = document.createElement('style')
    style.textContent = \`
      #__rec-cursor{position:fixed;left:0;top:0;width:28px;height:28px;margin:-14px 0 0 -14px;border-radius:50%;
        background:rgba(31,42,68,.55);border:3px solid #fff;box-shadow:0 0 0 1.5px rgba(31,42,68,.6),0 2px 8px rgba(0,0,0,.35);
        pointer-events:none;z-index:2147483647;transition:transform .09s ease, background .09s;opacity:\${touch ? 0 : 1};will-change:left,top}
      #__rec-cursor.down{transform:scale(.7);background:rgba(31,42,68,.95)}
      .__rec-ripple{position:fixed;width:\${touch ? 84 : 60}px;height:\${touch ? 84 : 60}px;margin:-\${touch ? 42 : 30}px 0 0 -\${touch ? 42 : 30}px;border-radius:50%;
        border:4px solid #fff;box-shadow:0 0 0 3px rgba(31,42,68,.9),inset 0 0 0 2px rgba(31,42,68,.9);background:rgba(31,42,68,.18);
        pointer-events:none;z-index:2147483646;animation:__rec-rip .6s ease-out forwards}
      @keyframes __rec-rip{from{transform:scale(.4);opacity:1}to{transform:scale(1.5);opacity:0}}\`
    const cur = document.createElement('div'); cur.id = '__rec-cursor'
    cur.style.opacity = '0' // hidden until the pointer first moves
    document.body.appendChild(style); document.body.appendChild(cur)
    const place = (x, y) => { cur.style.left = x + 'px'; cur.style.top = y + 'px'; if (!touch) cur.style.opacity = '1' }
    document.addEventListener('mousemove', e => place(e.clientX, e.clientY), true)
    document.addEventListener('mousedown', e => {
      place(e.clientX, e.clientY); cur.classList.add('down')
      const r = document.createElement('div'); r.className = '__rec-ripple'
      r.style.left = e.clientX + 'px'; r.style.top = e.clientY + 'px'
      document.body.appendChild(r); setTimeout(() => r.remove(), 600)
    }, true)
    document.addEventListener('mouseup', () => cur.classList.remove('down'), true)
  }
  if (document.readyState === 'complete') setTimeout(mount, 400)
  else window.addEventListener('load', () => setTimeout(mount, 400))
})()`

// Move to a control first, pause as a person would, then press it.
async function press(page, locator) {
  const el = locator.first()
  await el.scrollIntoViewIfNeeded().catch(() => {})
  const box = await el.boundingBox().catch(() => null)
  if (box) {
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 22 })
    await sleep(380)
  }
  await el.click()
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
  await press(page, page.getByRole('button', { name: 'Sign in' }))
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 30_000 })
  await page.waitForLoadState('networkidle').catch(() => {})
}

// Invoice numbers this run created, so their reminders are switched off at the end.
const created = []

// On /new-invoice: a new client, three monthly subject lines, 7-day terms, sent
// by email. Resolves with the invoice page URL once the app has moved there.
async function fillAndSendInvoice(page, isPhone, client, billedFor) {
  await page.getByLabel('Name', { exact: true }).waitFor()
  mark('form')
  await sleep(1200)
  // One mark per field, so a narration can say each one as it's typed, and a
  // short pause after each, the way a person moves between boxes.
  const BETWEEN = 700
  mark('client'); mark('name')
  await type(page.getByLabel('Name', { exact: true }), client)
  await sleep(BETWEEN); mark('phone')
  await type(page.getByLabel('WhatsApp number'), DEMO.phone, 40)
  await sleep(BETWEEN); mark('email')
  await type(page.getByLabel(/^Email/), DEMO.email, 35)
  const bf = page.locator('#ni-billed-for')
  if (await bf.count()) { await sleep(BETWEEN); mark('student'); await type(bf, billedFor) }
  await sleep(BETWEEN)
  mark('items'); mark('description')
  await type(page.getByLabel('Description'), DEMO.project)
  await sleep(BETWEEN)
  for (let i = 0; i < DEMO.items.length; i++) {
    if (i > 0) { await press(page, page.getByRole('button', { name: 'Add an item' })); await sleep(400) }
    const [desc, qty, rate] = DEMO.items[i]
    mark(`item-${i + 1}`)
    await type(page.getByLabel(`Item ${i + 1}`, { exact: true }), desc)
    const qtyBox = page.getByLabel(`Quantity for item ${i + 1}`)
    if ((await qtyBox.inputValue()) !== qty) await qtyBox.fill(qty)
    // A known item name pre-fills last time's rate, so replace rather than type into it.
    const rateBox = page.getByLabel(`Rate for item ${i + 1}`)
    await rateBox.click(); await rateBox.fill(''); await rateBox.pressSequentially(rate, { delay: 80 })
    await sleep(600)
  }
  await sleep(800)
  mark('terms')
  await press(page, page.getByRole('button', { name: '7 days' }))
  await sleep(1500)
  if (isPhone) {
    mark('preview')
    await press(page, page.getByRole('button', { name: 'Preview' }))
    await sleep(3000)
  }
  mark('send')
  // The phone preview sheet and the desktop side panel both carry the send buttons.
  const sendScope = isPhone ? page.getByRole('dialog') : page.getByRole('complementary', { name: 'Preview and send' })
  if (SEND_VIA === 'email') {
    await press(page, sendScope.getByRole('button', { name: 'Send by email' }))
    const dialog = page.getByRole('dialog').filter({ hasText: /^Send/ }).last()
    await dialog.waitFor({ timeout: 20_000 })
    await sleep(1200)
    const to = dialog.getByLabel('Their email')
    if (!(await to.inputValue())) await type(to, DEMO.email, 35)
    await sleep(800)
    await press(page, dialog.getByRole('button', { name: 'Send email' }))
    await page.getByText('Invoice sent!').waitFor({ timeout: 30_000 })
  } else {
    await press(page, sendScope.getByRole('button', { name: /Send on WhatsApp/ }))
    const dialog = page.getByRole('dialog').filter({ hasText: /^Send/ }).last()
    await dialog.waitFor({ timeout: 20_000 })
    await sleep(1200)
    const to = dialog.getByLabel('Their WhatsApp number')
    if (await to.count() && !(await to.inputValue())) await type(to, DEMO.phone, 40)
    await sleep(800)
    // wa.me is blocked for the recording, so the app's "WhatsApp opened" step shows and nothing is sent.
    await press(page, dialog.getByRole('button', { name: /Open in WhatsApp|Share PDF/ }))
    await page.getByText(/WhatsApp opened/).waitFor({ timeout: 30_000 })
    mark('whatsapp-opened')
  }
  await page.waitForURL(/\/invoices\/[0-9a-f-]+/, { timeout: 30_000 })
  await page.waitForLoadState('networkidle').catch(() => {})
  mark('invoice-page')
  const num = (await page.locator('.top-num').first().textContent().catch(() => ''))?.trim()
  if (num) created.push(num)
  // The public link's token, for the "what the client sees" scene.
  const id = page.url().match(/\/invoices\/([0-9a-f-]+)/)?.[1]
  if (id) {
    const res = await page.request.get(`${BASE}/api/invoices/${id}`).catch(() => null)
    const token = res?.ok() ? (await res.json())?.invoice?.public_token : null
    if (token) createdToken = token
  }
  return page.url()
}
let createdToken = null

// Timestamps of what happens in a scene (seconds from its start), saved next to
// the video as <scene>.marks.json so a voice-over can be timed to it.
let marks = {}
let sceneStart = 0
let firstFrameAt = 0 // wall-clock ms of the current scene's first screencast frame
const mark = name => { marks[name] = Math.round((Date.now() - sceneStart) / 100) / 10 }

// One recorded scene = one page = one video file.
async function scene(context, device, name, fn) {
  const page = await context.newPage()
  const started = Date.now()
  sceneStart = started; marks = {}; firstFrameAt = 0
  const target = path.join(OUT, device, `${name}.webm`)
  const stop = DEVICES[device].hidpi ? await startScreencast(page, target, DEVICES[device].video) : null
  try {
    await fn(page)
    mark('end')
    // The video starts at its first frame, which arrives only once the page has
    // painted, so shift the marks to count from that moment.
    if (Object.keys(marks).length > 1) {
      const shift = firstFrameAt ? (firstFrameAt - sceneStart) / 1000 : 0
      const onVideo = Object.fromEntries(Object.entries(marks).map(([k, v]) => [k, Math.max(0, Math.round((v - shift) * 10) / 10)]))
      fs.writeFileSync(target.replace(/\.webm$/, '.marks.json'), JSON.stringify(onVideo, null, 2))
    }
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

// Remove demo clients from an earlier take (--delete-clients=Name,Name), through the Clients page.
async function deleteClients(context, names) {
  const page = await context.newPage()
  try {
    await signIn(page)
    for (const name of names) {
      await page.goto(BASE + '/clients')
      await page.getByRole('heading', { level: 1 }).waitFor()
      const btn = page.getByRole('button', { name: `Delete ${name}` })
      if (!(await btn.count())) { note('setup', `delete client ${name}`, 'skipped', 'not listed'); continue }
      await btn.first().click()
      await page.getByRole('button', { name: 'Delete client' }).click()
      await sleep(1500)
      note('setup', `delete client ${name}`, 'ok')
    }
  } catch (e) {
    note('setup', 'delete clients', 'FAILED', String(e.message || e).split('\n')[0])
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
  await context.addInitScript(POINTER_SCRIPT(!!ctxOpts.isMobile))
  context.on('page', p => { if (p !== context.pages()[0]) p.on('load', () => {}) })

  const isPhone = deviceName === 'phone'
  let createdInvoiceUrl = null

  if (args.delete) await deleteInvoices(context, args.delete.split(','))
  if (args['delete-clients']) await deleteClients(context, args['delete-clients'].split(','))

  // One continuous take: sign in, look at the dashboard, make and send an
  // invoice, then switch its automatic reminders off and on again.
  // Each device gets its own client names, so no client is typed in twice.
  const names = deviceName === 'phone'
    ? { client: 'Boitumelo Sebina', billedFor: 'Tumi (Form 1)', tutorialClient: 'Tshepo Dube', tutorialBilledFor: 'Naledi (Form 4)' }
    : { client: DEMO.client, billedFor: DEMO.billedFor, tutorialClient: DEMO.tutorialClient, tutorialBilledFor: DEMO.tutorialBilledFor }

  if (PHASE === 'all' || PHASE === 'tutorial') {
    await setupBusiness(context)
    await context.clearCookies() // the tutorial starts at the sign-in screen
    await scene(context, deviceName, '00-tutorial-first-invoice', async page => {
      mark('sign-in')
      await signIn(page)
      mark('dashboard')
      await sleep(4000)
      await scrollThrough(page, { step: 400, pause: 700, settle: 1200 })
      await sleep(800)
      mark('new-invoice')
      await press(page, page.getByRole('link', { name: 'New invoice' }))
      await page.waitForURL(/\/new-invoice/)
      await fillAndSendInvoice(page, isPhone, names.tutorialClient, names.tutorialBilledFor)
      await sleep(4000)
      await scrollThrough(page, { step: 400, pause: 700, settle: 1500 })
      const num = created[created.length - 1]
      mark('reminders')
      await press(page, page.getByRole('link', { name: 'Reminders' }))
      await page.waitForURL(/\/reminders/)
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(3000)
      const sw = page.getByRole('switch', { name: `Automatic reminders for ${num}` })
      await sw.scrollIntoViewIfNeeded()
      await sleep(1500)
      // Sending books reminders automatically, so show the switch going off and back on.
      mark('toggle-off')
      await press(page, sw); await sleep(3000)
      mark('toggle-on')
      await press(page, sw); await sleep(3500)
      await scrollThrough(page, { step: 380, pause: 650 })
      await sleep(1500)
    })
  }

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
      createdInvoiceUrl = await fillAndSendInvoice(page, isPhone, names.client, names.billedFor)
      await sleep(3000)
      await scrollThrough(page, { step: 400, pause: 600 })
    })

    await scene(context, deviceName, '04-record-payment', async page => {
      if (!createdInvoiceUrl) throw new Error('no invoice from the previous scene')
      await page.goto(createdInvoiceUrl)
      await page.getByRole('button', { name: 'Record payment' }).waitFor()
      await sleep(1500)
      await press(page, page.getByRole('button', { name: 'Record payment' }))
      await sleep(800)
      // The amount box opens pre-filled with what's owed; a part payment replaces it.
      const amt = page.getByLabel(/^Amount/)
      await amt.click(); await amt.fill(''); await amt.pressSequentially(DEMO.partPayment, { delay: 90 })
      await type(page.getByLabel('Note (optional)'), 'Orange Money', 50)
      await sleep(500)
      await press(page, page.getByRole('button', { name: 'Save payment' }))
      await page.getByText('still owed').first().waitFor({ timeout: 15_000 })
      await sleep(3500)
    })

    await scene(context, deviceName, '05-invoices-list', async page => {
      await page.goto(BASE + '/invoices')
      await page.getByRole('heading', { level: 1 }).waitFor()
      await sleep(2000)
      for (const f of ['Paid', 'All']) {
        const chip = page.getByRole('group', { name: 'Filter by status' }).getByRole('button', { name: f, exact: true })
        if (await chip.count()) { await press(page, chip); await sleep(1800) }
      }
      await scrollThrough(page)
    })
  }

  if (PHASE === 'all' || PHASE === 'view' || PHASE === 'client') {
    if (PHASE !== 'client') await scene(context, deviceName, '06-dashboard', async page => {
      await signIn(page)
      await page.goto(BASE + '/dashboard')
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(3000)
      await scrollThrough(page)
    })

    if (PHASE !== 'client') await scene(context, deviceName, '07-reminders', async page => {
      await page.goto(BASE + '/reminders')
      await page.getByRole('heading', { level: 1 }).waitFor()
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(2500)
      await scrollThrough(page)
    })

    if (PHASE !== 'client') await scene(context, deviceName, '08-clients', async page => {
      await page.goto(BASE + '/clients')
      await page.getByRole('heading', { level: 1 }).waitFor()
      await sleep(2500)
      await scrollThrough(page)
    })

    if (PHASE !== 'client') await scene(context, deviceName, '09-settings-plan', async page => {
      await page.goto(BASE + '/settings?panel=plan')
      await page.waitForLoadState('networkidle').catch(() => {})
      await sleep(2500)
      await scrollThrough(page)
    })

    if (PHASE !== 'client') await scene(context, deviceName, '10-branding', async page => {
      await page.goto(BASE + '/settings?panel=brand')
      await page.locator('.brand-pdf-box canvas').waitFor({ timeout: 25_000 })
      await sleep(2500)
      await scrollThrough(page)
    })

    const token = process.env.DEMO_INVOICE_TOKEN || createdToken
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

  const off = [...new Set([...(args['reminders-off'] ? args['reminders-off'].split(',') : []), ...created])]
  if (off.length) await switchOffReminders(context, off)

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
