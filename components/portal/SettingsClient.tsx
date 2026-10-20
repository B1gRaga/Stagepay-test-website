'use client'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { THEME_PRESETS, THEME_ORDER, resolveTheme, type InvoiceTheme } from '@/lib/invoice-themes'
import { COUNTRIES, countryCode } from '@/lib/countries'
import { firmLines } from '@/lib/firm-details'
import { paymentBlocks, cleanMethod, KIND_LABEL, MAX_METHODS, type PaymentKind, type PaymentMethod } from '@/lib/payment-methods'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Profile = {
  name: string | null
  firm_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  country: string | null
  vat_number: string | null
  logo_url: string | null
  plan: string
  default_currency: string
  tax_label: string
  default_vat_rate: number
  two_fa_enabled: boolean
  invoice_theme: string | null
  brand_color_primary: string | null
  brand_color_header: string | null
  payment_methods?: unknown
  default_due_days?: number | null
}

type Panel = 'brand' | 'firm' | 'invoice' | 'payment' | 'notifs' | 'plan' | 'team' | 'security'

const PANELS: { id: Panel; label: string; businessOnly?: boolean }[] = [
  { id: 'brand',    label: 'Branding' },
  { id: 'firm',     label: 'Firm details' },
  { id: 'invoice',  label: 'Invoice defaults' },
  { id: 'payment',  label: 'Getting paid' },
  { id: 'notifs',   label: 'Notifications' },
  { id: 'plan',     label: 'Plan & billing' },
  { id: 'team',     label: 'Team members', businessOnly: true },
  { id: 'security', label: 'Security' },
]

// Payment terms offered for new invoices; the same choices as the New invoice form.
const TERM_CHOICES = [
  { days: 0,  label: 'On receipt' },
  { days: 7,  label: '7 days' },
  { days: 14, label: '14 days' },
  { days: 30, label: '30 days' },
]

function PanelHead({ title, sub }: { title: React.ReactNode; sub: React.ReactNode }) {
  return (
    <header className="panel-head">
      <h2>{title}</h2>
      <p>{sub}</p>
    </header>
  )
}


const CURRENCIES = [
  { v: 'P',    l: 'BWP — Pula (P)' },
  { v: 'R',    l: 'ZAR — Rand (R)' },
  { v: '$',    l: 'USD — Dollar ($)' },
  { v: '€',    l: 'EUR — Euro (€)' },
  { v: '£',    l: 'GBP — Pound (£)' },
  { v: 'KSh',  l: 'KES — Kenyan Shilling (KSh)' },
  { v: '₦',    l: 'NGN — Naira (₦)' },
  { v: 'GH₵',  l: 'GHS — Cedi (GH₵)' },
  { v: 'A$',   l: 'AUD — Australian Dollar (A$)' },
  { v: 'AED',  l: 'AED — Dirham' },
]

const SEC_RISKS = [
  { badge: 'fixed', title: 'XSS — stored cross-site scripting',         owasp: 'A03', desc: 'User-controlled strings are HTML-escaped via esc() before DOM insertion, preventing script injection.' },
  { badge: 'fixed', title: 'Brute force — no login rate limiting',      owasp: 'A07', desc: 'Login attempts are capped; after 5 failures the form locks for 10 minutes.' },
  { badge: 'fixed', title: 'Session hijacking — no inactivity timeout', owasp: 'A07', desc: 'Sessions auto-expire after the configured inactivity period.' },
  { badge: 'fixed', title: 'Weak auth — single-factor password only',   owasp: 'A07', desc: 'TOTP-based 2FA is available. When enabled, a code is required after every password login.' },
  { badge: 'high',  title: 'Plaintext passwords in memory',             owasp: 'A02', desc: 'Supabase handles auth server-side with bcrypt hashing. No plaintext passwords are stored.' },
  { badge: 'med',   title: 'Missing CSRF protection',                   owasp: 'A01', desc: 'All API routes use cookie-based sessions with SameSite protections via Supabase SSR.' },
  { badge: 'fixed', title: 'No Content Security Policy header',         owasp: 'A05', desc: 'CSP is enforced via next.config.js headers(), restricting script-src, frame-ancestors, and other directives.' },
]

const CSS = `
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes panelIn{from{opacity:0;transform:translateY(6px)}}

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 28px;background:var(--bg2);}
  .page-title{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--t1);}

  /* Frame: a quiet menu on the left, one panel at a time on the right */
  .settings-wrap{padding:24px 28px 48px;max-width:1180px;}
  .settings-layout{display:grid;grid-template-columns:200px minmax(0,1fr);gap:28px;align-items:start;}
  .settings-nav{position:sticky;top:24px;display:flex;flex-direction:column;gap:2px;}
  .settings-nav-item{display:flex;align-items:center;height:38px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:var(--t2);font:500 14px var(--font-manrope),sans-serif;text-align:left;cursor:pointer;transition:background-color var(--dur-1) var(--ease),color var(--dur-1) var(--ease);}
  .settings-nav-item:hover{color:var(--t1);background:color-mix(in srgb,var(--t1) 5%,transparent);}
  .settings-nav-item[aria-current="page"]{color:var(--t1);font-weight:700;background:var(--bg2);box-shadow:inset 3px 0 0 var(--g);}
  .settings-nav-item:focus-visible{outline:2px solid var(--g);outline-offset:2px;}
  .settings-panel{display:none;background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:28px 32px;}
  .settings-panel.active{display:block;animation:panelIn var(--dur-3) var(--ease) both;}
  @media (prefers-reduced-motion: reduce){.settings-panel.active{animation:none;}}

  .panel-head{margin:0 0 24px;padding-bottom:20px;border-bottom:1px solid var(--line);}
  .panel-head h2{font-size:20px;font-weight:700;letter-spacing:-.01em;color:var(--t1);}
  .panel-head p{font-size:14px;color:var(--t2);margin-top:4px;line-height:1.5;}

  /* Shared pieces for rebuilt panels */
  .fld{display:flex;flex-direction:column;gap:6px;}
  .fld label{font-size:13px;font-weight:600;color:var(--t1);}
  .help{font-size:12px;color:var(--t2);line-height:1.5;}
  .block > p.help{font-size:13px;margin-bottom:0;}
  .in{height:42px;width:100%;padding:0 12px;border-radius:8px;border:1px solid var(--line2);background:var(--bg);color:var(--t1);font:500 14px var(--font-manrope),sans-serif;outline:none;transition:border-color var(--dur-1) var(--ease);}
  .in:focus{border-color:var(--g);}
  .in::placeholder{color:var(--t3);}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  .grid2 .full{grid-column:1 / -1;}
  .block{margin-bottom:28px;}
  .block h3{font-size:15px;font-weight:700;color:var(--t1);margin-bottom:12px;}
  .block h3 + p{margin-top:-8px;}
  .block > p{font-size:14px;color:var(--t2);margin-bottom:16px;line-height:1.5;}
  .chips{display:flex;flex-wrap:wrap;gap:6px;}
  .chip{height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--line2);background:transparent;color:var(--t2);font:600 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .chip:hover{border-color:var(--t3);color:var(--t1);}
  .chip[aria-pressed="true"]{background:var(--t1);border-color:var(--t1);color:var(--bg2);}
  .chip:focus-visible,.save:focus-visible{outline:2px solid var(--g);outline-offset:2px;}
  .savebar{display:flex;align-items:center;gap:14px;padding-top:20px;border-top:1px solid var(--line);}
  .save{height:40px;padding:0 20px;border:0;border-radius:8px;background:var(--g);color:#1F2A44;font:700 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .save:hover{background:#FFB81C;}
  .save:disabled{opacity:.45;cursor:default;background:var(--g);}
  .save-note{font-size:13px;color:var(--t2);}
  .save-note.ok{color:var(--t1);font-weight:600;}
  .save-note.err{color:#DC4B3E;}
  .fld label .opt{font-weight:500;color:var(--t2);}

  .pay-layout{display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:24px;align-items:start;}
  .pay-preview{margin:0;position:sticky;top:24px;}
  .pay-preview figcaption{font-size:12px;font-weight:600;color:var(--t2);margin-bottom:8px;}
  .pp-card{background:#FFFFFF;color:#1F2A44;border-radius:10px;padding:16px 18px;border:1px solid rgba(31,42,68,.12);font-size:13px;}
  .pp-title{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;margin-bottom:8px;}
  .pp-row{display:flex;justify-content:space-between;gap:12px;padding:3px 0;}
  .pp-row span{color:#64748B;}
  .pp-row b{font-weight:600;text-align:right;font-variant-numeric:tabular-nums;word-break:break-word;}
  .pp-block{padding:6px 0;border-top:1px solid rgba(31,42,68,.08);}
  .pp-block:first-of-type{border-top:0;padding-top:0;}
  .pp-name{font-weight:700;margin-bottom:2px;}
  .pm-card{border:1px solid var(--line2);border-radius:10px;padding:16px;margin-bottom:12px;background:var(--bg2);animation:panelIn var(--dur-3) var(--ease) both;}
  .pm-head{display:flex;align-items:center;gap:10px;margin-bottom:14px;}
  .pm-head b{font-size:14px;color:var(--t1);}
  .pm-pref{font-size:12px;font-weight:600;color:var(--t2);padding:2px 8px;border-radius:6px;background:color-mix(in srgb,var(--t1) 7%,transparent);}
  .pm-link{border:0;background:none;padding:4px 0;font:600 13px var(--font-manrope),sans-serif;color:var(--t2);cursor:pointer;text-decoration:underline;text-decoration-color:var(--line2);text-underline-offset:3px;}
  .pm-link:hover{color:var(--t1);}
  .pm-remove{margin-left:auto;}
  .pm-link:focus-visible{outline:2px solid var(--g);outline-offset:2px;border-radius:4px;}
  .pm-hint{font-size:12px;color:var(--t2);margin-top:10px;}
  .pm-add{display:flex;flex-direction:column;gap:8px;padding:14px 0 0;}
  .pm-add > span{font-size:13px;font-weight:600;color:var(--t1);}
  .fp-label{font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#64748B;margin-bottom:6px;}
  .fp-name{font-size:17px;font-weight:800;line-height:1.25;}
  .fp-vat{font-size:12px;font-weight:600;color:#B07A00;margin-top:2px;}
  .fp-line{font-size:12px;color:#475569;margin-top:4px;line-height:1.45;word-break:break-word;}
  .in[readonly]{background:transparent;color:var(--t2);}
  select.in{appearance:auto;padding-right:8px;}
  .pp-total{margin-top:6px;padding-top:8px;border-top:1px solid rgba(31,42,68,.12);}
  .pp-total span{color:#1F2A44;font-weight:700;}
  .in-suffix{position:relative;display:block;}
  .in-suffix .in{padding-right:32px;}
  .in-suffix span{position:absolute;right:12px;top:50%;transform:translateY(-50%);color:var(--t2);font-weight:600;pointer-events:none;}
  .def-note{font-size:13px;line-height:1.5;color:var(--t1);padding:12px 14px;border-radius:8px;background:color-mix(in srgb,var(--g) 12%,transparent);}
  .pp-ref{margin-top:8px;font-size:12px;color:#64748B;line-height:1.5;}
  .pp-empty{font-size:13px;color:var(--t2);line-height:1.5;padding:16px;border:1px dashed var(--line2);border-radius:10px;}
  @media(max-width:1100px){.pay-layout{grid-template-columns:minmax(0,1fr);}.pay-preview{position:static;}}

  .settings-section{margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid var(--line);position:relative;}
  .settings-section:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}
  .settings-section::before{content:'';position:absolute;left:-32px;top:0;width:3px;height:0;background:var(--g);border-radius:0 2px 2px 0;transition:height .3s ease;}
  .settings-section:hover::before{height:100%;}
  .settings-section-title{font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:17px;letter-spacing:1.5px;color:var(--t1);margin-bottom:4px;display:flex;align-items:center;gap:10px;}
  .settings-section-badge{font-family:var(--font-archivo),sans-serif;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:3px;}
  .settings-section-desc{font-size:12px;color:var(--t3);margin-bottom:18px;line-height:1.6;}

  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .form-group{display:flex;flex-direction:column;gap:5px;}
  .form-group.full{grid-column:1/-1;}
  .form-label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);font-weight:600;}
  .form-input,.form-select,.form-textarea{
    background:var(--surface);border:1px solid var(--line2);
    border-radius:7px;padding:10px 12px;
    font-family:var(--font-archivo),sans-serif;font-weight:700;font-size:13px;color:var(--t1);
    outline:none;transition:border-color .2s, box-shadow .2s;width:100%;
  }
  .form-input:focus,.form-select:focus,.form-textarea:focus{
    border-color:rgba(242,169,0,.45);
    box-shadow:0 0 0 3px rgba(242,169,0,.07);
  }
  .form-textarea{resize:vertical;min-height:80px;}
  .form-select option,.form-select optgroup{background:var(--bg2);color:var(--t1);}

  .topbar-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid var(--line2);letter-spacing:.05em;text-transform:uppercase;font-family:var(--font-archivo),sans-serif;text-decoration:none;background:transparent;color:var(--t2);}
  .topbar-btn:hover{border-color:var(--g);color:var(--g);}
  .btn-primary{background:var(--g);color:var(--bg);border-color:var(--g);box-shadow:0 2px 8px rgba(242,169,0,.2);}
  .btn-primary:hover{background:#C98C00;border-color:#C98C00;color:var(--bg);}
  .btn-primary:disabled{opacity:.5;cursor:not-allowed;transform:none;}

  .notif-row{display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--line);}
  .notif-row:last-child{border-bottom:none;}
  .notif-label{font-size:13px;font-weight:500;color:var(--t1);}
  .notif-desc{font-size:11px;color:var(--t3);margin-top:2px;}
  .toggle-sw{width:36px;height:20px;border-radius:10px;background:var(--surface);border:1px solid var(--line2);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;}
  .toggle-sw.on{background:var(--g);border-color:var(--g);}
  .toggle-sw::after{content:'';position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:var(--t3);transition:transform .2s, background .2s;}
  .toggle-sw.on::after{transform:translateX(16px);background:#fff;}

  .sec-risk-row{display:grid;grid-template-columns:auto 1fr auto;gap:10px 14px;align-items:start;padding:10px 0;border-bottom:1px solid var(--line);}
  .sec-risk-row:last-child{border-bottom:none;}
  .sec-badge{font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 7px;border-radius:4px;white-space:nowrap;margin-top:2px;}
  .sec-badge-high  {background:rgba(245,158,11,.15);color:#F59E0B;border:1px solid rgba(245,158,11,.3);}
  .sec-badge-med   {background:rgba(59,130,246,.12);color:#3B82F6;border:1px solid rgba(59,130,246,.3);}
  .sec-badge-low   {background:rgba(100,116,139,.12);color:#94A3B8;border:1px solid rgba(100,116,139,.3);}
  .sec-badge-fixed {background:rgba(242,169,0,.12);color:#F2A900;border:1px solid rgba(242,169,0,.3);}

  .plan-card{background:var(--surface);border:1px solid var(--line2);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;}

  .logo-zone{
    border:2px dashed var(--line2);border-radius:10px;
    padding:28px;text-align:center;cursor:pointer;
    transition:border-color .2s;margin-bottom:4px;
  }
  .logo-zone:hover{border-color:rgba(242,169,0,.4);}
  .logo-zone-icon{font-size:22px;margin-bottom:8px;opacity:.5;}
  .logo-zone-label{font-size:13px;color:var(--t2);font-weight:500;}
  .logo-zone-sub{font-size:11px;color:var(--t3);margin-top:4px;}

  .success-toast{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(242,169,0,.15);border:1px solid rgba(242,169,0,.3);border-radius:6px;font-size:12px;color:#C98C00;font-weight:600;}

  .loading-spinner{display:flex;align-items:center;justify-content:center;padding:80px;gap:10px;color:var(--t3);font-size:13px;}

  @media(max-width:900px){
    .settings-layout{grid-template-columns:minmax(0,1fr);gap:14px;}
    .settings-nav{position:static;flex-direction:row;overflow-x:auto;scrollbar-width:none;margin:0 -16px;padding:0 16px;}
    .settings-nav::-webkit-scrollbar{display:none;}
    .settings-nav-item{flex:none;white-space:nowrap;}
    .settings-nav-item[aria-current="page"]{box-shadow:inset 0 -2px 0 var(--g);}
    .settings-panel{padding:20px 16px;}
    .settings-section::before{display:none;}
    .form-grid,.grid2{grid-template-columns:1fr;}
  }
  @media(max-width:768px){.topbar{padding:0 16px;}.mob-hide{display:none !important;}.settings-wrap{padding:16px 16px 32px;}}

  .brand-layout{display:grid;grid-template-columns:minmax(0,1fr) 420px;gap:28px;align-items:start;}
  .brand-preview{margin:0;position:sticky;top:24px;}
  .brand-preview figcaption{display:flex;justify-content:space-between;font-size:12px;font-weight:600;color:var(--t2);margin-bottom:8px;}
  .brand-preview .stage{background:#E9E5DC;border-radius:12px;padding:14px;}
  html:not([data-theme="light"]) .brand-preview .stage{background:#111827;}
  @media(max-width:1200px){.brand-layout{grid-template-columns:minmax(0,1fr);}.brand-preview{position:static;max-width:460px;}}

  .logo-row{display:flex;align-items:center;gap:16px;}
  .logo-tile{flex:none;width:72px;height:72px;border-radius:50%;display:grid;place-items:center;overflow:hidden;border:1px solid var(--line2);}
  .logo-tile img{width:100%;height:100%;object-fit:contain;}
  .logo-tile .ph{font-size:12px;font-weight:600;}
  .logo-actions{display:flex;flex-direction:column;gap:6px;min-width:0;}
  .logo-actions .btns{display:flex;gap:14px;align-items:center;}
  .btn-line{height:36px;padding:0 14px;border-radius:8px;border:1px solid var(--line2);background:transparent;color:var(--t1);font:600 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .btn-line:hover{border-color:var(--t3);}
  .btn-line:disabled{opacity:.5;cursor:progress;}
  .btn-line:focus-visible{outline:2px solid var(--g);outline-offset:2px;}

  .theme-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(112px,1fr));gap:10px;}
  @media(max-width:700px){.theme-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
  .theme-card{display:block;width:100%;padding:0;border:1px solid var(--line2);border-radius:10px;overflow:hidden;background:var(--bg2);cursor:pointer;text-align:left;transition:border-color var(--dur-1) var(--ease),transform var(--dur-1) var(--ease);}
  .theme-card:hover{border-color:var(--t3);}
  .theme-card:active{transform:scale(.98);}
  .theme-card[aria-pressed="true"]{border-color:var(--t1);box-shadow:inset 0 0 0 1px var(--t1);}
  .theme-card:focus-visible{outline:2px solid var(--g);outline-offset:2px;}
  .theme-card-name{display:flex;align-items:center;gap:6px;padding:8px 10px;font-size:13px;font-weight:500;color:var(--t2);border-top:1px solid var(--line);}
  .theme-card[aria-pressed="true"] .theme-card-name{color:var(--t1);font-weight:700;}

  .color-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
  @media(max-width:900px){.color-fields{grid-template-columns:1fr;}}
  .color-in{display:flex;align-items:center;gap:10px;}
  .color-in input[type="color"]{flex:none;width:42px;height:42px;padding:3px;border-radius:8px;border:1px solid var(--line2);background:var(--bg);cursor:pointer;}
  .color-in .in{font-variant-numeric:tabular-nums;text-transform:uppercase;}
`

function BrandingColorField({
  id, label, value, fallback, onChange
}: {
  id: string
  label: string
  value: string
  fallback: string
  onChange: (v: string) => void
}) {
  const isValid = /^#[0-9a-f]{6}$/i.test(value)
  return (
    <div className="fld">
      <label htmlFor={id}>{label}</label>
      <div className="color-in">
        <input type="color" aria-label={`${label}, colour picker`} value={isValid ? value : fallback} onChange={e => onChange(e.target.value.toUpperCase())} />
        <input id={id} name={id} className="in" value={value} placeholder={fallback} maxLength={7} spellCheck={false} autoComplete="off" onChange={e => onChange(e.target.value)} />
      </div>
      <span className="help">
        {!value ? 'The template’s own colour.'
          : !isValid ? 'Use a hex colour like #F2A900.'
          : <>Your colour. <button type="button" className="pm-link" onClick={() => onChange('')}>Use the template’s</button></>}
      </span>
    </div>
  )
}

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
function sampleDate(d: Date) {
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

// A small copy of the invoice PDF, drawn from the account's real details
// with a sample client and items, so template changes can be judged at a glance.
function InvoicePreviewMock({ theme: t, logoUrl, firm, taxLabel, vatRate, currency, dueDays, payBlocks: blocks }: {
  theme: InvoiceTheme
  logoUrl: string | null | undefined
  firm: { name: string; address: string; contact: string; vat: string }
  taxLabel: string
  vatRate: number
  currency: string
  dueDays: number
  payBlocks: { title: string; rows: [string, string][] }[]
}) {
  const fw = (n: number) => ({ fontWeight: n } as const)
  const uc = { textTransform: 'uppercase' as const }
  const money = (n: number) => `${currency}${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const today = new Date()
  const due = new Date(today.getTime() + dueDays * 86400000)
  const number = `INV-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}-001`
  const items = [
    { desc: 'Lessons, 1 hour each', qty: 4, rate: 250 },
    { desc: 'Study materials', qty: 1, rate: 150 },
  ]
  const subtotal = items.reduce((s, i) => s + i.qty * i.rate, 0)
  const vat = subtotal * vatRate / 100
  const name = firm.name || 'Your business name'
  const meta: [string, string][] = [
    ['Issue date', sampleDate(today)],
    ['Due date', dueDays === 0 ? 'On receipt' : sampleDate(due)],
    ['Terms', dueDays === 0 ? 'On receipt' : `Net ${dueDays} days`],
    ['Status', 'Sent'],
  ]
  return (
    <div aria-hidden="true" style={{ background: t.pageBg, borderRadius: 6, overflow: 'hidden', fontFamily: 'Arial,sans-serif', width: '100%', fontSize: 9, color: t.bodyText }}>
      {/* Header */}
      <div style={{ background: t.headerBg, padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {logoUrl
            ? <img src={logoUrl} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'contain', flex: 'none' }} />
            : <div style={{ width: 30, height: 30, borderRadius: '50%', background: t.accentColor, flex: 'none' }} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ color: t.headerFirmColor, ...fw(700), fontSize: 13, lineHeight: 1.15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
            {firm.vat && <div style={{ color: t.accentColor, fontSize: 7.5, marginTop: 2 }}>{firm.vat}</div>}
            {firm.address && <div style={{ color: t.headerSubColor, fontSize: 6.5, marginTop: 2 }}>{firm.address}</div>}
            {firm.contact && <div style={{ color: t.headerSubColor, fontSize: 6.5, marginTop: 1 }}>{firm.contact}</div>}
          </div>
        </div>
        <div style={{ textAlign: 'right', flex: 'none' }}>
          <div style={{ color: t.invoiceLabelColor, ...fw(700), fontSize: 20, letterSpacing: 1.5 }}>INVOICE</div>
          <div style={{ color: t.headerSubColor, fontSize: 7.5, marginTop: 1 }}>{number}</div>
        </div>
      </div>

      <div style={{ padding: '10px 14px 12px' }}>
        {/* Meta */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {meta.map(([l, v]) => (
            <div key={l} style={{ flex: 1, background: t.metaCardBg, border: t.metaCardBorder ? `1px solid ${t.metaCardBorder}` : undefined, borderRadius: 4, padding: '4px 6px' }}>
              <div style={{ fontSize: 5.5, color: '#64748B', ...uc, letterSpacing: .4 }}>{l}</div>
              <div style={{ fontSize: 7.5, ...fw(700), marginTop: 1 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* From / Bill to */}
        <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
          {[['From', name, firm.address], ['Bill to', 'Sample client', 'client@email.com']].map(([lbl, n, line]) => (
            <div key={lbl} style={{ flex: 1, background: t.boxBg, padding: '5px 7px', borderRadius: 4, minWidth: 0 }}>
              <div style={{ color: t.accentColor, fontSize: 6, ...fw(700), ...uc, letterSpacing: .6, marginBottom: 2 }}>{lbl}</div>
              <div style={{ ...fw(700), fontSize: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n}</div>
              {line && <div style={{ color: '#64748B', fontSize: 6.5, marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{line}</div>}
            </div>
          ))}
        </div>

        {/* Items */}
        <div style={{ background: t.tableHeadBg, padding: '4px 7px', display: 'flex', borderRadius: '3px 3px 0 0' }}>
          {(['Description', 'Qty', 'Amount'] as const).map((h, i) => (
            <span key={h} style={{ flex: i === 0 ? 4 : i === 1 ? 1 : 1.6, color: t.tableHeadText, fontSize: 7, ...fw(700), textAlign: i ? 'right' : 'left' }}>{h}</span>
          ))}
        </div>
        {items.map((it, i) => (
          <div key={it.desc} style={{ padding: '4px 7px', display: 'flex', background: i % 2 ? t.tableRowAltBg : t.pageBg, borderBottom: `1px solid ${t.lineColor}` }}>
            <span style={{ flex: 4, fontSize: 7.5 }}>{it.desc}</span>
            <span style={{ flex: 1, fontSize: 7.5, color: '#64748B', textAlign: 'right' }}>{it.qty}</span>
            <span style={{ flex: 1.6, fontSize: 7.5, textAlign: 'right' }}>{money(it.qty * it.rate)}</span>
          </div>
        ))}

        {/* Totals */}
        <div style={{ marginLeft: 'auto', width: '56%', marginTop: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7.5, padding: '1px 0' }}><span style={{ color: '#64748B' }}>Subtotal</span><span>{money(subtotal)}</span></div>
          {vatRate > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7.5, padding: '1px 0' }}><span style={{ color: '#64748B' }}>{taxLabel} ({vatRate}%)</span><span>{money(vat)}</span></div>}
          <div style={{ background: t.grandRowBg, color: t.grandRowText, borderRadius: 5, padding: '4px 8px', marginTop: 5, display: 'flex', justifyContent: 'space-between', ...fw(700) }}>
            <span style={{ fontSize: 7.5 }}>TOTAL DUE</span><span style={{ fontSize: 10 }}>{money(subtotal + vat)}</span>
          </div>
        </div>

        {/* Payment details */}
        {blocks.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 6.5, ...fw(700), ...uc, letterSpacing: .5, marginBottom: 3 }}>Payment details</div>
            {blocks.map((b, i) => (
              <div key={i} style={{ fontSize: 7, lineHeight: 1.5 }}>
                <b>{b.title}</b>{'  '}<span style={{ color: '#475569' }}>{b.rows.map(([l, v]) => `${l}: ${v}`).join('  ·  ')}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ background: t.footerBg, padding: '6px 14px', display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: t.footerBrandColor, fontSize: 6, ...fw(700) }}>STAGEPAY</span>
        <span style={{ color: t.footerTextColor, fontSize: 6 }}>Page 1 of 1 · {number}</span>
      </div>
    </div>
  )
}

export function SettingsClient({ initialProfile = null }: { initialProfile?: Profile | null }) {
  const [profile, setProfile]   = useState<Profile | null>(initialProfile)
  const [loading, setLoading]   = useState(initialProfile === null)
  const [panel,   setPanel]     = useState<Panel>('brand')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState<Panel | null>(null)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  // Team state
  type TeamMember = { id: string; email: string; status: 'pending' | 'active'; invited_at: string; joined_at: string | null; invite_token: string | null }
  const [teamMembers, setTeamMembers]     = useState<TeamMember[]>([])
  const [teamLoaded,  setTeamLoaded]      = useState(false)
  const [inviteEmail, setInviteEmail]     = useState('')
  const [inviteLink,  setInviteLink]      = useState<string | null>(null)
  const [inviting,    setInviting]        = useState(false)
  const [inviteError, setInviteError]     = useState('')
  const [removingId,  setRemovingId]      = useState<string | null>(null)
  const [copiedId,    setCopiedId]        = useState<string | null>(null)

  // 2FA enroll modal state
  const [mfaModal,   setMfaModal]   = useState<null | 'enroll' | 'unenroll'>(null)
  const [mfaQr,      setMfaQr]      = useState('')
  const [mfaSecret,  setMfaSecret]  = useState('')
  const [mfaFactorId,setMfaFactorId]= useState('')
  const [mfaCode,    setMfaCode]    = useState('')
  const [mfaBusy,    setMfaBusy]    = useState(false)
  const [mfaError,   setMfaError]   = useState('')

  const searchParams = useSearchParams()
  const billingStatus = searchParams.get('billing')
  const billingPlan   = searchParams.get('plan')

  // ?panel=payment opens that panel; coming back from a plan payment opens Plan & billing.
  useEffect(() => {
    const want = billingStatus ? 'plan' : searchParams.get('panel')
    if (want && PANELS.some(p => p.id === want)) setPanel(want as Panel)
  }, [billingStatus, searchParams])

  // On phones the menu is a sideways row; keep the open panel's tab in view.
  useEffect(() => {
    document.querySelector('.settings-nav-item[aria-current="page"]')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [panel])

  // Branding state
  const brandFrom = (p: Profile | null) => ({
    invoice_theme:       p?.invoice_theme       ?? 'dark-modern',
    brand_color_primary: p?.brand_color_primary ?? '',
    brand_color_header:  p?.brand_color_header  ?? '',
  })
  const [branding, setBranding] = useState(() => brandFrom(initialProfile))
  const [brandError, setBrandError] = useState('')
  const savedBrand = brandFrom(profile)
  const hexOk = (v: string) => v === '' || /^#[0-9a-f]{6}$/i.test(v)
  const brandValid = hexOk(branding.brand_color_primary) && hexOk(branding.brand_color_header)
  const brandDirty = branding.invoice_theme !== savedBrand.invoice_theme
    || branding.brand_color_primary.toUpperCase() !== savedBrand.brand_color_primary.toUpperCase()
    || branding.brand_color_header.toUpperCase() !== savedBrand.brand_color_header.toUpperCase()
  const brandTheme = resolveTheme(
    branding.invoice_theme,
    /^#[0-9a-f]{6}$/i.test(branding.brand_color_primary) ? branding.brand_color_primary : null,
    /^#[0-9a-f]{6}$/i.test(branding.brand_color_header)  ? branding.brand_color_header  : null,
  )

  async function saveBrand() {
    setBrandError('')
    const ok = await save({
      invoice_theme:       branding.invoice_theme,
      brand_color_primary: branding.brand_color_primary.toUpperCase() || null,
      brand_color_header:  branding.brand_color_header.toUpperCase()  || null,
    }, 'brand')
    if (!ok) setBrandError('Couldn’t save. Check your connection and try again.')
  }
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError,     setLogoError]     = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Firm details form state. Older profiles store the country's name, so it's read as a code.
  const firmFrom = (p: Profile | null) => ({
    name:       p?.name       ?? '',
    firm_name:  p?.firm_name  ?? '',
    phone:      p?.phone      ?? '',
    address:    p?.address    ?? '',
    city:       p?.city       ?? '',
    country:    countryCode(p?.country) || 'BW',
    vat_number: p?.vat_number ?? '',
  })
  const [firm, setFirm] = useState(() => firmFrom(initialProfile))
  const [firmError, setFirmError] = useState('')
  const savedFirm = firmFrom(profile)
  const firmDirty = (Object.keys(firm) as (keyof typeof firm)[]).some(k => firm[k].trim() !== savedFirm[k].trim())
  const firmPreview = firmLines({ ...firm, email: profile?.email })

  async function saveFirm() {
    setFirmError('')
    const fields = Object.fromEntries(Object.entries(firm).map(([k, v]) => [k, v.trim()]))
    const ok = await save(fields, 'firm')
    if (!ok) setFirmError('Couldn’t save. Check your connection and try again.')
  }

  // Invoice defaults form state
  const invFrom = (p: Profile | null) => ({
    default_currency: p?.default_currency ?? 'P',
    default_vat_rate: String(Number(p?.default_vat_rate ?? 14)),
    tax_label:        p?.tax_label ?? 'VAT',
  })
  const [inv, setInv] = useState(() => invFrom(initialProfile))
  const [invError, setInvError] = useState('')
  const rateNum = Number(inv.default_vat_rate)
  const vatOn = inv.default_vat_rate.trim() !== '0' && rateNum !== 0
  const invValid = inv.default_vat_rate.trim() !== '' && Number.isFinite(rateNum) && rateNum >= 0 && rateNum <= 100
  // The rate to go back to when VAT is switched off and on again.
  const lastRate = useRef(vatOn ? inv.default_vat_rate : '14')
  const savedInv = invFrom(profile)
  const invDirty = inv.default_currency !== savedInv.default_currency
    || rateNum !== Number(savedInv.default_vat_rate)
    || (inv.tax_label.trim() || 'VAT') !== savedInv.tax_label
  const fmtSample = (n: number) => `${inv.default_currency}${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  async function saveInv() {
    setInvError('')
    const ok = await save({ default_currency: inv.default_currency, default_vat_rate: rateNum, tax_label: inv.tax_label.trim() || 'VAT' }, 'invoice')
    if (!ok) setInvError('Couldn’t save. Check your connection and try again.')
  }

  // Getting paid: the ways clients can pay, and the default payment terms
  const methodKey = useRef(0)
  const methodsFrom = (p: Profile | null) =>
    (Array.isArray(p?.payment_methods) ? p.payment_methods as PaymentMethod[] : []).map(m => ({ ...m, key: methodKey.current++ }))
  const [methods, setMethods] = useState(() => methodsFrom(initialProfile))
  const [terms, setTerms] = useState(initialProfile?.default_due_days ?? 30)
  const [payError, setPayError] = useState('')
  const cleanList = (list: PaymentMethod[]) => JSON.stringify(list.map(cleanMethod).filter(Boolean))
  const payDirty = terms !== (profile?.default_due_days ?? 30)
    || cleanList(methods) !== cleanList(Array.isArray(profile?.payment_methods) ? profile.payment_methods as PaymentMethod[] : [])
  const payPreview = paymentBlocks(methods)

  function addMethod(kind: PaymentKind) {
    setMethods(list => [...list, { kind, key: methodKey.current++ }])
    // Put the cursor in the new method's first field.
    requestAnimationFrame(() => (document.querySelector('.pm-card:last-of-type input') as HTMLInputElement | null)?.focus())
  }
  function updateMethod(key: number, patch: Partial<PaymentMethod>) {
    setMethods(list => list.map(m => m.key === key ? { ...m, ...patch } : m))
  }

  async function savePay() {
    setPayError('')
    const ok = await save({
      payment_methods:  methods.map(cleanMethod).filter(Boolean),
      default_due_days: terms,
    }, 'payment')
    if (!ok) setPayError('Couldn’t save. Check your connection and try again.')
  }

  // Notification toggles (local only for now)
  const [notifs, setNotifs] = useState({ viewed: true, paid: true, overdue: true, reminder: false, weekly: true })

  useEffect(() => {
    // Skip if the server already provided initial profile data.
    if (initialProfile !== null) return
    fetch('/api/profile', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const p: Profile = d.profile
        setProfile(p)
        setBranding({
          invoice_theme:       p.invoice_theme       ?? 'dark-modern',
          brand_color_primary: p.brand_color_primary ?? '',
          brand_color_header:  p.brand_color_header  ?? '',
        })
        setFirm(firmFrom(p))
        setInv({
          default_currency: p.default_currency ?? 'P',
          default_vat_rate: String(p.default_vat_rate ?? 14),
          tax_label:        p.tax_label ?? 'VAT',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [initialProfile])

  async function save(fields: Record<string, unknown>, panelId: Panel) {
    setSaving(true)
    try {
      const res  = await fetch('/api/profile', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(fields) })
      const data = await res.json()
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, ...data.profile } : data.profile)
        setSaved(panelId)
        setTimeout(() => setSaved(null), 2500)
        return true
      }
      return false
    } catch {
      return false
    } finally {
      setSaving(false)
    }
  }

  async function uploadLogo(file: File) {
    setLogoError('')
    setLogoUploading(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res  = await fetch('/api/profile/logo', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, logo_url: data.logo_url } : prev)
      } else {
        setLogoError(data.error ?? 'Upload failed')
      }
    } catch {
      setLogoError('Network error')
    } finally {
      setLogoUploading(false)
    }
  }

  async function removeLogo() {
    setLogoError('')
    setLogoUploading(true)
    try {
      const res = await fetch('/api/profile/logo', { method: 'DELETE', credentials: 'include' })
      if (res.ok) setProfile(prev => prev ? { ...prev, logo_url: null } : prev)
    } catch {
      setLogoError('Network error')
    } finally {
      setLogoUploading(false)
    }
  }

  async function upgradePlan(plan: 'pro' | 'business') {
    setUpgrading(plan)
    try {
      const res  = await fetch('/api/billing/checkout', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) })
      const data = await res.json()
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        alert(data.error ?? 'Could not initiate payment. Please try again.')
        setUpgrading(null)
      }
    } catch {
      alert('Network error. Please try again.')
      setUpgrading(null)
    }
  }

  async function fetchTeamMembers() {
    const res = await fetch('/api/team/members', { credentials: 'include' })
    if (res.ok) {
      const data = await res.json()
      setTeamMembers(data.members ?? [])
    }
    setTeamLoaded(true)
  }

  async function sendInvite() {
    if (!inviteEmail.trim()) return
    setInviting(true); setInviteError(''); setInviteLink(null)
    const res = await fetch('/api/team/invite', {
      method: 'POST', credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: inviteEmail.trim() }),
    })
    const data = await res.json()
    if (res.ok) {
      setInviteLink(data.inviteUrl)
      setInviteEmail('')
      fetchTeamMembers()
    } else {
      setInviteError(data.error ?? 'Failed to create invite')
    }
    setInviting(false)
  }

  async function removeMember(memberId: string) {
    setRemovingId(memberId)
    const res = await fetch('/api/team/remove', {
      method: 'POST', credentials: 'include',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ memberId }),
    })
    if (res.ok) {
      setTeamMembers(prev => prev.filter(m => m.id !== memberId))
    }
    setRemovingId(null)
  }

  function copyLink(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  async function startEnroll2FA() {
    setMfaError(''); setMfaBusy(true)
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'StagePay', friendlyName: 'Authenticator' })
      if (error || !data) { setMfaError(error?.message ?? 'Enroll failed'); return }
      setMfaFactorId(data.id)
      setMfaQr(data.totp.qr_code)
      setMfaSecret(data.totp.secret)
      setMfaModal('enroll')
    } finally {
      setMfaBusy(false)
    }
  }

  async function confirmEnroll2FA() {
    if (mfaCode.length !== 6) return
    setMfaError(''); setMfaBusy(true)
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (cErr || !challenge) { setMfaError(cErr?.message ?? 'Challenge failed'); return }
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.id, code: mfaCode })
      if (vErr) { setMfaError('Invalid code, try again'); return }
      setProfile(prev => prev ? { ...prev, two_fa_enabled: true } : prev)
      setMfaModal(null); setMfaCode('')
    } finally {
      setMfaBusy(false)
    }
  }

  async function unenroll2FA() {
    setMfaError(''); setMfaBusy(true)
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      const totp = factors?.totp?.[0]
      if (totp) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: totp.id })
        if (error) { setMfaError(error.message); return }
      }
      setProfile(prev => prev ? { ...prev, two_fa_enabled: false } : prev)
      setMfaModal(null)
    } finally {
      setMfaBusy(false)
    }
  }



  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="topbar"><h1 className="page-title">Settings</h1></div>
      <div className="loading-spinner">
        <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.1)', borderTopColor: 'var(--g)', animation: 'spin .7s linear infinite', display: 'inline-block' }}/>
        Loading settings…
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="topbar"><h1 className="page-title">Settings</h1></div>

      <div className="settings-wrap">
        <div className="settings-layout">
          {/* Left nav */}
          <nav className="settings-nav" aria-label="Settings sections">
            {PANELS.filter(p => !p.businessOnly || profile?.plan === 'business').map(p => (
              <button
                key={p.id}
                type="button"
                className="settings-nav-item"
                aria-current={panel === p.id ? 'page' : undefined}
                onClick={() => {
                  setPanel(p.id)
                  if (p.id === 'team' && !teamLoaded) fetchTeamMembers()
                }}
              >
                {p.label}
              </button>
            ))}
          </nav>

          {/* ── BRANDING ── */}
          <div className={`settings-panel${panel === 'brand' ? ' active' : ''}`}>
            <PanelHead title="Branding" sub="How your invoices look: your logo, a template and its colours." />

            <div className="brand-layout">
              <div>
                <section className="block" aria-labelledby="br-logo">
                  <h3 id="br-logo">Logo</h3>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    hidden
                    aria-label="Choose a logo image"
                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }}
                  />
                  <div className="logo-row">
                    <div className="logo-tile" style={{ background: brandTheme.headerBg }} title="On your invoice header">
                      {profile?.logo_url
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <img src={profile.logo_url} alt="Your logo" />
                        : <span className="ph" style={{ color: brandTheme.headerSubColor }}>No logo</span>}
                    </div>
                    <div className="logo-actions">
                      <div className="btns">
                        <button type="button" className="btn-line press" disabled={logoUploading} onClick={() => logoInputRef.current?.click()}>
                          {logoUploading ? 'Uploading…' : profile?.logo_url ? 'Replace' : 'Upload a logo'}
                        </button>
                        {profile?.logo_url && !logoUploading && (
                          <button type="button" className="pm-link" onClick={removeLogo}>Remove</button>
                        )}
                      </div>
                      <span className="help">PNG, JPG or WebP, up to 2 MB. It sits in a circle on the header, so a square logo works best. Saved as soon as it uploads.</span>
                      {logoError && <span className="save-note err" role="alert">{logoError}</span>}
                    </div>
                  </div>
                </section>

                <section className="block" aria-labelledby="br-tpl">
                  <h3 id="br-tpl">Template</h3>
                  <div className="theme-grid" role="group" aria-label="Invoice template">
                    {THEME_ORDER.map(id => {
                      const t = resolveTheme(id, hexOk(branding.brand_color_primary) ? branding.brand_color_primary || null : null, hexOk(branding.brand_color_header) ? branding.brand_color_header || null : null)
                      return (
                        <button
                          key={id}
                          type="button"
                          className="theme-card"
                          aria-pressed={branding.invoice_theme === id}
                          onClick={() => setBranding(p => ({ ...p, invoice_theme: id }))}
                        >
                          <div style={{ background: t.pageBg }} aria-hidden="true">
                            <div style={{ background: t.headerBg, height: 26, padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ width: 28, height: 5, background: t.headerFirmColor, borderRadius: 1 }}/>
                                <div style={{ width: 18, height: 3, background: t.headerSubColor, borderRadius: 1, opacity: .6 }}/>
                              </div>
                              <div style={{ width: 22, height: 5, background: t.invoiceLabelColor, borderRadius: 1 }}/>
                            </div>
                            <div style={{ padding: '5px 6px 6px' }}>
                              <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                                <div style={{ flex: 1, height: 12, background: t.boxBg, borderRadius: 1, border: `1px solid ${t.lineColor}` }}/>
                                <div style={{ flex: 1, height: 12, background: t.boxBg, borderRadius: 1, border: `1px solid ${t.lineColor}` }}/>
                              </div>
                              <div style={{ height: 7, background: t.tableHeadBg, borderRadius: 1, marginBottom: 1 }}/>
                              <div style={{ height: 5, background: t.pageBg, borderBottom: `1px solid ${t.lineColor}` }}/>
                              <div style={{ height: 5, background: t.tableRowAltBg, borderBottom: `1px solid ${t.lineColor}` }}/>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 3 }}>
                                <div style={{ width: '45%', height: 9, background: t.grandRowBg, borderRadius: 2 }}/>
                              </div>
                            </div>
                          </div>
                          <span className="theme-card-name">{t.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className="block" aria-labelledby="br-col">
                  <h3 id="br-col">Colours</h3>
                  <p>Optional. Swap the template’s accent or header colour for your brand’s.</p>
                  <div className="color-fields">
                    <BrandingColorField
                      id="br-accent"
                      label="Accent"
                      value={branding.brand_color_primary}
                      fallback={THEME_PRESETS[branding.invoice_theme]?.accentColor ?? '#F2A900'}
                      onChange={v => setBranding(p => ({ ...p, brand_color_primary: v }))}
                    />
                    <BrandingColorField
                      id="br-header"
                      label="Header"
                      value={branding.brand_color_header}
                      fallback={THEME_PRESETS[branding.invoice_theme]?.headerBg ?? '#1F2A44'}
                      onChange={v => setBranding(p => ({ ...p, brand_color_header: v }))}
                    />
                  </div>
                </section>
              </div>

              <figure className="brand-preview">
                <figcaption><span>Your next invoice</span><span>Sample client and items</span></figcaption>
                <div className="stage">
                  <InvoicePreviewMock
                    theme={brandTheme}
                    logoUrl={profile?.logo_url}
                    firm={firmLines({ ...firm, email: profile?.email })}
                    taxLabel={inv.tax_label.trim() || 'VAT'}
                    vatRate={vatOn ? rateNum : 0}
                    currency={inv.default_currency}
                    dueDays={terms}
                    payBlocks={payPreview}
                  />
                </div>
              </figure>
            </div>

            <div className="savebar">
              <button type="button" className="save press" disabled={!brandDirty || !brandValid || saving} onClick={saveBrand}>{saving ? 'Saving…' : 'Save'}</button>
              {saved === 'brand' ? <span className="save-note ok" role="status">Saved</span>
                : brandError ? <span className="save-note err" role="alert">{brandError}</span>
                : !brandValid ? <span className="save-note err">Fix the colour first: use a hex value like #F2A900.</span>
                : brandDirty ? <span className="save-note">Unsaved changes</span> : null}
            </div>
          </div>

          {/* ── FIRM DETAILS ── */}
          <div className={`settings-panel${panel === 'firm' ? ' active' : ''}`}>
            <PanelHead title="Firm details" sub="Who the invoice is from. This prints at the top of every invoice you send." />

            <div className="pay-layout">
              <div>
                <section className="block" aria-labelledby="firm-who">
                  <h3 id="firm-who">Business</h3>
                  <div className="grid2">
                    <div className="fld full">
                      <label htmlFor="s-firm-name">Business name</label>
                      <input id="s-firm-name" name="firm_name" className="in" autoComplete="organization" value={firm.firm_name} onChange={e => setFirm(p => ({ ...p, firm_name: e.target.value }))} />
                    </div>
                    <div className="fld full">
                      <label htmlFor="s-name">Your name</label>
                      <input id="s-name" name="name" className="in" autoComplete="name" value={firm.name} onChange={e => setFirm(p => ({ ...p, name: e.target.value }))} />
                      <span className="help">Shown instead when there’s no business name.</span>
                    </div>
                  </div>
                </section>

                <section className="block" aria-labelledby="firm-contact">
                  <h3 id="firm-contact">Contact</h3>
                  <div className="grid2">
                    <div className="fld">
                      <label htmlFor="s-email">Email</label>
                      <input id="s-email" name="email" className="in" value={profile?.email ?? ''} readOnly aria-describedby="s-email-help" />
                      <span className="help" id="s-email-help">The email you sign in with.</span>
                    </div>
                    <div className="fld">
                      <label htmlFor="s-phone">Phone</label>
                      <input id="s-phone" name="phone" className="in" type="tel" autoComplete="tel" value={firm.phone} onChange={e => setFirm(p => ({ ...p, phone: e.target.value }))} />
                    </div>
                  </div>
                </section>

                <section className="block" aria-labelledby="firm-where">
                  <h3 id="firm-where">Address</h3>
                  <div className="grid2">
                    <div className="fld full">
                      <label htmlFor="s-address">Street address</label>
                      <input id="s-address" name="address" className="in" autoComplete="street-address" value={firm.address} onChange={e => setFirm(p => ({ ...p, address: e.target.value }))} />
                    </div>
                    <div className="fld">
                      <label htmlFor="s-city">City or town</label>
                      <input id="s-city" name="city" className="in" autoComplete="address-level2" value={firm.city} onChange={e => setFirm(p => ({ ...p, city: e.target.value }))} />
                    </div>
                    <div className="fld">
                      <label htmlFor="s-country">Country</label>
                      <select id="s-country" name="country" className="in" value={firm.country} onChange={e => setFirm(p => ({ ...p, country: e.target.value }))}>
                        {!COUNTRIES.some(c => c.code === firm.country) && firm.country && <option value={firm.country}>{firm.country}</option>}
                        {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
                </section>

                <section className="block" aria-labelledby="firm-tax">
                  <h3 id="firm-tax">Tax</h3>
                  <div className="grid2">
                    <div className="fld full">
                      <label htmlFor="s-vat">VAT number</label>
                      <input id="s-vat" name="vat_number" className="in" autoComplete="off" value={firm.vat_number} onChange={e => setFirm(p => ({ ...p, vat_number: e.target.value.toUpperCase() }))} />
                      <span className="help">Only if you’re registered for VAT. Prints as “VAT No”.</span>
                    </div>
                  </div>
                </section>
              </div>

              <figure className="pay-preview" aria-label="How it appears on your invoices">
                <figcaption>On your invoices</figcaption>
                <div className="pp-card fp-card">
                  <div className="fp-label">From</div>
                  <div className="fp-name">{firmPreview.name || 'Your business name'}</div>
                  {firmPreview.vat && <div className="fp-vat">{firmPreview.vat}</div>}
                  {firmPreview.address && <div className="fp-line">{firmPreview.address}</div>}
                  {firmPreview.contact && <div className="fp-line">{firmPreview.contact}</div>}
                </div>
                {!firmPreview.address && <p className="pm-hint">Add an address so clients know where you’re based.</p>}
              </figure>
            </div>

            <div className="savebar">
              <button type="button" className="save press" disabled={!firmDirty || saving} onClick={saveFirm}>{saving ? 'Saving…' : 'Save'}</button>
              {saved === 'firm' ? <span className="save-note ok" role="status">Saved</span>
                : firmError ? <span className="save-note err" role="alert">{firmError}</span>
                : firmDirty ? <span className="save-note">Unsaved changes</span> : null}
            </div>
          </div>

          {/* ── INVOICE DEFAULTS ── */}
          <div className={`settings-panel${panel === 'invoice' ? ' active' : ''}`}>
            <PanelHead title="Invoice defaults" sub="What every new invoice starts with. You can still change them on any invoice." />

            <div className="pay-layout">
              <div>
                <section className="block" aria-labelledby="def-vat">
                  <h3 id="def-vat">VAT</h3>
                  <div className="chips" role="group" aria-label="Do you charge VAT?">
                    <button type="button" className="chip press" aria-pressed={vatOn} onClick={() => setInv(p => ({ ...p, default_vat_rate: lastRate.current }))}>I charge VAT</button>
                    <button type="button" className="chip press" aria-pressed={!vatOn} onClick={() => { if (vatOn) lastRate.current = inv.default_vat_rate; setInv(p => ({ ...p, default_vat_rate: '0' })) }}>I don’t charge VAT</button>
                  </div>
                  {vatOn ? (
                    <div className="grid2" style={{ marginTop: 16 }}>
                      <div className="fld">
                        <label htmlFor="s-vat-rate">Rate</label>
                        <span className="in-suffix">
                          <input id="s-vat-rate" name="default_vat_rate" className="in" type="number" inputMode="decimal" min="0" max="100" step="0.1" value={inv.default_vat_rate} onChange={e => setInv(p => ({ ...p, default_vat_rate: e.target.value }))} />
                          <span aria-hidden="true">%</span>
                        </span>
                      </div>
                      <div className="fld">
                        <label htmlFor="s-tax-label">Called</label>
                        <input id="s-tax-label" name="tax_label" className="in" maxLength={12} value={inv.tax_label} onChange={e => setInv(p => ({ ...p, tax_label: e.target.value }))} />
                        <span className="help">The name printed on invoices, like VAT or GST.</span>
                      </div>
                      {!firm.vat_number.trim() && (
                        <p className="def-note full">
                          Only businesses registered for VAT may charge it. If you are, add your VAT number in{' '}
                          <button type="button" className="pm-link" onClick={() => setPanel('firm')}>Firm details</button> so it prints on your invoices.
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="help" style={{ marginTop: 12 }}>New invoices won’t add VAT, and won’t show a VAT line.</p>
                  )}
                </section>

                <section className="block" aria-labelledby="def-cur">
                  <h3 id="def-cur">Currency</h3>
                  <div className="grid2">
                    <div className="fld">
                      <label htmlFor="s-currency">Bill in</label>
                      <select id="s-currency" name="default_currency" className="in" value={inv.default_currency} onChange={e => setInv(p => ({ ...p, default_currency: e.target.value }))}>
                        {!CURRENCIES.some(c => c.v === inv.default_currency) && <option value={inv.default_currency}>{inv.default_currency}</option>}
                        {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                      </select>
                      <span className="help">Also the currency your dashboard totals are shown in.</span>
                    </div>
                  </div>
                </section>

                <p className="help" style={{ marginBottom: 24 }}>Payment terms are set in <button type="button" className="pm-link" onClick={() => setPanel('payment')}>Getting paid</button>.</p>
              </div>

              <figure className="pay-preview" aria-label="How totals work out on a new invoice">
                <figcaption>A new {fmtSample(1000).replace('.00', '')} invoice</figcaption>
                <div className="pp-card">
                  <div className="pp-row"><span>Subtotal</span><b>{fmtSample(1000)}</b></div>
                  {vatOn && <div className="pp-row"><span>{inv.tax_label.trim() || 'VAT'} ({rateNum}%)</span><b>{fmtSample(1000 * rateNum / 100)}</b></div>}
                  <div className="pp-row pp-total"><span>Total due</span><b>{fmtSample(1000 * (1 + (vatOn ? rateNum : 0) / 100))}</b></div>
                </div>
              </figure>
            </div>

            <div className="savebar">
              <button type="button" className="save press" disabled={!invDirty || !invValid || saving} onClick={saveInv}>{saving ? 'Saving…' : 'Save'}</button>
              {saved === 'invoice' ? <span className="save-note ok" role="status">Saved</span>
                : invError ? <span className="save-note err" role="alert">{invError}</span>
                : !invValid ? <span className="save-note err">Enter a rate between 0 and 100.</span>
                : invDirty ? <span className="save-note">Unsaved changes</span> : null}
            </div>
          </div>

          {/* ── PAYMENT & BANKING ── */}
          <div className={`settings-panel${panel === 'payment' ? ' active' : ''}`}>
            <PanelHead title="Getting paid" sub="Where clients send the money, and how long they get to pay." />

            <section className="block" aria-labelledby="pay-terms">
              <h3 id="pay-terms">Payment terms</h3>
              <p>New invoices fall due this long after they’re issued. You can still change it on any invoice.</p>
              <div className="chips" role="group" aria-label="Default payment terms">
                {TERM_CHOICES.map(t => (
                  <button key={t.days} type="button" className="chip press" aria-pressed={terms === t.days} onClick={() => setTerms(t.days)}>{t.label}</button>
                ))}
                {!TERM_CHOICES.some(t => t.days === terms) && (
                  <button type="button" className="chip" aria-pressed="true">{terms} days</button>
                )}
              </div>
            </section>

            <section className="block" aria-labelledby="pay-ways">
              <h3 id="pay-ways">Ways to pay you</h3>
              <p>All of these print on every unpaid invoice, in this order, with the invoice number as the reference. They’re left off once an invoice is paid.</p>
              <div className="pay-layout">
                <div>
                  {methods.map((m, i) => {
                    const id = `pm-${m.key}`
                    const field = (f: keyof Omit<PaymentMethod, 'kind'>, label: React.ReactNode, opts: { full?: boolean; numeric?: boolean; upper?: boolean } = {}) => (
                      <div className={`fld${opts.full ? ' full' : ''}`}>
                        <label htmlFor={`${id}-${f}`}>{label}</label>
                        <input id={`${id}-${f}`} name={`${id}-${f}`} className="in" autoComplete="off" inputMode={opts.numeric ? 'numeric' : undefined}
                          value={m[f] ?? ''} onChange={e => updateMethod(m.key, { [f]: opts.upper ? e.target.value.toUpperCase() : e.target.value })} />
                      </div>
                    )
                    return (
                      <div key={m.key} className="pm-card">
                        <div className="pm-head">
                          <b>{KIND_LABEL[m.kind]}</b>
                          {i === 0
                            ? <span className="pm-pref">Preferred</span>
                            : <button type="button" className="pm-link" onClick={() => setMethods(list => [m, ...list.filter(x => x.key !== m.key)])}>Make preferred</button>}
                          <button type="button" className="pm-link pm-remove" aria-label={`Remove ${KIND_LABEL[m.kind]}`} onClick={() => setMethods(list => list.filter(x => x.key !== m.key))}>Remove</button>
                        </div>
                        {m.kind === 'bank' ? (
                          <div className="grid2">
                            {field('bank', 'Bank', { full: true })}
                            {field('account_name', 'Account name', { full: true })}
                            {field('number', 'Account number', { numeric: true })}
                            {field('branch_code', 'Branch code', { numeric: true })}
                            {field('swift', <>SWIFT code <span className="opt">for clients paying from abroad</span></>, { full: true, upper: true })}
                          </div>
                        ) : (
                          <div className="grid2">
                            {field('number', 'Number or merchant code', { numeric: true })}
                            {field('account_name', 'Registered name')}
                          </div>
                        )}
                        {!m.number?.trim() && <p className="pm-hint">Add the {m.kind === 'bank' ? 'account number' : 'number'} or this won’t print.</p>}
                      </div>
                    )
                  })}

                  {methods.length < MAX_METHODS ? (
                    <div className="pm-add">
                      <span>{methods.length ? 'Add another' : 'Add a way to pay'}</span>
                      <div className="chips">
                        {(Object.keys(KIND_LABEL) as PaymentKind[]).map(k => (
                          <button key={k} type="button" className="chip press" onClick={() => addMethod(k)}>+ {KIND_LABEL[k]}</button>
                        ))}
                      </div>
                    </div>
                  ) : <p className="pm-hint">That’s the most an invoice has room for ({MAX_METHODS}).</p>}
                </div>

                <figure className="pay-preview" aria-label="How it appears on your invoices">
                  <figcaption>On your invoices</figcaption>
                  {payPreview.length ? (
                    <div className="pp-card">
                      <div className="pp-title">Payment details</div>
                      {payPreview.map((b, i) => (
                        <div key={i} className="pp-block">
                          <div className="pp-name">{b.title}</div>
                          {b.rows.map(([l, v]) => <div key={l} className="pp-row"><span>{l}</span><b>{v}</b></div>)}
                        </div>
                      ))}
                      <div className="pp-ref">Please use INV-{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}-001 as the payment reference.</div>
                    </div>
                  ) : (
                    <p className="pp-empty">Add a bank account or mobile money number and it will print here on every unpaid invoice.</p>
                  )}
                </figure>
              </div>
            </section>

            <div className="savebar">
              <button type="button" className="save press" disabled={!payDirty || saving} onClick={savePay}>{saving ? 'Saving…' : 'Save'}</button>
              {saved === 'payment' ? <span className="save-note ok" role="status">Saved</span>
                : payError ? <span className="save-note err" role="alert">{payError}</span>
                : payDirty ? <span className="save-note">Unsaved changes</span> : null}
            </div>
          </div>

          {/* ── NOTIFICATIONS ── */}
          <div className={`settings-panel${panel === 'notifs' ? ' active' : ''}`}>
            <PanelHead title={<>Notifications</>} sub={<>Payment alerts, overdue reminders · Stay informed without checking the app</>} />
            <div className="settings-section">
              <div className="settings-section-title">Email notifications</div>
              <div className="settings-section-desc">Choose which events trigger an email notification to you.</div>
              {[
                { k: 'viewed'   as const, label: 'Invoice viewed by client',  desc: 'Get notified when a client opens your invoice link' },
                { k: 'paid'     as const, label: 'Payment received',           desc: 'Instant notification when a payment is confirmed' },
                { k: 'overdue'  as const, label: 'Invoice overdue',            desc: 'Alert when an invoice passes its due date' },
                { k: 'reminder' as const, label: 'Reminder sent',              desc: 'Confirm when an automated reminder email is dispatched' },
                { k: 'weekly'   as const, label: 'Weekly summary',             desc: 'Monday morning report of paid, outstanding, and overdue totals' },
              ].map(({ k, label, desc }) => (
                <div key={k} className="notif-row">
                  <div>
                    <div className="notif-label">{label}</div>
                    <div className="notif-desc">{desc}</div>
                  </div>
                  <div className={`toggle-sw${notifs[k] ? ' on' : ''}`} onClick={() => setNotifs(p => ({ ...p, [k]: !p[k] }))} />
                </div>
              ))}
            </div>
          </div>

          {/* ── PLAN & BILLING ── */}
          <div className={`settings-panel${panel === 'plan' ? ' active' : ''}`}>
            <PanelHead title={<>Plan &amp; billing</>} sub={<>{profile?.plan === 'pro' ? 'Pro plan' : profile?.plan === 'business' ? 'Business plan' : 'Starter · Free · 5 invoices/month'}</>} />
            {billingStatus === 'success' && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'rgba(242,169,0,.12)', border:'1px solid rgba(242,169,0,.3)', borderRadius:8, marginBottom:20 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#F2A900" strokeWidth="2"><path d="M3 8l3.5 3.5L13 5"/></svg>
                <span style={{ fontSize:13, color:'#C98C00', fontWeight:600 }}>
                  Payment successful! You&apos;re now on the <span style={{ textTransform:'capitalize' }}>{billingPlan}</span> plan.
                </span>
              </div>
            )}
            {billingStatus === 'failed' && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'rgba(239,68,68,.1)', border:'1px solid rgba(239,68,68,.25)', borderRadius:8, marginBottom:20 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#EF4444" strokeWidth="2"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                <span style={{ fontSize:13, color:'#EF4444', fontWeight:600 }}>Payment was not completed. No charge was made.</span>
              </div>
            )}
            <div className="settings-section">
              <div className="settings-section-title">Your plan</div>
              <div className="settings-section-desc">You are on the <strong style={{ color: 'var(--t2)' }}>{profile?.plan ?? 'free'}</strong> plan.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 12 }}>
                {[
                  {
                    id: 'free', name: 'Starter', highlight: false,
                    price: 0,
                    features: ['5 invoices/month', 'PDF export', 'WhatsApp send'],
                  },
                  {
                    id: 'pro', name: 'Pro', highlight: true,
                    price: 100,
                    features: ['Unlimited invoices', 'Recurring invoices', 'Email delivery', 'Auto-reminders'],
                  },
                  {
                    id: 'business', name: 'Business', highlight: false,
                    price: 400,
                    features: ['Everything in Pro', 'Multi-user', 'Advanced reporting', 'Priority support'],
                  },
                ].map(plan => {
                  const isCurrent = plan.id === (profile?.plan ?? 'free')
                  const canUpgrade = !isCurrent && plan.id !== 'free'
                  const priceLabel = plan.price === 0 ? 'Free' : `P${plan.price}/mo`
                  return (
                    <div key={plan.name} className="plan-card" style={{ border: isCurrent ? '1px solid rgba(242,169,0,.4)' : undefined, gap: 8 }}>
                      <div style={{ fontFamily: "var(--font-bebas),sans-serif", fontWeight: 700, fontSize: 18, letterSpacing: 1.5, color: plan.highlight ? 'var(--g)' : 'var(--t1)' }}>{plan.name}</div>
                      <div>
                        <span style={{ fontFamily: "var(--font-bebas),sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--t1)' }}>{priceLabel}</span>
                      </div>
                      {plan.features.map(f => <div key={f} style={{ fontSize: 11, color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ color: 'var(--g)', fontSize: 10 }}>✓</span>{f}</div>)}
                      <div style={{ marginTop: 4 }}>
                        {isCurrent ? (
                          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--g)', padding: '4px 10px', background: 'var(--g-dim)', borderRadius: 4 }}>Current plan</span>
                        ) : canUpgrade ? (
                          <button
                            className="topbar-btn btn-primary"
                            style={{ fontSize: 11, padding: '5px 12px', width: '100%', justifyContent: 'center' }}
                            disabled={!!upgrading}
                            onClick={() => upgradePlan(plan.id as 'pro' | 'business')}
                          >
                            {upgrading === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div className="settings-section">
              <div className="settings-section-title" style={{ color: 'var(--danger)' }}>Danger zone</div>
              <div className="settings-section-desc">These actions are permanent and cannot be undone.</div>
              <div style={{ border: '1px solid rgba(239,68,68,.18)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid rgba(239,68,68,.1)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>Export all data</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Download all invoices, clients and settings as a ZIP file</div>
                  </div>
                  <button className="topbar-btn" style={{ color: 'var(--warn)', borderColor: 'rgba(245,158,11,.3)', flexShrink: 0 }}>Export</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--danger)' }}>Cancel plan</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Your account will downgrade to Starter at end of billing period</div>
                  </div>
                  <button className="topbar-btn" style={{ color: 'var(--danger)', borderColor: 'rgba(239,68,68,.25)', flexShrink: 0 }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>

          {/* ── TEAM MEMBERS ── */}
          <div className={`settings-panel${panel === 'team' ? ' active' : ''}`}>
            <PanelHead title={<>Team members</>} sub={<>{teamMembers.length + 1} / 5 seats used (you + {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'})</>} />

            {/* Invite form */}
            <div className="settings-section">
              <div className="settings-section-title">Invite a team member</div>
              <div className="settings-section-desc">They'll receive a link to join your team. Each member gets full Business plan access at no extra cost (max 5 total).</div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <input
                  id="invite-email"
                  name="invite-email"
                  type="email"
                  placeholder="colleague@email.com"
                  value={inviteEmail}
                  onChange={e => { setInviteEmail(e.target.value); setInviteError(''); setInviteLink(null) }}
                  onKeyDown={e => e.key === 'Enter' && sendInvite()}
                  disabled={inviting || teamMembers.length >= 4}
                  style={{
                    flex: 1, padding: '8px 12px', borderRadius: 7, fontSize: 13,
                    background: 'var(--surface)', border: '1px solid var(--line2)',
                    color: 'var(--t1)', fontFamily: 'var(--font-archivo),sans-serif', fontWeight: 700,
                    outline: 'none',
                  }}
                />
                <button
                  className="topbar-btn btn-primary"
                  onClick={sendInvite}
                  disabled={inviting || !inviteEmail.trim() || teamMembers.length >= 4}
                  style={{ flexShrink: 0, padding: '8px 16px', fontSize: 13 }}
                >
                  {inviting ? 'Sending…' : 'Generate link'}
                </button>
              </div>
              {inviteError && <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 7 }}>{inviteError}</p>}
              {teamMembers.length >= 4 && <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 7 }}>Team is full (5/5 seats used).</p>}

              {/* Generated invite link */}
              {inviteLink && (
                <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(242,169,0,.08)', border: '1px solid rgba(242,169,0,.25)', borderRadius: 8 }}>
                  <p style={{ fontSize: 11, color: '#F2A900', fontWeight: 600, marginBottom: 6 }}>Invite link generated — share this with your team member:</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <code style={{ flex: 1, fontSize: 11, color: 'var(--t2)', wordBreak: 'break-all', background: 'var(--surface)', padding: '6px 10px', borderRadius: 5, border: '1px solid var(--line2)' }}>{inviteLink}</code>
                    <button
                      className="topbar-btn"
                      onClick={() => copyLink(inviteLink, 'new')}
                      style={{ flexShrink: 0, fontSize: 11, padding: '5px 10px' }}
                    >
                      {copiedId === 'new' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Member list */}
            <div className="settings-section">
              <div className="settings-section-title">Current members</div>
              {!teamLoaded ? (
                <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 8 }}>Loading…</p>
              ) : (
                <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', marginTop: 10 }}>
                  {/* Owner row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: teamMembers.length > 0 ? '1px solid var(--line)' : undefined }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(242,169,0,.15)', border: '1px solid rgba(242,169,0,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#F2A900', flexShrink: 0 }}>
                        {(profile?.name ?? 'O')[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{profile?.name ?? 'You'}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>Account owner</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#F2A900', padding: '3px 8px', background: 'rgba(242,169,0,.1)', borderRadius: 4 }}>Owner</span>
                  </div>

                  {/* Member rows */}
                  {teamMembers.map((m, i) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: i < teamMembers.length - 1 ? '1px solid var(--line)' : undefined }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--surface)', border: '1px solid var(--line2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--t2)', flexShrink: 0 }}>
                          {m.email[0].toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 13, color: 'var(--t1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.email}</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 3,
                              background: m.status === 'active' ? 'rgba(242,169,0,.1)' : 'rgba(245,158,11,.1)',
                              color: m.status === 'active' ? '#F2A900' : '#F59E0B',
                            }}>
                              {m.status === 'active' ? 'Active' : 'Pending'}
                            </span>
                            {m.status === 'pending' && (
                              <button
                                style={{ fontSize: 10, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                                onClick={() => copyLink(`${window.location.origin}/join/${m.invite_token}`, m.id)}
                              >
                                {copiedId === m.id ? 'Copied!' : 'Copy invite link'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        className="topbar-btn"
                        onClick={() => removeMember(m.id)}
                        disabled={removingId === m.id}
                        style={{ fontSize: 11, color: 'var(--danger)', borderColor: 'rgba(239,68,68,.25)', flexShrink: 0, padding: '4px 10px' }}
                      >
                        {removingId === m.id ? 'Removing…' : 'Remove'}
                      </button>
                    </div>
                  ))}

                  {teamMembers.length === 0 && (
                    <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
                      No team members yet. Invite someone above.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* ── SECURITY ── */}
          <div className={`settings-panel${panel === 'security' ? ' active' : ''}`}>
            <PanelHead title={<>Security</>} sub={<>Two-factor authentication · Session control · Security assessment</>} />

            {/* 2FA */}
            <div className="settings-section">
              <div className="settings-section-title">Two-factor authentication (TOTP)</div>
              <div className="settings-section-desc">Require a time-based one-time code from an authenticator app (Google Authenticator, Authy, 1Password) every time you sign in.</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 10, marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: profile?.two_fa_enabled ? 'var(--g)' : 'var(--t3)', boxShadow: profile?.two_fa_enabled ? '0 0 6px rgba(242,169,0,.5)' : 'none' }}/>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{profile?.two_fa_enabled ? '2FA enabled' : '2FA disabled'}</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{profile?.two_fa_enabled ? 'Your account is protected with TOTP.' : 'Your account only uses a password.'}</div>
                  </div>
                </div>
                <button
                  className={`topbar-btn ${profile?.two_fa_enabled ? 'btn-outline' : 'btn-primary'}`}
                  style={{ padding: '6px 14px', fontSize: 12 }}
                  disabled={mfaBusy}
                  onClick={() => profile?.two_fa_enabled ? setMfaModal('unenroll') : startEnroll2FA()}
                >{mfaBusy ? '…' : profile?.two_fa_enabled ? 'Remove 2FA' : 'Enable 2FA'}</button>
              </div>
            </div>

            {/* Session security */}
            <div className="settings-section">
              <div className="settings-section-title">Session security</div>
              <div className="settings-section-desc">Control how long your session stays active when you&apos;re not using the app.</div>
              <div className="form-group" style={{ maxWidth: 320, marginTop: 12 }}>
                <label className="form-label">Inactivity timeout</label>
                <select className="form-input">
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="120">2 hours</option>
                  <option value="0">Never (not recommended)</option>
                </select>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t3)' }}>You&apos;ll be signed out automatically after this period of inactivity.</div>
              <div style={{ marginTop: 14 }}>
                <Link href="/auth/login" className="topbar-btn" style={{ textDecoration: 'none', color: 'var(--danger)', borderColor: 'rgba(239,68,68,.3)' }}>
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 8H3M6 5l-3 3 3 3M11 3h2a1 1 0 011 1v8a1 1 0 01-1 1h-2"/></svg>
                  Sign out
                </Link>
              </div>
            </div>

            {/* Security assessment */}
            <div className="settings-section">
              <div className="settings-section-title">Security assessment</div>
              <div className="settings-section-desc">Known risks and hardening status. Severity ratings follow OWASP guidelines.</div>
              <div style={{ marginTop: 14 }}>
                {SEC_RISKS.map((r, i) => (
                  <div key={i} className="sec-risk-row">
                    <div><span className={`sec-badge sec-badge-${r.badge}`}>{r.badge.charAt(0).toUpperCase() + r.badge.slice(1)}</span></div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>{r.desc}</div>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', whiteSpace: 'nowrap' }}>OWASP {r.owasp}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2FA enroll modal ── */}
      {mfaModal === 'enroll' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid var(--line2)', borderRadius: 16, padding: 32, maxWidth: 420, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 6 }}>Set up authenticator</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 20 }}>Scan this QR code with Google Authenticator, Authy, or 1Password, then enter the 6-digit code to confirm.</div>
            {mfaQr && (
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mfaQr} alt="QR code" width={160} height={160} style={{ borderRadius: 8, background: '#fff', padding: 8 }}/>
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center', marginBottom: 20, wordBreak: 'break-all' }}>
              Can&apos;t scan? Manual key: <span style={{ color: 'var(--t2)', fontFamily: 'monospace' }}>{mfaSecret}</span>
            </div>
            {mfaError && <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '8px 12px', marginBottom: 14 }}>{mfaError}</div>}
            <input
              id="s-mfa-code"
              name="mfa_code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              value={mfaCode}
              onChange={e => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={{ width: '100%', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 14px', fontSize: 20, letterSpacing: 6, textAlign: 'center', color: 'var(--t1)', outline: 'none', marginBottom: 14, fontFamily: 'monospace' }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="topbar-btn btn-primary" style={{ flex: 1 }} disabled={mfaCode.length !== 6 || mfaBusy} onClick={confirmEnroll2FA}>
                {mfaBusy ? 'Verifying…' : 'Activate 2FA'}
              </button>
              <button className="topbar-btn btn-outline" onClick={() => { setMfaModal(null); setMfaCode(''); setMfaError('') }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2FA unenroll confirm ── */}
      {mfaModal === 'unenroll' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'var(--bg2)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 16, padding: 32, maxWidth: 380, width: '100%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>Remove two-factor authentication?</div>
            <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 24 }}>Your account will only be protected by your password. You can re-enable 2FA at any time.</div>
            {mfaError && <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 14 }}>{mfaError}</div>}
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="topbar-btn" style={{ flex: 1, background: 'rgba(239,68,68,.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,.3)' }} disabled={mfaBusy} onClick={unenroll2FA}>
                {mfaBusy ? 'Removing…' : 'Yes, remove 2FA'}
              </button>
              <button className="topbar-btn btn-outline" onClick={() => { setMfaModal(null); setMfaError('') }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

