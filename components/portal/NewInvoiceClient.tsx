'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogoIcon } from '@/components/Logo'
import { openWhatsApp, publicInvoiceUrl, markInvoiceSent } from '@/lib/wa-link'
import { useSharablePdf, sharePdf } from '@/lib/wa-share'
import type { KnownItem, LastInvoice, LineItem } from './invoice-draft'
import { BILLED_FOR_MAX, billedForLabel, billedForPlaceholder, billedForWaLine } from '@/lib/billed-for'
import { dayMonthYear } from '@/lib/format-date'

// ── Types ────────────────────────────────────────────────────────────────────
type Client  = { id: string; name: string; email: string | null; phone: string | null }
type Profile = { firm_name: string | null; name: string | null; address: string | null; email: string | null; default_currency: string; default_vat_rate: number; tax_label: string; default_due_days?: number | null; business_type?: string | null }

const CURRENCIES = [
  { v: 'P',   l: 'BWP — Pula (P)' },
  { v: 'R',   l: 'ZAR — Rand (R)' },
  { v: '$',   l: 'USD — Dollar ($)' },
  { v: '€',   l: 'EUR — Euro (€)' },
  { v: '£',   l: 'GBP — Pound (£)' },
  { v: 'KSh', l: 'KES — Kenyan Shilling' },
  { v: '₦',   l: 'NGN — Naira (₦)' },
  { v: 'GH₵', l: 'GHS — Cedi (GH₵)' },
  { v: 'A$',  l: 'AUD — Dollar (A$)' },
  { v: 'AED', l: 'AED — Dirham' },
]

const TERMS = [
  { days: 0,  label: 'On receipt' },
  { days: 7,  label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
] as const

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Gaborone' }).format(new Date())
}
function addDays(d: string, n: number) {
  const [y, m, day] = d.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, day + n)).toISOString().slice(0, 10)
}
function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000)
}
function fmtAmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-').map(Number)
  return `${day} ${MONTHS[m - 1]} ${y}`
}
function longDate(d: string) {
  const [y, m, day] = d.split('-').map(Number)
  return `${DAYS[new Date(Date.UTC(y, m - 1, day)).getUTCDay()]}, ${day} ${MONTHS[m - 1]}`
}
function initials(name: string) {
  return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}
// A stable hue per person, so the same client always wears the same tint.
function hue(name: string) {
  let h = 0
  for (const c of name.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}
const reducedMotion = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

// Glides a number to its new value, so the preview total visibly follows the form.
function useTween(value: number, ms = 450) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    if (reducedMotion()) { setShown(value); from.current = value; return }
    const start = performance.now(), a = from.current, b = value
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const v = a + (b - a) * (1 - Math.pow(1 - p, 3))
      setShown(v); from.current = v
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, ms])
  return shown
}

const CSS = `
  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 28px;background:var(--bg2);}
  .page-title{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--t1);}
  .ni{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:24px;align-items:start;padding:24px 28px 48px;max-width:1240px;}
  .ni-form{display:flex;flex-direction:column;gap:16px;min-width:0;}

  .sec{background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:20px 22px;}
  .sec h2{font-size:16px;font-weight:700;color:var(--t1);letter-spacing:-.01em;}
  .sec-sub{font-size:14px;color:var(--t2);margin-top:2px;}
  .sec-body{margin-top:16px;}

  .lbl{display:block;font-size:13px;font-weight:600;color:var(--t2);margin-bottom:6px;}
  .in{width:100%;height:42px;background:var(--bg);border:1px solid var(--line2);border-radius:9px;padding:0 12px;font:500 15px var(--font-manrope),sans-serif;color:var(--t1);outline:none;transition:border-color var(--dur-1) var(--ease),box-shadow var(--dur-1) var(--ease);}
  textarea.in{height:auto;min-height:84px;padding:10px 12px;line-height:1.5;resize:vertical;}
  select.in{cursor:pointer;}
  .in:focus{border-color:var(--g);box-shadow:0 0 0 3px color-mix(in srgb,var(--g) 22%,transparent);}
  .in::placeholder{color:var(--t3);}
  .in.bad{border-color:#E5484D;}
  .in.num{text-align:right;font-variant-numeric:tabular-nums;}
  .grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px 14px;}
  .grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 14px;}
  .billed-for{margin-top:12px;max-width:340px;}
  .field-err{font-size:13px;color:#E5484D;margin-top:6px;}

  /* Clients: one tap fills the details. */
  .people{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
  .person{display:inline-flex;align-items:center;gap:8px;height:38px;padding:0 14px 0 5px;border-radius:999px;border:1px solid var(--line2);background:transparent;color:var(--t1);font:600 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .person:hover{border-color:var(--t3);}
  .person[aria-pressed="true"]{border-color:var(--t1);background:color-mix(in srgb,var(--t1) 6%,transparent);}
  .av{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;font-size:11px;font-weight:700;background:hsl(var(--h) 70% 90%);color:hsl(var(--h) 45% 28%);}
  html:not([data-theme="light"]) .av{background:hsl(var(--h) 30% 30%);color:hsl(var(--h) 70% 85%);}
  .people-more{height:38px;padding:0 12px;border:0;background:none;color:var(--t2);font:600 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .people-more:hover{color:var(--t1);}

  /* Same as last time. */
  .again{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:16px;padding:14px 16px;border-radius:12px;background:color-mix(in srgb,var(--g) 12%,transparent);animation:ni-rise var(--dur-3) var(--ease) both;}
  .again p{font-size:14px;color:var(--t1);}
  .again small{display:block;font-size:13px;color:var(--t2);margin-top:2px;}
  .again-btn{height:36px;padding:0 14px;border-radius:9px;border:0;background:var(--t1);color:var(--bg);font:700 14px var(--font-manrope),sans-serif;cursor:pointer;white-space:nowrap;}
  .again-done{font-size:14px;font-weight:600;color:var(--t1);}

  /* Items. */
  .items-head,.item-row{display:grid;grid-template-columns:minmax(0,1fr) 76px 112px 112px 36px;gap:10px;align-items:center;}
  .items-head{font-size:13px;font-weight:600;color:var(--t2);margin-bottom:6px;}
  .items-head .r,.item-amt{text-align:right;}
  .item-row{padding:6px 0;animation:ni-rise var(--dur-3) var(--ease) both;}
  .item-amt{font-size:15px;font-weight:700;color:var(--t1);font-variant-numeric:tabular-nums;white-space:nowrap;}
  .item-del{width:36px;height:36px;display:grid;place-items:center;border:0;border-radius:9px;background:transparent;color:var(--t3);cursor:pointer;}
  .item-del:hover{color:#E5484D;background:color-mix(in srgb,#E5484D 10%,transparent);}
  .item-del:disabled{opacity:.3;cursor:default;background:none;color:var(--t3);}
  .add-item{display:inline-flex;align-items:center;gap:8px;height:38px;margin-top:8px;padding:0 12px;border-radius:9px;border:1px dashed var(--line2);background:transparent;color:var(--t1);font:600 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .add-item:hover{border-color:var(--t3);}

  .sums{margin-top:18px;padding-top:14px;border-top:1px solid var(--line);display:grid;justify-content:end;grid-template-columns:auto 140px;gap:6px 24px;font-size:14px;color:var(--t2);font-variant-numeric:tabular-nums;}
  .sums span:nth-child(even){text-align:right;color:var(--t1);}
  .sums .total{font-size:18px;font-weight:700;color:var(--t1);padding-top:6px;}

  /* Due date. */
  .chips{display:flex;gap:8px;flex-wrap:wrap;}
  .chip{height:38px;padding:0 14px;border-radius:9px;border:1px solid var(--line2);background:transparent;color:var(--t1);font:600 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .chip:hover{border-color:var(--t3);}
  .chip[aria-pressed="true"]{background:var(--t1);border-color:var(--t1);color:var(--bg);}
  .due-line{margin-top:12px;font-size:14px;color:var(--t2);}
  .due-line b{color:var(--t1);}

  /* More options. */
  details.sec > summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:12px;}
  details.sec > summary::-webkit-details-marker{display:none;}
  details.sec > summary svg{transition:transform var(--dur-2) var(--ease);color:var(--t2);}
  details.sec[open] > summary svg{transform:rotate(180deg);}
  details.sec[open] .sec-body{animation:ni-rise var(--dur-2) var(--ease) both;}
  .opt{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 0;border-top:1px solid var(--line);}
  .opt:first-child{border-top:0;padding-top:0;}
  .opt-l{font-size:14px;font-weight:600;color:var(--t1);}
  .opt-l small{display:block;font-size:13px;font-weight:400;color:var(--t2);margin-top:1px;}
  .opt-in{display:flex;align-items:center;gap:8px;}
  .opt-in .in{width:110px;}
  .switch{position:relative;width:44px;height:26px;flex:none;border-radius:999px;border:0;background:var(--line2);cursor:pointer;transition:background-color var(--dur-2) var(--ease);}
  .switch::after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(0,0,0,.25);transition:transform var(--dur-2) var(--ease);}
  .switch[aria-checked="true"]{background:var(--g);}
  .switch[aria-checked="true"]::after{transform:translateX(18px);}

  .btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;padding:0 16px;border-radius:10px;border:1px solid var(--line2);background:transparent;color:var(--t1);font:700 14px var(--font-manrope),sans-serif;cursor:pointer;white-space:nowrap;text-decoration:none;}
  .btn:hover:not(:disabled){border-color:var(--t3);}
  .btn:disabled{opacity:.55;cursor:default;}
  .btn.primary{background:var(--g);border-color:var(--g);color:#1F2A44;}
  .btn.primary:hover:not(:disabled){background:#FFB81C;border-color:#FFB81C;}
  .btn.ghost{border-color:transparent;color:var(--t2);}
  .btn.ghost:hover:not(:disabled){color:var(--t1);border-color:transparent;background:color-mix(in srgb,var(--t1) 5%,transparent);}
  .btn:focus-visible,.chip:focus-visible,.person:focus-visible,.switch:focus-visible,.item-del:focus-visible,.add-item:focus-visible,.again-btn:focus-visible,summary:focus-visible{outline:2px solid var(--g);outline-offset:2px;}

  /* Preview: looks like the PDF the client receives. */
  .ni-side{position:sticky;top:16px;display:flex;flex-direction:column;gap:12px;}
  .side-head{display:flex;align-items:center;justify-content:space-between;font-size:13px;color:var(--t2);}
  .paper{background:#FFFFFF;color:#1F2A44;border-radius:12px;overflow:hidden;font-size:12px;box-shadow:0 1px 0 rgba(31,42,68,.06),0 8px 28px rgba(15,23,41,.12);}
  .paper-top{background:#1F2A44;color:#FAF7F0;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:16px 18px;}
  .paper-firm{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:700;color:#F2A900;}
  .paper-firm small{display:block;font-size:10.5px;font-weight:500;color:rgba(250,247,240,.6);margin-top:1px;}
  .paper-word{font-size:20px;font-weight:800;letter-spacing:.04em;color:#F2A900;text-align:right;line-height:1;}
  .paper-word small{display:block;font-size:10.5px;font-weight:500;letter-spacing:0;color:rgba(250,247,240,.7);margin-top:4px;}
  .paper-body{padding:14px 18px 16px;}
  .paper-meta{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;}
  .paper-meta div{background:#FCEFC7;border-radius:6px;padding:6px 8px;}
  .paper-meta span{display:block;font-size:9.5px;color:#6B4A00;}
  .paper-meta b{font-size:11.5px;font-variant-numeric:tabular-nums;}
  .paper-to{margin-top:10px;background:#FAF7F0;border-radius:6px;padding:8px 10px;}
  .paper-to span{font-size:9.5px;color:#6B4A00;}
  .paper-to b{display:block;font-size:12.5px;margin-top:1px;}
  .paper-to small{display:block;color:#5B6475;font-size:11px;}
  .paper-items{width:100%;border-collapse:collapse;margin-top:12px;font-variant-numeric:tabular-nums;}
  .paper-items th{background:#1F2A44;color:#FAF7F0;font-size:9.5px;font-weight:700;text-align:left;padding:6px 8px;}
  .paper-items th:first-child{border-radius:5px 0 0 5px;}
  .paper-items th:last-child{border-radius:0 5px 5px 0;}
  .paper-items td{padding:6px 8px;font-size:11.5px;}
  .paper-items tr:nth-child(even) td{background:#FCEFC7;}
  .paper-items .r{text-align:right;white-space:nowrap;}
  .paper-items tr.fresh td{animation:ni-flash 900ms var(--ease) both;}
  .paper-empty{padding:14px 8px;color:#646C7E;font-style:italic;font-size:11.5px;}
  .paper-sums{display:grid;grid-template-columns:1fr auto;gap:3px 16px;margin:10px 0 0 auto;width:60%;font-size:11.5px;color:#5B6475;font-variant-numeric:tabular-nums;}
  .paper-sums span:nth-child(even){text-align:right;color:#1F2A44;}
  .paper-total{display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding:9px 12px;border-radius:7px;background:#F2A900;color:#1F2A44;font-weight:800;font-variant-numeric:tabular-nums;}
  .paper-total b{font-size:17px;}
  .paper-note{margin-top:10px;font-size:11px;color:#5B6475;white-space:pre-wrap;}
  .side-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
  .side-actions .primary{grid-column:1 / -1;height:48px;font-size:15px;}
  .side-err{font-size:14px;color:#E5484D;}
  .side-err a{color:inherit;font-weight:700;}

  /* Phone and tablet: the form, then a bar that keeps the total and Send in reach. */
  .bar,.mob-err{display:none;}
  .sheet-bg{position:fixed;inset:0;z-index:3000;background:rgba(10,14,24,.55);display:flex;align-items:flex-end;justify-content:center;animation:ni-fade var(--dur-2) var(--ease) both;}
  .sheet{width:100%;max-width:520px;max-height:92dvh;overflow:auto;background:var(--bg2);border-radius:18px 18px 0 0;padding:16px 16px calc(20px + env(safe-area-inset-bottom,0px));animation:ni-up var(--dur-3) var(--ease) both;}
  .sheet-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
  .sheet-head h2{font-size:17px;font-weight:700;color:var(--t1);}
  .sheet-x{width:36px;height:36px;border:0;border-radius:10px;background:color-mix(in srgb,var(--t1) 6%,transparent);color:var(--t1);font-size:20px;cursor:pointer;}
  @media(min-width:640px){.sheet-bg{align-items:center;}.sheet{border-radius:16px;}}

  .send-to{font-size:14px;color:var(--t2);margin-bottom:14px;}
  .send-to b{color:var(--t1);}
  .tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;padding:4px;border-radius:11px;background:color-mix(in srgb,var(--t1) 6%,transparent);margin-bottom:14px;}
  .tabs button{height:36px;border:0;border-radius:8px;background:transparent;color:var(--t2);font:700 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .tabs button[aria-pressed="true"]{background:var(--bg2);color:var(--t1);box-shadow:0 1px 2px rgba(0,0,0,.12);}
  .send-done{display:flex;gap:12px;align-items:flex-start;padding:14px;border-radius:12px;background:color-mix(in srgb,var(--g) 14%,transparent);font-size:14px;color:var(--t1);}
  .send-done small{display:block;color:var(--t2);margin-top:2px;}
  .sheet-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:16px;}

  @keyframes ni-rise{from{opacity:0;transform:translateY(8px)}}
  @keyframes ni-fade{from{opacity:0}}
  @keyframes ni-up{from{transform:translateY(24px);opacity:0}}
  @keyframes ni-flash{0%{background:rgba(242,169,0,.35)}}
  @media (prefers-reduced-motion: reduce){
    .again,.item-row,details.sec[open] .sec-body,.sheet-bg,.sheet,.paper-items tr.fresh td{animation:none;}
  }

  @media(max-width:1100px){
    .ni{grid-template-columns:1fr;padding:20px 20px 120px;}
    .ni-side{display:none;}
    .mob-err{display:block;}
    .bar{display:flex;position:sticky;bottom:0;z-index:20;align-items:center;gap:10px;margin:0 -20px;padding:12px 20px calc(12px + env(safe-area-inset-bottom,0px));background:color-mix(in srgb,var(--bg2) 94%,transparent);border-top:1px solid var(--line);backdrop-filter:blur(8px);}
    .bar-total{flex:1;min-width:0;}
    .bar-total small{display:block;font-size:12px;color:var(--t2);}
    .bar-total b{font-size:19px;font-weight:800;color:var(--t1);font-variant-numeric:tabular-nums;}
    .bar .btn.primary{height:46px;}
  }
  @media(max-width:768px){
    .topbar{padding:0 16px;}
    .topbar .btn{display:none;}
    .ni{padding:16px 16px 24px;}
    .sec{padding:16px;}
    .bar{bottom:calc(56px + env(safe-area-inset-bottom,0px));margin:0 -16px;padding:10px 16px;}
    .grid2,.grid3{grid-template-columns:1fr;}
    .items-head{display:none;}
    .item-row{grid-template-columns:72px minmax(0,1fr) 36px;grid-template-areas:"desc desc del" "qty rate amt";row-gap:8px;padding:12px 0;border-top:1px solid var(--line);}
    .item-row:first-of-type{border-top:0;}
    .item-row .c-desc{grid-area:desc;}
    .item-row .c-qty{grid-area:qty;}
    .item-row .c-rate{grid-area:rate;}
    .item-row .item-amt{grid-area:amt;grid-column:3;justify-self:end;}
    .item-row .item-del{grid-area:del;}
    .item-row{grid-template-columns:72px minmax(0,1fr) auto;}
    .sums{grid-template-columns:auto 120px;}
    .opt{flex-wrap:wrap;}
  }
`

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewInvoiceClient({
  initialProfile,
  initialClients,
  editId,
  initialInvoice = null,
  initialClientId = null,
  lastByClient = {},
  knownItems = [],
}: {
  initialProfile: Profile | null
  initialClients: Client[]
  editId: string | null
  initialInvoice?: Record<string, any> | null
  initialClientId?: string | null
  lastByClient?: Record<string, LastInvoice>
  knownItems?: KnownItem[]
}) {
  const router = useRouter()
  const profile = initialProfile
  const inv = editId ? initialInvoice : null
  // Arriving from a client's "New invoice" link fills in who it is for.
  const preset = !inv && initialClientId ? initialClients.find(c => c.id === initialClientId) ?? null : null

  // Form state, filled from the invoice being edited or from the profile's defaults.
  const [selectedClientId, setSelectedClientId] = useState<string | null>(inv?.client_id ?? preset?.id ?? null)
  const [clientName,  setClientName]  = useState<string>(inv?.client_name ?? preset?.name ?? '')
  const [clientEmail, setClientEmail] = useState<string>(inv?.client_email ?? preset?.email ?? '')
  const [clientPhone, setClientPhone] = useState<string>(inv?.client_phone ?? preset?.phone ?? '')
  const [project,     setProject]     = useState<string>(inv?.project ?? '')
  const [billedFor,   setBilledFor]   = useState<string>(inv?.billed_for ?? '')
  const bfLabel = billedForLabel(profile?.business_type)
  const [currency,    setCurrency]    = useState<string>(inv?.currency || profile?.default_currency || 'P')
  const [issueDate,   setIssueDate]   = useState<string>(inv?.issue_date || today())
  const initialDue = inv?.due_date || addDays(inv?.issue_date || today(), profile?.default_due_days ?? 30)
  const initialTerm = daysBetween(inv?.issue_date || today(), initialDue)
  const [termDays,    setTermDays]    = useState<number | null>(TERMS.some(t => t.days === initialTerm) ? initialTerm : null)
  const [customDue,   setCustomDue]   = useState<string>(initialDue)
  const [vatRate,     setVatRate]     = useState<number>(inv?.vat_rate ?? (Number.isFinite(Number(profile?.default_vat_rate)) && profile?.default_vat_rate != null ? Number(profile.default_vat_rate) : 14))
  const [items,       setItems]       = useState<(LineItem & { key: number })[]>(() => {
    const src = inv?.invoice_items?.length
      ? [...inv.invoice_items].sort((a: any, b: any) => a.sort_order - b.sort_order).map((it: any) => ({ desc: it.description, qty: Number(it.quantity), rate: Number(it.unit_price) }))
      : [{ desc: '', qty: 1, rate: 0 }]
    return src.map((it: LineItem, i: number) => ({ ...it, key: i }))
  })
  const nextKey = useRef(items.length)
  const [discountOn,  setDiscountOn]  = useState<boolean>(Number(inv?.discount_amount) > 0)
  const [discountAmt, setDiscountAmt] = useState<number>(Number(inv?.discount_amount) || 0)
  const [depositOn,   setDepositOn]   = useState<boolean>(Number(inv?.deposit_amount) > 0)
  const [depositPct,  setDepositPct]  = useState<number>(() => {
    const t = Number(inv?.total), d = Number(inv?.deposit_amount)
    return t > 0 && d > 0 ? Math.round((d / t) * 100) : 50
  })
  const [isRecurring, setIsRecurring] = useState<boolean>(!!inv?.is_recurring)
  const [recurInterval, setRecurInterval] = useState<'monthly' | 'quarterly' | 'yearly'>(inv?.recurrence_interval || 'monthly')
  const [notes,       setNotes]       = useState<string>(inv?.notes ?? '')

  const [showAllPeople, setShowAllPeople] = useState(false)
  const [usedAgain,  setUsedAgain]  = useState<string | null>(null)
  const [freshKeys,  setFreshKeys]  = useState<Set<number>>(new Set())
  const [tried,      setTried]      = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [saveError,  setSaveError]  = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)

  // Once saved, later saves update the same invoice instead of creating another.
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(editId)
  const [savedInvNum,    setSavedInvNum]    = useState<string | null>(inv?.invoice_number ?? null)
  const [savedToken,     setSavedToken]     = useState<string | null>(inv?.public_token ?? null)

  const [sendOpen,  setSendOpen]  = useState(false)
  const [channel,   setChannel]   = useState<'wa' | 'email'>('wa')
  const [sendEmail, setSendEmail] = useState('')
  const [sendPhone, setSendPhone] = useState('')
  const [sending,   setSending]   = useState(false)
  const [sendDone,  setSendDone]  = useState(false)
  const [sendError, setSendError] = useState('')
  // On phones the PDF is shared through the share menu; bumped on every save
  // so an edited invoice never shares a stale PDF. linkOnly after a failed share.
  const [pdfRev,    setPdfRev]    = useState(0)
  const [linkOnly,  setLinkOnly]  = useState(false)
  const [pdfShared, setPdfShared] = useState(false)
  const pdf = useSharablePdf(
    sendOpen && channel === 'wa' && savedInvoiceId && !linkOnly ? `/api/invoices/${savedInvoiceId}/pdf?rev=${pdfRev}` : null,
    `${savedInvNum || 'invoice'}.pdf`,
  )
  const sharing = !!pdf.file || pdf.preparing

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const nameRef = useRef<HTMLInputElement>(null)
  const firstItemRef = useRef<HTMLInputElement>(null)

  // ── Derived ──
  const dueDate = termDays === null ? customDue : addDays(issueDate, termDays)
  const lines = items.filter(i => i.desc.trim())
  const subtotal = items.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0)
  const effectiveDiscount = discountOn ? Math.min(discountAmt, subtotal) : 0
  const vatAmt = (subtotal - effectiveDiscount) * (vatRate / 100)
  const taxLabel = profile?.tax_label || 'VAT'
  const total = subtotal - effectiveDiscount + vatAmt
  const depositAmt = depositOn ? total * (depositPct / 100) : 0
  const shownTotal = useTween(total)

  const problems = {
    client: !clientName.trim() ? 'Add who this invoice is for.' : '',
    items: !lines.some(i => (Number(i.qty) || 0) * (Number(i.rate) || 0) > 0) ? 'Add at least one item with an amount.' : '',
  }

  const firmName = profile?.firm_name || profile?.name || 'Your business'
  // Older invoices may be linked to the client only by name, so look both ways and take the newest.
  const nameKey = clientName.trim() ? `name:${clientName.trim().toLowerCase()}` : ''
  const last = [selectedClientId && lastByClient[selectedClientId], nameKey && lastByClient[nameKey]]
    .filter((x): x is LastInvoice => !!x)
    .sort((a, b) => (b.issue_date ?? '').localeCompare(a.issue_date ?? ''))[0]
  const knownByDesc = useMemo(() => new Map(knownItems.map(k => [k.desc.toLowerCase(), k])), [knownItems])
  const people = showAllPeople ? initialClients : initialClients.slice(0, 8)

  // ── Client ──
  function selectClient(c: Client) {
    if (selectedClientId === c.id) return
    setSelectedClientId(c.id)
    setClientName(c.name)
    setClientEmail(c.email ?? '')
    setClientPhone(c.phone ?? '')
    setUsedAgain(null)
  }

  function useLastTime() {
    if (!last) return
    if (last.project) setProject(last.project)
    if (last.billed_for) setBilledFor(last.billed_for)
    if (last.currency) setCurrency(last.currency)
    const keys: number[] = []
    setItems(last.items.map(i => { const key = nextKey.current++; keys.push(key); return { ...i, key } }))
    setFreshKeys(new Set(keys))
    setUsedAgain(last.invoice_number)
  }

  // ── Items ──
  function updateItem(key: number, field: keyof LineItem, val: string | number) {
    setItems(prev => prev.map(it => {
      if (it.key !== key) return it
      const next = { ...it, [field]: val }
      // A remembered item brings its last rate with it, unless a rate is already set.
      if (field === 'desc' && !Number(it.rate)) {
        const k = knownByDesc.get(String(val).trim().toLowerCase())
        if (k) next.rate = k.rate
      }
      return next
    }))
  }
  function addItem() {
    const key = nextKey.current++
    setItems(prev => [...prev, { desc: '', qty: 1, rate: 0, key }])
    setFreshKeys(new Set([key]))
    requestAnimationFrame(() => document.getElementById(`ni-desc-${key}`)?.focus())
  }
  function removeItem(key: number) {
    setItems(prev => (prev.length === 1 ? prev : prev.filter(it => it.key !== key)))
  }

  // ── Save ──
  async function saveInvoice(createAs: 'draft' | 'sent' = 'draft') {
    setSaving(true); setSaveError('')
    try {
      const payload: Record<string, unknown> = {
        client_id:           selectedClientId ?? null,
        client_name:         clientName.trim(),
        client_email:        clientEmail.trim() || null,
        client_phone:        clientPhone.trim() || null,
        project:             project.trim() || null,
        billed_for:          billedFor.trim() || null,
        currency,
        issue_date:          issueDate,
        due_date:            dueDate || null,
        vat_rate:            vatRate,
        discount_amount:     effectiveDiscount,
        deposit_amount:      depositAmt,
        is_recurring:        isRecurring,
        recurrence_interval: isRecurring ? recurInterval : undefined,
        notes:               notes.trim() || null,
        items: lines.map(i => ({ description: i.desc.trim(), quantity: Number(i.qty) || 1, unit_price: Number(i.rate) || 0 })),
      }
      // Status is only set on create: an invoice that is already sent must not be pushed back to draft.
      if (!savedInvoiceId) payload.status = createAs
      const url = savedInvoiceId ? `/api/invoices/${savedInvoiceId}` : '/api/invoices'
      const res = await fetch(url, { method: savedInvoiceId ? 'PATCH' : 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Couldn’t save the invoice. Try again.')
      const saved = data.invoice
      setSavedInvoiceId(saved.id)
      if (saved.invoice_number) setSavedInvNum(saved.invoice_number)
      if (saved.public_token) setSavedToken(saved.public_token)

      // A new name becomes a client, linked to this invoice.
      const name = clientName.trim()
      if (name && !selectedClientId && !initialClients.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        try {
          const cr = await fetch('/api/clients', {
            method: 'POST', credentials: 'include',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name, email: clientEmail || undefined, phone: clientPhone || undefined }),
          })
          const cd = await cr.json().catch(() => ({}))
          if (cr.ok && cd.client?.id) {
            setSelectedClientId(cd.client.id)
            fetch(`/api/invoices/${saved.id}`, {
              method: 'PATCH', credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ client_id: cd.client.id }),
            }).catch(() => {})
          }
        } catch { /* the invoice is saved; the client record is a nicety */ }
      }
      return saved as { id: string; invoice_number: string; public_token?: string | null }
    } catch (e: any) {
      setSaveError(e.message)
      throw e
    } finally {
      setSaving(false)
    }
  }

  function check(forSend: boolean) {
    setTried(true)
    if (problems.client) { nameRef.current?.focus(); return false }
    if (forSend && problems.items) { firstItemRef.current?.focus(); return false }
    return true
  }

  async function handleDraft() {
    if (!check(false)) return
    try {
      const saved = await saveInvoice('draft')
      router.push(`/invoices/${saved.id}`)
    } catch { /* shown in saveError */ }
  }

  async function handleSendClick(which: 'wa' | 'email') {
    if (!check(true)) return
    try {
      await saveInvoice('draft')
      setPdfRev(r => r + 1)
      setLinkOnly(false)
      setPdfShared(false)
      setChannel(which)
      setSendEmail(clientEmail)
      setSendPhone(clientPhone)
      setSendDone(false)
      setSendError('')
      setPreviewOpen(false)
      setSendOpen(true)
    } catch { /* shown in saveError */ }
  }

  async function handleSend() {
    if (!savedInvoiceId) return
    setSendError('')

    // WhatsApp opens the user's own app via wa.me — window.open has to run
    // before any await or the browser treats it as a popup and blocks it.
    if (channel !== 'email') {
      const link = publicInvoiceUrl(savedToken)
      const bfLine = billedForWaLine(profile?.business_type, billedFor)
      const amountLine = `*${savedInvNum}* for *${fmtAmt(total - depositAmt, currency)}*${dueDate ? `, due ${dayMonthYear(dueDate)}` : ''}.${bfLine ? `\n${bfLine}` : ''}`
      const intro = `Here is invoice ${amountLine}`
      const finish = async () => {
        setSendDone(true)
        await markInvoiceSent(savedInvoiceId)
        setTimeout(() => { setSendOpen(false); router.push(`/invoices/${savedInvoiceId}`) }, 1800)
      }

      // Step 2 after a PDF share: WhatsApp drops text that comes with a shared
      // file, so the message goes to their chat by wa.me and lands under the PDF.
      if (pdfShared) {
        if (sendPhone.replace(/\D/g, '').length < 7) {
          setSendError('Enter the number with country code, e.g. +267 71 234 567')
          return
        }
        openWhatsApp(sendPhone, [`Hi ${clientName} 👋`, ``, `The PDF above is invoice ${amountLine}`, link ? `\nView it online: ${link}` : '', ``, `Thank you for your business!`].join('\n'))
        await finish()
        return
      }

      // Phone: share the PDF itself. The share must start before any await.
      if (pdf.file) {
        const text = [`Hi ${clientName} 👋`, ``, intro, link ? `\nView it online: ${link}` : '', ``, `Thank you for your business!`].join('\n')
        const result = await sharePdf(pdf.file, text)
        if (result === 'shared') {
          setPdfShared(true)
          await markInvoiceSent(savedInvoiceId)
        } else if (result === 'failed') {
          setLinkOnly(true)
          setSendError('The share menu didn’t open. Tap the button again to send a link instead.')
        }
        return
      }

      if (sendPhone.replace(/\D/g, '').length < 7) {
        setSendError('Enter the number with country code, e.g. +267 71 234 567')
        return
      }
      openWhatsApp(sendPhone, [
        `Hi ${clientName} 👋`,
        ``,
        intro,
        link ? `\nView and download it here:\n${link}` : '',
        ``,
        `Thank you for your business!`,
      ].join('\n'))
      await finish()
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ invoice_id: savedInvoiceId, to_email: sendEmail }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Send failed')
      setSendDone(true)
      setTimeout(() => { setSendOpen(false); router.push(`/invoices/${savedInvoiceId}`) }, 1800)
    } catch (e: any) {
      setSendError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function handlePDF() {
    if (!check(true)) return
    // Open the tab inside the click so it isn't blocked as a popup, then point it at the PDF.
    const tab = window.open('', '_blank')
    try {
      const saved = await saveInvoice('draft')
      const url = `/api/invoices/${saved.id}/pdf?view=true`
      if (tab) tab.location.href = url
      else window.location.href = url
    } catch {
      tab?.close()
    }
  }

  // Clear the "new row" flash once it has played.
  useEffect(() => {
    if (!freshKeys.size) return
    const t = setTimeout(() => setFreshKeys(new Set()), 1000)
    return () => clearTimeout(t)
  }, [freshKeys])

  const sendLabel = 'Send on WhatsApp'
  const tryMsg = tried && (problems.client || problems.items)

  // ── Preview ──
  const paper = (
    <div className="paper" aria-label="Invoice preview">
      <div className="paper-top">
        <div className="paper-firm">
          <span style={{ display: 'inline-flex', width: 22, height: 22 }}><LogoIcon /></span>
          <span>{firmName}<small>{profile?.address || ''}</small></span>
        </div>
        <div className="paper-word">INVOICE<small>{savedInvNum ? savedInvNum : 'Number on save'}</small></div>
      </div>
      <div className="paper-body">
        <div className="paper-meta">
          <div><span>Issued</span><b>{fmtDate(issueDate)}</b></div>
          <div><span>Due</span><b>{fmtDate(dueDate)}</b></div>
          <div><span>Terms</span><b>{termDays === 0 ? 'On receipt' : `Net ${daysBetween(issueDate, dueDate)} days`}</b></div>
        </div>
        <div className="paper-to">
          <span>Bill to</span>
          <b>{clientName.trim() || 'Client name'}</b>
          {(clientPhone || clientEmail) && <small>{[clientPhone, clientEmail].filter(Boolean).join(' · ')}</small>}
          {billedFor.trim() && <small>{bfLabel}: {billedFor.trim()}</small>}
          {project && <small>{project}</small>}
        </div>
        <table className="paper-items">
          <thead><tr><th>Description</th><th className="r">Qty</th><th className="r">Rate</th><th className="r">Amount</th></tr></thead>
          <tbody>
            {lines.length === 0
              ? <tr><td colSpan={4} className="paper-empty">Items you add appear here.</td></tr>
              : lines.map(it => (
                <tr key={it.key} className={freshKeys.has(it.key) ? 'fresh' : ''}>
                  <td>{it.desc}</td>
                  <td className="r">{it.qty}</td>
                  <td className="r">{fmtAmt(Number(it.rate) || 0, currency)}</td>
                  <td className="r"><b>{fmtAmt((Number(it.qty) || 0) * (Number(it.rate) || 0), currency)}</b></td>
                </tr>
              ))}
          </tbody>
        </table>
        <div className="paper-sums">
          <span>Subtotal</span><span>{fmtAmt(subtotal, currency)}</span>
          {effectiveDiscount > 0 && <><span>Discount</span><span>−{fmtAmt(effectiveDiscount, currency)}</span></>}
          <span>{taxLabel} ({vatRate}%)</span><span>{fmtAmt(vatAmt, currency)}</span>
        </div>
        <div className="paper-total"><span>Total due</span><b>{fmtAmt(shownTotal, currency)}</b></div>
        {depositAmt > 0 && <div className="paper-note"><b>Deposit due now: {fmtAmt(depositAmt, currency)}</b> ({depositPct}%)</div>}
        {notes.trim() && <div className="paper-note">{notes.trim()}</div>}
      </div>
    </div>
  )

  const errorBox = saveError && (
    <p className="side-err" role="alert">
      {saveError}{/limit|upgrade|plan/i.test(saveError) && <> <Link href="/settings">See plans</Link></>}
    </p>
  )

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar">
        <h1 className="page-title">{editId ? `Edit ${inv?.invoice_number ?? 'invoice'}` : 'New invoice'}</h1>
        <button type="button" className="btn ghost press" onClick={handleDraft} disabled={saving}>{saving ? 'Saving…' : 'Save draft'}</button>
      </div>

      <div className="ni">
        <div className="ni-form">

          {/* Who */}
          <section className="sec" aria-labelledby="who-h">
            <h2 id="who-h">Who is it for?</h2>
            <div className="sec-body">
              {initialClients.length > 0 && (
                <div className="people" role="group" aria-label="Your clients">
                  {people.map(c => (
                    <button key={c.id} type="button" className="person press" aria-pressed={selectedClientId === c.id} onClick={() => selectClient(c)}>
                      <span className="av" style={{ ['--h' as string]: hue(c.name) }} aria-hidden="true">{initials(c.name)}</span>
                      {c.name}
                    </button>
                  ))}
                  {initialClients.length > 8 && (
                    <button type="button" className="people-more" onClick={() => setShowAllPeople(v => !v)}>
                      {showAllPeople ? 'Show fewer' : `All ${initialClients.length} clients`}
                    </button>
                  )}
                </div>
              )}
              <div className="grid3">
                <div>
                  <label className="lbl" htmlFor="ni-client-name">Name</label>
                  <input ref={nameRef} id="ni-client-name" name="client_name" autoComplete="off" className={`in${tried && problems.client ? ' bad' : ''}`}
                    value={clientName} onChange={e => { setClientName(e.target.value); setSelectedClientId(null); setUsedAgain(null) }}
                    placeholder={initialClients.length ? 'Or type a new client' : 'e.g. Kefilwe Mokobi'} aria-invalid={!!(tried && problems.client)} />
                </div>
                <div>
                  <label className="lbl" htmlFor="ni-client-phone">WhatsApp number</label>
                  <input id="ni-client-phone" name="client_phone" className="in" type="tel" inputMode="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+267 71 234 567" />
                </div>
                <div>
                  <label className="lbl" htmlFor="ni-client-email">Email <span style={{ fontWeight: 400 }}>(optional)</span></label>
                  <input id="ni-client-email" name="client_email" className="in" type="email" inputMode="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="e.g. kefilwe@gmail.com" />
                </div>
              </div>
              {tried && problems.client && <p className="field-err">{problems.client}</p>}

              <div className="billed-for">
                <label className="lbl" htmlFor="ni-billed-for">{bfLabel} <span style={{ fontWeight: 400 }}>(optional)</span></label>
                <input id="ni-billed-for" name="billed_for" autoComplete="off" className="in" maxLength={BILLED_FOR_MAX} value={billedFor} onChange={e => setBilledFor(e.target.value)} placeholder={billedForPlaceholder(profile?.business_type)} />
              </div>

              {last && (
                <div className="again" aria-live="polite">
                  <p>
                    Last time: {last.project || `${last.items.length} items`} · <b>{fmtAmt(last.total, last.currency || currency)}</b>
                    <small>{last.items.slice(0, 3).map(i => i.desc).join(', ')}{last.items.length > 3 ? ` and ${last.items.length - 3} more` : ''} · {last.invoice_number}</small>
                  </p>
                  {usedAgain === last.invoice_number
                    ? <span className="again-done">Copied. Change anything you need.</span>
                    : <button type="button" className="again-btn press" onClick={useLastTime}>Use the same items</button>}
                </div>
              )}
            </div>
          </section>

          {/* What */}
          <section className="sec" aria-labelledby="what-h">
            <h2 id="what-h">What is it for?</h2>
            <div className="sec-body">
              <label className="lbl" htmlFor="ni-project">Description</label>
              <input id="ni-project" name="project" className="in" value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. November tuition fees" />

              <div style={{ marginTop: 18 }}>
                <div className="items-head" aria-hidden="true">
                  <span>Item</span><span className="r">Qty</span><span className="r">Rate</span><span className="r">Amount</span><span />
                </div>
                <datalist id="ni-known">
                  {knownItems.map(k => <option key={k.desc} value={k.desc}>{fmtAmt(k.rate, currency)}</option>)}
                </datalist>
                {items.map((it, i) => (
                  <div key={it.key} className="item-row">
                    <input ref={i === 0 ? firstItemRef : undefined} id={`ni-desc-${it.key}`} name={`item_desc_${i}`} list="ni-known" autoComplete="off"
                      className={`in c-desc${tried && problems.items && i === 0 ? ' bad' : ''}`} value={it.desc}
                      onChange={e => updateItem(it.key, 'desc', e.target.value)} placeholder="e.g. Mathematics" aria-label={`Item ${i + 1}`} />
                    <input id={`ni-qty-${it.key}`} name={`item_qty_${i}`} className="in num c-qty" type="number" inputMode="decimal" min={0} step="0.5"
                      value={it.qty} onChange={e => updateItem(it.key, 'qty', parseFloat(e.target.value) || 0)} aria-label={`Quantity for item ${i + 1}`} />
                    <input id={`ni-rate-${it.key}`} name={`item_rate_${i}`} className="in num c-rate" type="number" inputMode="decimal" min={0}
                      value={it.rate || ''} onChange={e => updateItem(it.key, 'rate', parseFloat(e.target.value) || 0)} placeholder="0.00" aria-label={`Rate for item ${i + 1}`} />
                    <span className="item-amt">{fmtAmt((Number(it.qty) || 0) * (Number(it.rate) || 0), currency)}</span>
                    <button type="button" className="item-del press" onClick={() => removeItem(it.key)} disabled={items.length === 1} aria-label={`Remove item ${i + 1}`}>
                      <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>
                    </button>
                  </div>
                ))}
                <button type="button" className="add-item press" onClick={addItem}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
                  Add an item
                </button>
                {tried && problems.items && <p className="field-err">{problems.items}</p>}
              </div>

              <div className="sums" aria-live="polite">
                <span>Subtotal</span><span>{fmtAmt(subtotal, currency)}</span>
                {effectiveDiscount > 0 && <><span>Discount</span><span>−{fmtAmt(effectiveDiscount, currency)}</span></>}
                <span>{taxLabel} {vatRate}%</span><span>{fmtAmt(vatAmt, currency)}</span>
                <span className="total">Total</span><span className="total">{fmtAmt(shownTotal, currency)}</span>
                {depositAmt > 0 && <><span>Deposit due now</span><span>{fmtAmt(depositAmt, currency)}</span></>}
              </div>
            </div>
          </section>

          {/* When */}
          <section className="sec" aria-labelledby="when-h">
            <h2 id="when-h">When is it due?</h2>
            <div className="sec-body">
              <div className="chips" role="group" aria-label="Payment due">
                {TERMS.map(t => (
                  <button key={t.days} type="button" className="chip press" aria-pressed={termDays === t.days} onClick={() => setTermDays(t.days)}>{t.label}</button>
                ))}
                <button type="button" className="chip press" aria-pressed={termDays === null} onClick={() => { setCustomDue(dueDate); setTermDays(null) }}>Pick a date</button>
              </div>
              <div className="grid2" style={{ marginTop: 14 }}>
                <div>
                  <label className="lbl" htmlFor="ni-issue-date">Issue date</label>
                  <input id="ni-issue-date" name="issue_date" className="in" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value || today())} />
                </div>
                {termDays === null && (
                  <div>
                    <label className="lbl" htmlFor="ni-due-date">Due date</label>
                    <input id="ni-due-date" name="due_date" className="in" type="date" min={issueDate} value={customDue} onChange={e => setCustomDue(e.target.value)} />
                  </div>
                )}
              </div>
              <p className="due-line">Due <b>{longDate(dueDate)}</b>{termDays !== null && termDays > 0 ? `, ${termDays} days after it’s issued.` : termDays === 0 ? ', as soon as they receive it.' : '.'}</p>
            </div>
          </section>

          {/* More */}
          <details className="sec" open={discountOn || depositOn || isRecurring || !!notes.trim() || undefined}>
            <summary>
              <span>
                <h2>More options</h2>
                <span className="sec-sub">{vatRate > 0 ? `${taxLabel} ${vatRate}%` : `No ${taxLabel}`} · {currency === 'P' ? 'Pula' : currency}{discountOn ? ' · discount' : ''}{depositOn ? ' · deposit' : ''}{isRecurring ? ` · repeats ${recurInterval}` : ''}</span>
              </span>
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>
            </summary>
            <div className="sec-body">
              <div className="opt">
                <span className="opt-l">VAT rate<small>Use 0 if you aren’t VAT registered.</small></span>
                <span className="opt-in"><input id="ni-vat-rate" name="vat_rate" className="in num" type="number" inputMode="decimal" min={0} max={100} step="0.1" value={vatRate} onChange={e => setVatRate(parseFloat(e.target.value) || 0)} aria-label="VAT rate in percent" />%</span>
              </div>
              <div className="opt">
                <span className="opt-l">Currency</span>
                <select id="ni-currency" name="currency" className="in" style={{ width: 220 }} value={currency} onChange={e => setCurrency(e.target.value)} aria-label="Currency">
                  {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                </select>
              </div>
              <div className="opt">
                <span className="opt-l">Discount<small>Taken off before VAT.</small></span>
                <span className="opt-in">
                  {discountOn && <input id="ni-discount-amt" name="discount_amt" className="in num" type="number" inputMode="decimal" min={0} value={discountAmt || ''} onChange={e => setDiscountAmt(Number(e.target.value) || 0)} aria-label="Discount amount" placeholder="0.00" />}
                  <button type="button" role="switch" aria-checked={discountOn} aria-label="Discount" className="switch" onClick={() => setDiscountOn(v => !v)} />
                </span>
              </div>
              <div className="opt">
                <span className="opt-l">Ask for a deposit<small>{depositOn ? `${fmtAmt(depositAmt, currency)} due now.` : 'Part of the total paid up front.'}</small></span>
                <span className="opt-in">
                  {depositOn && <><input id="ni-deposit-pct" name="deposit_pct" className="in num" style={{ width: 80 }} type="number" inputMode="numeric" min={1} max={100} value={depositPct} onChange={e => setDepositPct(Number(e.target.value) || 0)} aria-label="Deposit percent" />%</>}
                  <button type="button" role="switch" aria-checked={depositOn} aria-label="Deposit" className="switch" onClick={() => setDepositOn(v => !v)} />
                </span>
              </div>
              <div className="opt">
                <span className="opt-l">Repeat this invoice<small>{isRecurring ? 'A new draft is made for you each time.' : 'Handy for monthly fees.'}</small></span>
                <span className="opt-in">
                  {isRecurring && (
                    <select id="ni-recur-interval" name="recur_interval" className="in" style={{ width: 130 }} value={recurInterval} onChange={e => setRecurInterval(e.target.value as 'monthly' | 'quarterly' | 'yearly')} aria-label="How often">
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                  )}
                  <button type="button" role="switch" aria-checked={isRecurring} aria-label="Repeat this invoice" className="switch" onClick={() => setIsRecurring(v => !v)} />
                </span>
              </div>
              <div className="opt" style={{ display: 'block' }}>
                <label className="opt-l" htmlFor="ni-notes" style={{ display: 'block', marginBottom: 8 }}>Note on the invoice<small>Payment details, terms or a thank-you. It prints on the PDF.</small></label>
                <textarea id="ni-notes" name="notes" className="in" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Pay to FNB Botswana, account 62123456789. Reference: your child’s name." />
              </div>
            </div>
          </details>

          {/* Phone and tablet: total and Send stay in reach. */}
          <div className="bar">
            <div className="bar-total"><small>Total</small><b>{fmtAmt(shownTotal, currency)}</b></div>
            <button type="button" className="btn press" onClick={() => setPreviewOpen(true)}>Preview</button>
            <button type="button" className="btn primary press" onClick={() => handleSendClick('wa')} disabled={saving}>{saving ? 'Saving…' : 'Send'}</button>
          </div>
          {saveError && <div className="mob-err">{errorBox}</div>}
        </div>

        {/* Desktop: the live invoice and its actions. */}
        <aside className="ni-side" aria-label="Preview and send">
          <div className="side-head"><span>What {clientName.trim() ? firstName(clientName) : 'your client'} will receive</span></div>
          {paper}
          {tryMsg && <p className="side-err" role="alert">{problems.client || problems.items}</p>}
          {errorBox}
          <div className="side-actions">
            <button type="button" className="btn primary press" onClick={() => handleSendClick('wa')} disabled={saving}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 14l1.3-3.9A6 6 0 1 1 6.3 13L2 14z"/></svg>
              {saving ? 'Saving…' : sendLabel}
            </button>
            <button type="button" className="btn press" onClick={() => handleSendClick('email')} disabled={saving}>Send by email</button>
            <button type="button" className="btn press" onClick={handlePDF} disabled={saving}>View PDF</button>
          </div>
        </aside>
      </div>

      {/* Sheets render into <body> so no wrapper on the page can sit above them. */}
      {mounted && createPortal(<>
      {/* Phone preview sheet */}
      {previewOpen && (
        <div className="sheet-bg" onClick={() => setPreviewOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="pv-h" onClick={e => e.stopPropagation()}>
            <div className="sheet-head"><h2 id="pv-h">Preview</h2><button type="button" className="sheet-x" onClick={() => setPreviewOpen(false)} aria-label="Close">×</button></div>
            {paper}
            {tryMsg && <p className="side-err" role="alert" style={{ marginTop: 12 }}>{problems.client || problems.items}</p>}
            {errorBox && <div style={{ marginTop: 12 }}>{errorBox}</div>}
            <div className="side-actions" style={{ marginTop: 14 }}>
              <button type="button" className="btn primary press" onClick={() => handleSendClick('wa')} disabled={saving}>{saving ? 'Saving…' : sendLabel}</button>
              <button type="button" className="btn press" onClick={() => handleSendClick('email')} disabled={saving}>Send by email</button>
              <button type="button" className="btn press" onClick={handleDraft} disabled={saving}>Save draft</button>
            </div>
          </div>
        </div>
      )}

      {/* Send sheet */}
      {sendOpen && (
        <div className="sheet-bg" onClick={() => !sending && setSendOpen(false)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="send-h" onClick={e => e.stopPropagation()}>
            <div className="sheet-head">
              <h2 id="send-h">Send {savedInvNum ?? 'invoice'}</h2>
              <button type="button" className="sheet-x" onClick={() => setSendOpen(false)} aria-label="Close" disabled={sending}>×</button>
            </div>
            {sendDone ? (
              <div className="send-done" role="status">
                <svg width="22" height="22" viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="8" fill="#F2A900"/><path d="M5.2 9.1l2.6 2.6 5.1-5.6" fill="none" stroke="#1F2A44" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"/></svg>
                <span>{channel === 'email' ? 'Invoice sent!' : 'WhatsApp opened — tap send there'}<small>Taking you to the invoice…</small></span>
              </div>
            ) : pdfShared ? (
              <>
                <p className="send-to">PDF shared. Now send the message, so it shows under the PDF in <b>{clientName}</b>’s chat.</p>
                <label className="lbl" htmlFor="ni-send-phone2">Their WhatsApp number</label>
                <input id="ni-send-phone2" name="send_phone" className="in" type="tel" inputMode="tel" value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+267 71 234 567" />
                {sendError && <p className="field-err" role="alert">{sendError}</p>}
                <div className="sheet-actions">
                  <button type="button" className="btn ghost press" onClick={() => { setSendOpen(false); router.push(`/invoices/${savedInvoiceId}`) }}>Skip</button>
                  <button type="button" className="btn primary press" onClick={handleSend} disabled={!sendPhone.trim()}>Send the message</button>
                </div>
              </>
            ) : (
              <>
                <p className="send-to"><b>{fmtAmt(total - depositAmt, currency)}</b> to <b>{clientName}</b>{dueDate ? <>, due {fmtDate(dueDate)}</> : null}.</p>
                <div className="tabs" role="group" aria-label="Send with">
                  <button type="button" aria-pressed={channel === 'wa'} onClick={() => setChannel('wa')}>WhatsApp</button>
                  <button type="button" aria-pressed={channel === 'email'} onClick={() => setChannel('email')}>Email</button>
                </div>
                {channel === 'email' ? (
                  <>
                    <label className="lbl" htmlFor="ni-send-email">Their email</label>
                    <input id="ni-send-email" name="send_email" className="in" type="email" inputMode="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="e.g. kefilwe@gmail.com" autoFocus />
                  </>
                ) : sharing ? (
                  <p className="sec-sub" style={{ fontSize: 14 }}>Your phone’s share menu opens with the invoice PDF. Choose <b>WhatsApp</b>, then <b>{clientName}</b>{sendPhone ? <> ({sendPhone})</> : null}.</p>
                ) : (
                  <>
                    <label className="lbl" htmlFor="ni-send-phone">Their WhatsApp number</label>
                    <input id="ni-send-phone" name="send_phone" className="in" type="tel" inputMode="tel" value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+267 71 234 567" autoFocus />
                    <p className="sec-sub" style={{ marginTop: 6, fontSize: 13 }}>WhatsApp opens with the message ready. Tap send there.</p>
                  </>
                )}
                {sendError && <p className="field-err" role="alert">{sendError}</p>}
                <div className="sheet-actions">
                  <button type="button" className="btn ghost press" onClick={() => setSendOpen(false)} disabled={sending}>Not now</button>
                  <button type="button" className="btn primary press" onClick={handleSend}
                    disabled={sending || (channel === 'email' ? !sendEmail.trim() : pdf.preparing || (!pdf.file && !sendPhone.trim()))}>
                    {sending ? 'Sending…' : channel === 'email' ? 'Send email' : pdf.preparing ? 'Preparing PDF…' : pdf.file ? 'Share PDF' : 'Open in WhatsApp'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      </>, document.body)}
    </>
  )
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0]
}
