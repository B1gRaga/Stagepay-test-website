'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { animate, stagger, utils } from 'animejs'
import { LogoFull } from '@/components/Logo'
import { FORM_CSS } from './AuthCard'

// Sign in and sign up share this shell (app/auth/(stairs)/layout.tsx), so the
// stairs stay put while the form changes. The logo's three rising bars, at the
// size of the room: an invoice climbs them from sent, to reminded, to paid.
// Click a step to move it there.
const CSS = `
  .st-page{position:relative;min-height:100dvh;background:#FAF7F0;color:#1F2A44;font-family:var(--font-manrope),sans-serif;overflow:hidden;}
  .st-top{position:relative;z-index:3;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:28px clamp(16px,6vw,96px) 0;}
  .st-top .st-logo{color:#1F2A44;display:block;}
  .st-top .st-logo svg{height:30px;width:auto;display:block;}
  .st-switch{font-size:15px;color:#5B6475;}
  .st-switch a{color:#1F2A44;font-weight:700;text-decoration:underline;text-decoration-color:rgba(31,42,68,.3);text-underline-offset:4px;}
  .st-switch a:hover{text-decoration-color:#1F2A44;}

  .st-main{position:relative;z-index:2;padding:clamp(16px,6vh,88px) clamp(16px,6vw,96px) 16px;max-width:calc(42vw + clamp(16px,6vw,96px));}
  .st-h1{font-size:clamp(34px,min(4.4vw,7vh),68px);font-weight:800;letter-spacing:-.035em;line-height:1;}
  .st-lede{font-size:18px;line-height:1.55;color:#3D4659;max-width:40ch;margin-top:clamp(10px,2vh,20px);}
  .st-form-wrap{max-width:400px;margin-top:clamp(16px,3.6vh,36px);}
  .st-form-wrap .ac-input{background:#FFFFFF;border-color:#DDD5C5;}
  .st-form-wrap .ac-btn{transition:background-color .15s,transform .12s;}
  .st-form-wrap .ac-btn:active:not(:disabled){transform:scale(.98);}
  .st-form-wrap .ac-foot{text-align:left;margin-top:18px;}

  /* Sign-up: business type and the confirmation. */
  .as-choices{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .as-choice{height:46px;padding:0 12px;border-radius:8px;border:1px solid #DDD5C5;background:#FFFFFF;color:#1F2A44;font:600 15px var(--font-manrope),sans-serif;text-align:left;cursor:pointer;transition:border-color .15s,background-color .15s,transform .12s;}
  .as-choice:hover{border-color:#1F2A44;}
  .as-choice:active{transform:scale(.98);}
  .as-choice[aria-pressed="true"]{border-color:#F2A900;background:#FCEFC7;box-shadow:inset 0 0 0 1px #F2A900;}
  .as-choice:focus-visible,.as-back:focus-visible{outline:2px solid #1F2A44;outline-offset:2px;}
  .as-step{display:flex;align-items:center;justify-content:space-between;font-size:14px;color:#5B6475;}
  .as-back{background:transparent;border:0;padding:4px 0;cursor:pointer;display:flex;align-items:center;gap:6px;font:700 14px var(--font-manrope),sans-serif;color:#1F2A44;}
  .as-done{display:flex;flex-direction:column;align-items:flex-start;gap:16px;}
  .as-done .ac-sub{margin:0;font-size:16px;}
  .as-done-ic{display:none;}

  /* The stairs: three flat bars, bleeding off the right and bottom edges. */
  .st-stage{position:absolute;z-index:1;right:0;bottom:0;width:58vw;height:min(78vh,720px);display:flex;align-items:flex-end;}
  .st-bar{position:relative;flex:1;border:0;padding:22px 22px 0;text-align:left;cursor:pointer;font-family:inherit;color:#FAF7F0;display:flex;flex-direction:column;justify-content:flex-start;transform-origin:bottom;transition:background-color .2s ease;}
  .st-b1{height:30%;background:#2B3756;}
  .st-b2{height:62%;background:#1F2A44;}
  .st-b3{height:86%;background:#F2A900;color:#1F2A44;}
  .st-b1:hover{background:#33405F;}.st-b2:hover{background:#26324F;}.st-b3:hover{background:#FFB81C;}
  .st-bar:focus-visible{outline:3px solid #F2A900;outline-offset:-6px;}
  .st-b3:focus-visible{outline-color:#1F2A44;}
  .st-bar b{font-size:16px;font-weight:800;line-height:1.3;}
  .st-bar small{font-size:14px;font-weight:500;opacity:.78;margin-top:2px;}

  /* The invoice that climbs. A real piece of the product, at true size. */
  .st-inv{position:absolute;left:0;top:0;z-index:2;width:min(240px,calc(58vw / 3 - 28px));background:#FFFFFF;color:#1F2A44;border-radius:12px;padding:14px 16px 14px;box-shadow:0 18px 40px rgba(31,42,68,.22);pointer-events:none;will-change:transform;}
  .st-inv-short{display:none;}
  .st-inv-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
  .st-inv-biz{font-size:14px;font-weight:800;line-height:1.25;}
  .st-inv-sub{font-size:13px;color:#5B6475;margin-top:1px;}
  .st-steps{display:flex;align-items:flex-end;gap:3px;height:18px;flex:none;}
  .st-steps i{width:6px;background:#E4DDCF;transition:background-color .3s ease;}
  .st-steps i:nth-child(1){height:6px}.st-steps i:nth-child(2){height:12px}.st-steps i:nth-child(3){height:18px}
  .st-steps i.on{background:#1F2A44;}.st-steps i.on.last{background:#F2A900;}
  .st-inv-amt{display:flex;justify-content:space-between;align-items:baseline;margin-top:14px;}
  .st-inv-amt b{font-size:24px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums;}
  .st-chip{font-size:13px;font-weight:700;padding:3px 9px;border-radius:999px;background:#F1ECE1;color:#1F2A44;white-space:nowrap;}
  .st-stamp{position:absolute;right:14px;bottom:12px;transform:rotate(-12deg);font-size:18px;font-weight:800;letter-spacing:.12em;color:#1F2A44;border:3px solid #F2A900;background:rgba(242,169,0,.16);padding:1px 9px;border-radius:6px;opacity:0;}

  .st-help{position:absolute;z-index:2;left:clamp(16px,6vw,96px);bottom:32px;font-size:14px;color:#5B6475;max-width:34ch;line-height:1.5;}
  .st-help a{color:#1F2A44;font-weight:700;text-decoration:none;}
  .st-help a:hover{text-decoration:underline;}
  @media(max-height:760px){.st-help{display:none;}}

  @media(max-width:1100px){
    .st-main{max-width:calc(48vw + clamp(16px,6vw,96px));}
    .st-stage{width:50vw;}
    .st-inv{width:min(220px,calc(50vw / 3 - 16px));padding:12px;}
    .st-inv-sub,.st-inv-biz{display:none;}
    .st-inv-short{display:block;font-size:13px;font-weight:800;}
    .st-inv-amt{flex-direction:column;align-items:flex-start;gap:6px;margin-top:10px;}
    .st-inv-amt b{font-size:20px;}
    .st-bar{padding:18px 14px 0;}
    .st-bar b{font-size:14px;}.st-bar small{font-size:13px;}
  }
  /* Short laptop screens: tighten the words so the form still fits. */
  @media(max-height:700px) and (min-width:901px){
    .st-lede{font-size:16px;}
    .st-form-wrap .ac-form{gap:12px;}
    .st-form-wrap .ac-input,.st-form-wrap .ac-btn,.as-choice{height:42px;}
  }
  /* Phones and narrow tablets: one screen, no scrolling. The stairs take
     whatever height is left under the form, and the step the invoice has
     reached lights up instead of the card climbing. */
  @media(max-width:900px){
    .st-page{height:100dvh;display:flex;flex-direction:column;}
    .st-top{padding-top:20px;}
    .st-main{max-width:none;padding-top:clamp(20px,4vh,40px);padding-bottom:20px;flex:none;}
    .st-h1{font-size:clamp(34px,9vw,56px);}
    .st-lede{font-size:16px;margin-top:12px;}
    .st-form-wrap{max-width:none;margin-top:clamp(18px,3vh,32px);}
    .st-stage{position:relative;width:100%;height:auto;flex:1 1 0;min-height:0;}
    .st-help,.st-inv{display:none;}
    .st-bar{padding:14px 16px 0;}
    .st-bar small{display:none;}
    .st-bar[aria-pressed="true"]::before{content:"";width:10px;height:10px;border-radius:50%;background:#F2A900;margin-bottom:8px;flex:none;}
    .st-b3[aria-pressed="true"]::before{background:#1F2A44;}
  }
  @media(max-width:600px){.st-switch span{display:none;}.st-inv-biz{display:none;}.st-inv-short{display:block;font-size:13px;font-weight:800;}.st-bar b{font-size:13px;}}
`

const STAGES = ['Sent on WhatsApp', 'Reminder sent', 'Paid'] as const
const HOLD = [1800, 1800, 3400]

const dayMonth = (d: Date) => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

// The words and form fields that move when the page changes.
const PARTS = '.st-h1, .st-lede, .st-form-wrap .ac-form > *, .st-form-wrap > :not(form)'

export function AuthHead({ title, lede, children }: {
  title: React.ReactNode
  lede: string
  children: React.ReactNode
}) {
  return (
    <>
      <h1 className="st-h1">{title}</h1>
      <p className="st-lede">{lede}</p>
      <div className="st-form-wrap">{children}</div>
    </>
  )
}

export function AuthStairs({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const onSignup = pathname.startsWith('/auth/signup')
  const pageRef = useRef<HTMLDivElement>(null)
  const mainRef = useRef<HTMLElement>(null)
  const leaving = useRef(false)
  const stageRef = useRef<HTMLDivElement>(null)
  const invRef = useRef<HTMLDivElement>(null)
  const [at, setAt] = useState(0)
  const [auto, setAuto] = useState(true)
  // Dates follow today, so the invoice is always this month's.
  const [dates, setDates] = useState<string[] | null>(null)

  useEffect(() => {
    const today = new Date()
    const due = new Date(today); due.setDate(due.getDate() + 14)
    const remind = new Date(due); remind.setDate(remind.getDate() - 1)
    setDates([dayMonth(today), dayMonth(remind), `Orange Money · ${dayMonth(remind)}`])
  }, [])

  // Where the invoice rests on step i: on the bar's top edge, inset from its left.
  function spot(i: number) {
    const stage = stageRef.current!, inv = invRef.current!
    const bar = stage.querySelectorAll<HTMLElement>('.st-bar')[i]
    const inset = Math.max(6, Math.min(22, (bar.offsetWidth - inv.offsetWidth) / 2))
    return { x: bar.offsetLeft + inset, y: bar.offsetTop - inv.offsetHeight - 10 }
  }

  // First paint: the bars rise from the floor, the words and form come in.
  useEffect(() => {
    const page = pageRef.current
    if (!page) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    utils.set(invRef.current!, spot(reduce ? 2 : 0))
    if (reduce) { setAt(2); setAuto(false); return }
    const a = animate(page.querySelectorAll('.st-bar'), { scaleY: [0, 1], duration: 900, ease: 'outExpo', delay: stagger(110) })
    const b = animate(page.querySelectorAll('.st-top > *, .st-rise, ' + PARTS), { opacity: [0, 1], y: [20, 0], duration: 650, ease: 'outQuart', delay: stagger(70, { start: 80 }) })
    const c = animate(invRef.current!, { opacity: [0, 1], scale: [.85, 1], duration: 500, ease: 'outBack(1.7)', delay: 700 })
    return () => { a.revert(); b.revert(); c.revert() }
  }, [])

  // Keep the invoice on its step when the window changes size.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !window.ResizeObserver) return
    const ro = new ResizeObserver(() => utils.set(invRef.current!, spot(at)))
    ro.observe(stage)
    return () => ro.disconnect()
  }, [at])

  // The climb: hop to the next step, hold, and start over once it's paid.
  useEffect(() => {
    if (!auto) return
    const t = window.setTimeout(() => {
      if (at < 2) goTo(at + 1)
      else {
        const inv = invRef.current!
        animate(inv, {
          opacity: [1, 0], duration: 300, ease: 'inQuad',
          onComplete: () => {
            utils.set(inv, spot(0)); setAt(0)
            animate(inv, { opacity: [0, 1], y: [spot(0).y - 30, spot(0).y], duration: 420, ease: 'outQuart' })
          },
        })
      }
    }, at === 0 ? 1400 + HOLD[0] : HOLD[at])
    return () => clearTimeout(t)
  }, [at, auto])

  // Switching between sign in and sign up: the old form slides away, the new
  // one slides in from the other side, and the stairs carry on.
  const firstPath = useRef(true)
  useLayoutEffect(() => {
    if (firstPath.current) { firstPath.current = false; return }
    leaving.current = false
    const main = mainRef.current
    if (!main || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const dir = onSignup ? 1 : -1
    const a = animate(main.querySelectorAll(PARTS), { opacity: [0, 1], x: [48 * dir, 0], duration: 560, ease: 'outQuart', delay: stagger(45) })
    const b = animate(pageRef.current!.querySelectorAll('.st-switch'), { opacity: [0, 1], y: [-8, 0], duration: 400, ease: 'outQuart' })
    return () => { a.revert(); b.revert() }
  }, [pathname])

  function switchTo(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    e.preventDefault()
    if (leaving.current) return
    leaving.current = true
    const main = mainRef.current
    if (!main || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { router.push(href); return }
    const dir = onSignup ? 1 : -1
    animate(main.querySelectorAll(PARTS), {
      opacity: 0, x: 40 * dir, duration: 220, ease: 'inQuad', delay: stagger(25),
      onComplete: () => router.push(href),
    })
  }

  function goTo(i: number) {
    const inv = invRef.current!
    const from = spot(at), to = spot(i)
    const peak = Math.min(from.y, to.y) - 34
    animate(inv, {
      x: { to: to.x, duration: 620, ease: 'inOutQuad' },
      y: [{ to: peak, duration: 330, ease: 'outQuad' }, { to: to.y, duration: 290, ease: 'inQuad' }],
    })
    setAt(i)
    if (i === 2) animate(inv.querySelector('.st-stamp')!, { opacity: [0, 1], scale: [1.8, 1], rotate: [-12, -12], duration: 420, ease: 'outBack(2.2)', delay: 600 })
  }

  function pick(i: number) {
    setAuto(false)
    if (i !== at) goTo(i)
  }

  // The stamp only belongs on a paid invoice.
  useEffect(() => {
    if (at !== 2) utils.set(invRef.current!.querySelector('.st-stamp')!, { opacity: 0 })
  }, [at])

  return (
    <>
      <style>{FORM_CSS + CSS}</style>
      <div className="st-page" ref={pageRef}>
        <header className="st-top">
          <Link href="/" className="st-logo" aria-label="StagePay home"><LogoFull tone="default" /></Link>
          {onSignup
            ? <p className="st-switch"><span>Already have an account? </span><Link href="/auth/login" onClick={e => switchTo(e, '/auth/login')}>Sign in</Link></p>
            : <p className="st-switch"><span>New to StagePay? </span><Link href="/auth/signup" onClick={e => switchTo(e, '/auth/signup')}>Create an account</Link></p>}
        </header>

        <main className="st-main" ref={mainRef}>{children}</main>

        <p className="st-help st-rise">Need a hand? WhatsApp us on <a href="https://wa.me/26773998627">73 998 627</a> or email <a href="mailto:getstagepay@gmail.com">getstagepay@gmail.com</a>.</p>

        <div className="st-stage" ref={stageRef}>
          {STAGES.map((s, i) => (
            <button key={s} type="button" className={`st-bar st-b${i + 1}`} onClick={() => pick(i)}
              aria-label={`Show the sample invoice at: ${s}`} aria-pressed={at === i}>
              <b>{s}</b>
              <small>{dates ? dates[i] : ' '}</small>
            </button>
          ))}
          <div className="st-inv" ref={invRef} data-ui aria-hidden="true">
            <div className="st-inv-top">
              <div><div className="st-inv-biz">Thuto Tutoring Centre</div><div className="st-inv-short">Thato M.</div><div className="st-inv-sub">Bill to Thato M.</div></div>
              <span className="st-steps">{[0, 1, 2].map(i => <i key={i} className={`${i <= at ? 'on' : ''} ${i === 2 ? 'last' : ''}`} />)}</span>
            </div>
            <div className="st-inv-amt">
              <b>P1,425</b>
              {at < 2 && <span className="st-chip">{at === 0 ? 'Sent' : 'Reminded'}</span>}
            </div>
            <div className="st-stamp">PAID</div>
          </div>
        </div>
      </div>
    </>
  )
}
