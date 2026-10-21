'use client'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { THEME_PRESETS, THEME_ORDER, resolveTheme, tint, type InvoiceTheme } from '@/lib/invoice-themes'
import { COUNTRIES, countryCode } from '@/lib/countries'
import { firmLines } from '@/lib/firm-details'
import { PLANS, FREE_MONTHLY_LIMIT, TEAM_SEATS, planName } from '@/lib/plans'
import { TEAMS_ENABLED, ROLE_LABEL, ROLE_HELP, type TeamRole } from '@/lib/teams'
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
  invoice_paper_size?: string | null
  brand_color_primary: string | null
  brand_color_header: string | null
  payment_methods?: unknown
  default_due_days?: number | null
  subscription_expires_at?: string | null
  team_id?: string | null
}

type Panel = 'brand' | 'firm' | 'invoice' | 'payment' | 'plan' | 'team' | 'security'

const PANELS: { id: Panel; label: string; businessOnly?: boolean }[] = [
  { id: 'brand',    label: 'Branding' },
  { id: 'firm',     label: 'Firm details' },
  { id: 'invoice',  label: 'Invoice defaults' },
  { id: 'payment',  label: 'Getting paid' },
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
  .pl-banner{font-size:14px;font-weight:600;padding:12px 14px;border-radius:10px;margin-bottom:20px;}
  .pl-banner.ok{background:color-mix(in srgb,var(--g) 16%,transparent);color:var(--t1);}
  .pl-banner.err{background:color-mix(in srgb,#DC4B3E 12%,transparent);color:#DC4B3E;}
  .pl-now{display:grid;grid-template-columns:200px minmax(0,1fr);gap:24px;align-items:center;padding:20px 22px;margin-bottom:28px;border-radius:12px;background:var(--bg);border:1px solid var(--line);}
  .pl-kicker{font-size:12px;font-weight:600;color:var(--t2);}
  .pl-now h3{font-size:28px;font-weight:800;letter-spacing:-.02em;color:var(--t1);margin-top:2px;}
  .pl-usage p{font-size:14px;color:var(--t1);line-height:1.5;}
  .pl-usage p + p{margin-top:6px;}
  .pl-meter{display:flex;gap:6px;margin-bottom:8px;max-width:240px;}
  .pl-meter span{flex:1;height:8px;border-radius:4px;background:var(--line2);}
  .pl-meter span.on{background:var(--g);}
  .pl-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;}
  .pl-card{display:flex;flex-direction:column;gap:8px;padding:18px;border:1px solid var(--line2);border-radius:12px;background:var(--bg2);}
  .pl-card[aria-current="true"]{border-color:var(--t1);box-shadow:inset 0 0 0 1px var(--t1);}
  .pl-head{display:flex;align-items:center;gap:8px;}
  .pl-head b{font-size:15px;color:var(--t1);}
  .pl-price{font-size:26px;font-weight:800;letter-spacing:-.02em;color:var(--t1);font-variant-numeric:tabular-nums;}
  .pl-price small{font-size:13px;font-weight:500;color:var(--t2);letter-spacing:0;}
  .pl-card > p{font-size:14px;color:var(--t2);line-height:1.5;flex:1;}
  .pl-card .save,.pl-card .btn-line{width:100%;}
  @media(max-width:900px){.pl-now{grid-template-columns:1fr;gap:12px;}.pl-grid{grid-template-columns:1fr;}}
  .sec-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 18px;border:1px solid var(--line2);border-radius:12px;background:var(--bg);}
  .sec-row b{display:block;font-size:16px;color:var(--t1);}
  .sec-row b.sec-on{color:var(--t1);}
  .sec-row b.sec-on::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:#1DA851;margin-right:8px;vertical-align:middle;}
  .sec-actions{display:flex;align-items:center;flex-wrap:wrap;gap:14px;}
  .pm-link:disabled{opacity:.5;cursor:default;}
  .sec-backdrop{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:20px;background:rgba(10,14,26,.55);animation:panelIn var(--dur-2) var(--ease) both;}
  .sec-modal{width:100%;max-width:440px;padding:24px;border-radius:14px;background:var(--bg2);border:1px solid var(--line2);box-shadow:0 24px 64px rgba(0,0,0,.35);font-family:var(--font-manrope),sans-serif;} /* taste-skill-ignore: dialog */
  .sec-modal h2{font-size:18px;font-weight:700;color:var(--t1);margin-bottom:12px;}
  .sec-steps{margin:0 0 16px 18px;font-size:14px;color:var(--t2);line-height:1.6;}
  .sec-qr{display:block;margin:0 auto 10px;border-radius:10px;background:#fff;padding:8px;}
  .sec-key{text-align:center;word-break:break-all;margin-bottom:16px;}
  .sec-key span{color:var(--t1);font-weight:600;letter-spacing:.06em;}
  .sec-label{display:block;font-size:13px;font-weight:600;color:var(--t1);margin-bottom:6px;}
  .sec-code{text-align:center;font-size:22px;letter-spacing:.4em;font-variant-numeric:tabular-nums;height:52px;margin-bottom:10px;}
  .sec-copy{font-size:14px;color:var(--t2);line-height:1.5;margin-bottom:16px;}
  .sec-modal-foot{display:flex;justify-content:flex-end;gap:10px;margin-top:16px;}
  .sec-danger{height:40px;padding:0 18px;border:0;border-radius:8px;background:#DC4B3E;color:#fff;font:700 14px var(--font-manrope),sans-serif;cursor:pointer;}
  .sec-danger:disabled{opacity:.5;}
  @media(max-width:600px){.sec-row{flex-direction:column;align-items:flex-start;}.sec-backdrop{align-items:flex-end;padding:0;}.sec-modal{max-width:none;border-radius:16px 16px 0 0;}}
  .tm-note{font-size:14px;color:var(--t1);line-height:1.5;padding:12px 14px;border-radius:10px;background:var(--bg);border:1px solid var(--line);margin-bottom:24px;}
  .tm-invite{display:flex;align-items:flex-end;gap:10px;flex-wrap:wrap;}
  .tm-invite .save{height:42px;}
  .tm-role{width:auto;height:34px;padding:0 8px;font-size:13px;}
  @media(max-width:600px){.tm-invite{flex-direction:column;align-items:stretch;}}
  .tm-link{margin-top:14px;padding:14px 16px;border-radius:10px;background:color-mix(in srgb,var(--g) 10%,transparent);}
  .tm-link p{font-size:14px;font-weight:600;color:var(--t1);margin-bottom:8px;}
  .tm-link code{display:block;font-size:13px;color:var(--t1);word-break:break-all;background:var(--bg2);border:1px solid var(--line2);border-radius:8px;padding:8px 10px;margin-bottom:10px;}
  .tm-wa{display:inline-flex;align-items:center;text-decoration:none;}
  .tm-list{list-style:none;border:1px solid var(--line2);border-radius:12px;overflow:hidden;}
  .tm-list li{display:flex;align-items:center;gap:12px;padding:12px 16px;border-top:1px solid var(--line);flex-wrap:wrap;}
  .tm-list li:first-child{border-top:0;}
  .tm-av{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;font-size:13px;font-weight:700;background:var(--bg);color:var(--t1);border:1px solid var(--line2);}
  .tm-who{flex:1;min-width:0;}
  .tm-who b{display:block;font-size:14px;color:var(--t1);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .tm-who span{display:block;font-size:12px;color:var(--t2);margin-top:2px;}
  .tm-actions{display:flex;gap:14px;}
  .tm-confirm{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}
  .tm-confirm .btn-line,.tm-confirm .sec-danger{height:34px;padding:0 12px;}
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
  .brand-preview .stage{background:#E9E5DC;border-radius:12px;padding:10px;}
  .brand-pdf{display:block;width:100%;aspect-ratio:148/210;border:0;border-radius:4px;background:#FFFFFF;}
  .brand-pdf-open{display:inline-block;margin-top:10px;font-size:13px;font-weight:600;color:var(--t1);text-decoration:underline;text-underline-offset:3px;}
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

// A small sketch of each template's layout for the template picker: where the
// big INVOICE, the colour and the amount sit. The real thing is in the preview.
function TemplateSketch({ id, t }: { id: string; t: InvoiceTheme }) {
  const ink = '#1F2A44', line = '#E5E7EB', soft = '#CBD5E1'
  const bar = (w: string | number, h = 3, c = soft, extra: React.CSSProperties = {}) => <div style={{ width: w, height: h, background: c, borderRadius: 1, ...extra }} />
  const rows = (n: number, gap = 4) => <div style={{ display: 'grid', gap }}>{Array.from({ length: n }, (_, i) => <div key={i} style={{ height: 1, background: line }} />)}</div>
  const accent = t.accentColor, header = t.headerBg
  const box: React.CSSProperties = { background: '#FFFFFF', height: 96, padding: 8, display: 'flex', flexDirection: 'column', gap: 5, position: 'relative', overflow: 'hidden' }
  if (id === 'charcoal') return (
    <div style={{ ...box, padding: 0, flexDirection: 'row', gap: 0 }}>
      <div style={{ width: '36%', background: header, padding: 7, display: 'grid', alignContent: 'start', gap: 4 }}>{bar('80%', 3, '#FFFFFF')}{bar('60%', 2, '#FFFFFF', { opacity: .5 })}{bar('70%', 5, accent, { marginTop: 8 })}{bar('50%', 2, '#FFFFFF', { opacity: .5 })}</div>
      <div style={{ flex: 1, padding: 7, display: 'grid', alignContent: 'start', gap: 5 }}>{bar('70%', 9, ink)}{bar('40%', 2)}{rows(4)}{bar('45%', 3, ink, { justifySelf: 'end' })}</div>
    </div>
  )
  if (id === 'clean-light') return (
    <div style={box}>{bar('75%', 12, ink)}<div style={{ display: 'flex', gap: 6 }}><div style={{ flex: 1 }}>{rows(3, 4)}</div><div style={{ flex: 1 }}>{rows(3, 4)}</div></div>{rows(3)}<div style={{ alignSelf: 'flex-end', width: '45%' }}>{bar('100%', 4, ink)}{bar('100%', 2, accent, { marginTop: 2 })}</div></div>
  )
  if (id === 'minimal') return (
    <div style={{ ...box, padding: '8px 12px' }}>{bar('35%', 2)}{bar('60%', 10, ink, { marginTop: 4 })}{bar(10, 2, accent)}{bar('85%', 3, ink, { opacity: .7 })}<div style={{ marginTop: 2 }}>{rows(3)}</div></div>
  )
  if (id === 'bold-amber') return (
    <div style={box}><div style={{ display: 'flex', justifyContent: 'space-between' }}>{bar('50%', 10, ink)}{bar('25%', 3)}</div>{rows(3)}{bar('40%', 3, ink, { alignSelf: 'flex-end' })}<div style={{ borderTop: `1px dashed ${soft}`, marginTop: 'auto' }} /><div style={{ height: 18, background: /^#[0-9a-f]{6}$/i.test(accent) ? tint(accent, .82) : '#FCEFC7', borderRadius: 2, padding: 4 }}>{bar('35%', 4, ink)}</div></div>
  )
  return (
    <div style={box}><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>{bar('30%', 3, ink)}{bar('45%', 9, ink)}</div><div style={{ margin: '0 -8px', height: 16, background: header, padding: '4px 8px' }}>{bar('35%', 6, accent)}</div>{rows(3)}{bar('40%', 3, ink, { alignSelf: 'flex-end' })}</div>
  )
}

// The real PDF, in the template and colours being tried. It reloads a moment
// after the last change so typing a colour doesn't fire a render per key.
function BrandingPdfPreview({ theme, paper, accent, header, logo }: { theme: string; paper: string; accent: string; header: string; logo?: string | null }) {
  const want = `/api/invoices/sample-pdf?${new URLSearchParams({ theme, paper, ...(accent ? { accent } : {}), ...(header ? { header } : {}), v: logo ?? '' })}#toolbar=0&navpanes=0&view=FitH`
  const [src, setSrc] = useState(want)
  useEffect(() => {
    const id = setTimeout(() => setSrc(want), 500)
    return () => clearTimeout(id)
  }, [want])
  // Phones rarely show a PDF inside a page, so there's always a way to open it.
  return (
    <>
      <iframe className="brand-pdf" src={src} title="Sample invoice in the chosen template" />
      <a className="brand-pdf-open" href={src.split('#')[0]} target="_blank" rel="noreferrer">Open full size</a>
    </>
  )
}

export function SettingsClient({ initialProfile = null, invoicesThisMonth = 0, role = 'owner' }: { initialProfile?: Profile | null; invoicesThisMonth?: number; role?: 'owner' | 'admin' | 'staff' }) {
  const [profile, setProfile]   = useState<Profile | null>(initialProfile)
  const [loading, setLoading]   = useState(initialProfile === null)
  // Admin sees everything but billing; Staff sees the team (read-only) and their own security.
  const panelAllowed = (id: Panel) => role === 'owner' ? true : role === 'admin' ? id !== 'plan' : id === 'team' || id === 'security'
  const visiblePanels = PANELS.filter(p => panelAllowed(p.id) && (!p.businessOnly || profile?.plan === 'business' || (TEAMS_ENABLED && role !== 'owner')))
  const [panel,   setPanel]     = useState<Panel>(() => visiblePanels[0]?.id ?? 'security')
  const businessName = profile?.firm_name || profile?.name || 'this business'
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState<Panel | null>(null)
  const [upgrading, setUpgrading] = useState<string | null>(null)

  // Team state
  type TeamMember = { id: string; email: string; status: 'pending' | 'active'; role: TeamRole; invited_at: string; joined_at: string | null; invite_token: string | null }
  const [inviteRole, setInviteRole] = useState<TeamRole>('staff')
  const [roleSaving, setRoleSaving] = useState<string | null>(null)
  const [roleError, setRoleError] = useState('')
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
    if (want && visiblePanels.some(p => p.id === want)) setPanel(want as Panel)
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
    invoice_paper_size:  p?.invoice_paper_size === 'A5' ? 'A5' : 'A4',
  })
  const [branding, setBranding] = useState(() => brandFrom(initialProfile))
  const [brandError, setBrandError] = useState('')
  const savedBrand = brandFrom(profile)
  const hexOk = (v: string) => v === '' || /^#[0-9a-f]{6}$/i.test(v)
  const brandValid = hexOk(branding.brand_color_primary) && hexOk(branding.brand_color_header)
  const brandDirty = branding.invoice_theme !== savedBrand.invoice_theme
    || branding.invoice_paper_size !== savedBrand.invoice_paper_size
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
      invoice_paper_size:  branding.invoice_paper_size,
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


  useEffect(() => {
    // Skip if the server already provided initial profile data.
    if (initialProfile !== null) return
    fetch('/api/profile', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const p: Profile = d.profile
        setProfile(p)
        setBranding(brandFrom(p))
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

  // Plan & billing
  const currentPlan = (profile?.plan ?? 'free') as 'free' | 'pro' | 'business'
  const planEnd = profile?.subscription_expires_at ? new Date(profile.subscription_expires_at) : null
  const daysLeft = planEnd ? Math.max(0, Math.ceil((planEnd.getTime() - Date.now()) / 86400000)) : 0
  const usedThisMonth = invoicesThisMonth
  const [upgradeError, setUpgradeError] = useState('')
  const longDay = (d: Date) => d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })

  async function upgradePlan(plan: 'pro' | 'business') {
    setUpgrading(plan)
    setUpgradeError('')
    try {
      const res  = await fetch('/api/billing/checkout', { method: 'POST', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ plan }) })
      const data = await res.json()
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl
      } else {
        setUpgradeError(data.error ?? 'Couldn’t open the payment page. Please try again.')
        setUpgrading(null)
      }
    } catch {
      setUpgradeError('Couldn’t reach the payment page. Check your connection and try again.')
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
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    })
    const data = await res.json().catch(() => ({}))
    if (res.ok) {
      setInviteLink(data.inviteUrl)
      setInviteEmail('')
      fetchTeamMembers()
    } else {
      setInviteError(data.error ?? 'Couldn’t create the invite. Please try again.')
    }
    setInviting(false)
  }

  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [removeError, setRemoveError] = useState('')
  const seatsUsed = teamMembers.length + 1
  const teamFull = seatsUsed >= TEAM_SEATS

  async function removeMember(memberId: string) {
    setRemovingId(memberId); setRemoveError('')
    try {
      const res = await fetch('/api/team/remove', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ memberId }),
      })
      if (res.ok) {
        setTeamMembers(prev => prev.filter(m => m.id !== memberId))
        setConfirmRemove(null)
      } else {
        setRemoveError('Couldn’t remove them. Please try again.')
      }
    } catch {
      setRemoveError('Couldn’t reach StagePay. Check your connection and try again.')
    } finally {
      setRemovingId(null)
    }
  }

  async function changeRole(memberId: string, next: TeamRole) {
    setRoleSaving(memberId); setRoleError('')
    const before = teamMembers
    setTeamMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: next } : m))
    try {
      const res = await fetch('/api/team/role', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ memberId, role: next }) })
      if (!res.ok) { setTeamMembers(before); setRoleError('Couldn’t change the role. Please try again.') }
    } catch {
      setTeamMembers(before); setRoleError('Couldn’t reach StagePay. Check your connection and try again.')
    } finally {
      setRoleSaving(null)
    }
  }

  // The team list loads when the panel opens, including from a ?panel=team link.
  useEffect(() => {
    if (panel === 'team' && !teamLoaded) fetchTeamMembers()
  }, [panel]) // eslint-disable-line react-hooks/exhaustive-deps

  function copyLink(text: string, id: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  // Two-step sign-in: the status comes from the sign-in service itself, not a saved flag.
  const [mfaOn, setMfaOn] = useState<boolean | null>(null)
  const [mfaNote, setMfaNote] = useState('')
  async function refreshMfa() {
    const { data } = await supabase.auth.mfa.listFactors()
    setMfaOn(!!data?.totp?.some(f => f.status === 'verified'))
  }
  useEffect(() => { refreshMfa().catch(() => setMfaOn(!!initialProfile?.two_fa_enabled)) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function startEnroll2FA() {
    setMfaError(''); setMfaNote(''); setMfaBusy(true)
    try {
      // A set-up that was abandoned half-way leaves an unverified factor behind; clear it first.
      const { data: list } = await supabase.auth.mfa.listFactors()
      for (const f of list?.all ?? []) {
        if (f.factor_type === 'totp' && f.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: f.id })
      }
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'StagePay', friendlyName: 'Authenticator' })
      if (error || !data) { setMfaNote(error?.message ?? 'Couldn’t start set-up. Please try again.'); return }
      setMfaFactorId(data.id)
      setMfaQr(data.totp.qr_code)
      setMfaSecret(data.totp.secret)
      setMfaCode('')
      setMfaModal('enroll')
    } finally {
      setMfaBusy(false)
    }
  }

  async function cancelEnroll2FA() {
    setMfaModal(null); setMfaCode(''); setMfaError('')
    if (mfaFactorId) await supabase.auth.mfa.unenroll({ factorId: mfaFactorId }).catch(() => {})
    setMfaFactorId('')
  }

  async function confirmEnroll2FA() {
    if (mfaCode.length !== 6) return
    setMfaError(''); setMfaBusy(true)
    try {
      const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId })
      if (cErr || !challenge) { setMfaError(cErr?.message ?? 'Couldn’t check the code. Please try again.'); return }
      const { error: vErr } = await supabase.auth.mfa.verify({ factorId: mfaFactorId, challengeId: challenge.id, code: mfaCode })
      if (vErr) { setMfaError('That code didn’t match. Codes change every 30 seconds; try the current one.'); return }
      setMfaOn(true)
      setMfaFactorId('')
      setMfaModal(null); setMfaCode('')
      setMfaNote('Two-step sign-in is on.')
    } finally {
      setMfaBusy(false)
    }
  }

  async function unenroll2FA() {
    setMfaError(''); setMfaBusy(true)
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors()
      for (const f of factors?.totp ?? []) {
        const { error } = await supabase.auth.mfa.unenroll({ factorId: f.id })
        if (error) { setMfaError(error.message); return }
      }
      setMfaOn(false)
      setMfaModal(null)
      setMfaNote('Two-step sign-in is off.')
    } finally {
      setMfaBusy(false)
    }
  }

  // Password
  const [pw, setPw] = useState({ next: '', again: '' })
  const [pwBusy, setPwBusy] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const pwProblem = !pw.next ? '' : pw.next.length < 8 ? 'Use at least 8 characters.' : pw.again && pw.again !== pw.next ? 'The two passwords don’t match.' : ''
  async function changePassword() {
    if (pw.next.length < 8 || pw.next !== pw.again) return
    setPwBusy(true); setPwMsg(null)
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.next })
      if (error) {
        setPwMsg({ ok: false, text: /reauth|recent/i.test(error.message)
          ? 'For your safety, sign out and back in, then change your password straight away.'
          : error.message })
        return
      }
      setPw({ next: '', again: '' })
      setPwMsg({ ok: true, text: 'Password changed. Use the new one next time you sign in.' })
    } finally {
      setPwBusy(false)
    }
  }

  // Sessions
  const [signingOut, setSigningOut] = useState<'' | 'here' | 'others'>('')
  const [othersDone, setOthersDone] = useState(false)
  async function signOut(scope: 'local' | 'others') {
    setSigningOut(scope === 'local' ? 'here' : 'others')
    try {
      await supabase.auth.signOut({ scope })
      if (scope === 'local') {
        try { sessionStorage.removeItem('sp-splash') } catch {}
        window.location.href = '/auth/login'
        return
      }
      setOthersDone(true)
    } finally {
      setSigningOut('')
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
            {visiblePanels.map(p => (
              <button
                key={p.id}
                type="button"
                className="settings-nav-item"
                aria-current={panel === p.id ? 'page' : undefined}
                onClick={() => {
                  setPanel(p.id)
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
                          <div aria-hidden="true"><TemplateSketch id={id} t={t} /></div>
                          <span className="theme-card-name">{t.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className="block" aria-labelledby="br-paper">
                  <h3 id="br-paper">Paper size</h3>
                  <p>A4 is the usual size. A5 is half of it, handy for short invoices and receipt-sized printouts.</p>
                  <div className="chips" role="group" aria-label="Paper size">
                    {(['A4', 'A5'] as const).map(size => (
                      <button key={size} type="button" className="chip press" aria-pressed={branding.invoice_paper_size === size}
                        onClick={() => setBranding(p => ({ ...p, invoice_paper_size: size }))}>
                        {size}{size === 'A4' ? ' · 210 × 297 mm' : ' · 148 × 210 mm'}
                      </button>
                    ))}
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
                <figcaption><span>Your next invoice</span><span>The real PDF, with a sample client</span></figcaption>
                <div className="stage">
                  <BrandingPdfPreview
                    theme={branding.invoice_theme}
                    paper={branding.invoice_paper_size}
                    accent={hexOk(branding.brand_color_primary) ? branding.brand_color_primary || '' : ''}
                    header={hexOk(branding.brand_color_header) ? branding.brand_color_header || '' : ''}
                    logo={profile?.logo_url}
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
                      <span className="help" id="s-email-help">{role === 'owner' ? 'The email you sign in with.' : 'The business owner’s sign-in email.'}</span>
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

          {/* ── PLAN & BILLING ── */}
          <div className={`settings-panel${panel === 'plan' ? ' active' : ''}`}>
            <PanelHead title="Plan & billing" sub="Your plan, what it costs, and when it ends." />

            {billingStatus === 'success' && (
              <p className="pl-banner ok" role="status">Payment received. You’re on {planName(billingPlan)}{planEnd ? ` until ${longDay(planEnd)}` : ''}.</p>
            )}
            {billingStatus === 'failed' && (
              <p className="pl-banner err" role="alert">The payment didn’t go through, so nothing was charged. You can try again below.</p>
            )}

            <section className="pl-now" aria-labelledby="pl-now">
              <div>
                <div className="pl-kicker">Your plan</div>
                <h3 id="pl-now">{planName(currentPlan)}</h3>
              </div>
              {currentPlan === 'free' ? (
                <div className="pl-usage">
                  <div className="pl-meter" role="img" aria-label={`${usedThisMonth} of ${FREE_MONTHLY_LIMIT} free invoices used this month`}>
                    {Array.from({ length: FREE_MONTHLY_LIMIT }, (_, i) => <span key={i} className={i < usedThisMonth ? 'on' : ''} />)}
                  </div>
                  <p>{Math.min(usedThisMonth, FREE_MONTHLY_LIMIT)} of {FREE_MONTHLY_LIMIT} invoices used this month.{usedThisMonth >= FREE_MONTHLY_LIMIT ? ' Upgrade to send more before the month ends.' : ''}</p>
                </div>
              ) : planEnd ? (
                <div className="pl-usage">
                  <p><b>{daysLeft > 0 ? `Paid until ${longDay(planEnd)}` : 'Ends today'}</b>{daysLeft > 0 ? `, ${daysLeft === 1 ? '1 day' : `${daysLeft} days`} left.` : '.'}</p>
                  <p className="help">Plans don’t renew on their own. Pay for another month before then to keep {planName(currentPlan)}; otherwise your account moves to Free. We email you 3 days before it ends.</p>
                </div>
              ) : (
                <div className="pl-usage"><p>This plan has no end date.</p></div>
              )}
            </section>

            <section className="block" aria-labelledby="pl-all">
              <h3 id="pl-all">Plans</h3>
              <div className="pl-grid">
                {PLANS.map(p => {
                  const isCurrent = p.id === currentPlan
                  const paid = p.id !== 'free'
                  const label = isCurrent ? `Pay for another month` : `Switch to ${p.name}`
                  return (
                    <div key={p.id} className="pl-card" aria-current={isCurrent ? 'true' : undefined}>
                      <div className="pl-head">
                        <b>{p.name}</b>
                        {isCurrent && <span className="pm-pref">Your plan</span>}
                      </div>
                      <div className="pl-price">P{p.price}{p.price ? <small> a month</small> : null}</div>
                      <p>{p.includes}</p>
                      {paid && (isCurrent ? !!planEnd : true) && (
                        <button type="button" className={isCurrent ? 'btn-line press' : 'save press'} disabled={!!upgrading} onClick={() => upgradePlan(p.id as 'pro' | 'business')}>
                          {upgrading === p.id ? 'Opening payment…' : label}
                        </button>
                      )}
                      {paid && !isCurrent && currentPlan !== 'free' && planEnd && daysLeft > 0 && (
                        <span className="help">Starts today. The days left on {planName(currentPlan)} aren’t carried over.</span>
                      )}
                      {isCurrent && paid && planEnd && <span className="help">Adds 30 days to {longDay(planEnd)}.</span>}
                    </div>
                  )
                })}
              </div>
              {upgradeError && <p className="save-note err" role="alert" style={{ marginTop: 12 }}>{upgradeError}</p>}
              <p className="help" style={{ marginTop: 14 }}>You pay in Pula on DPO’s secure payment page, then come straight back here. Each payment covers 30 days.</p>
            </section>
          </div>

          {/* ── TEAM MEMBERS ── */}
          <div className={`settings-panel${panel === 'team' ? ' active' : ''}`}>
            <PanelHead title="Team members" sub="Work on one business with the people you employ." />

            {!TEAMS_ENABLED ? (
              <section className="pl-now" style={{ gridTemplateColumns: '1fr' }} aria-labelledby="tm-soon">
                <div className="pl-usage">
                  <div className="pl-kicker">Coming soon</div>
                  <p id="tm-soon"><b>Shared team accounts</b></p>
                  <p className="help">Up to {TEAM_SEATS} people working on the same business: one client list, one set of invoices and one brand. Everyone signs in with their own email, each invoice shows who created it, and you choose who can change settings and billing. It comes with the Business plan.</p>
                </div>
              </section>
            ) : (
              <>
                {role !== 'owner' ? (
                  <p className="tm-note">You’re {ROLE_LABEL[role]} in {businessName}. Only the owner can invite or remove people and change roles.</p>
                ) : profile?.plan !== 'business' ? (
                  <p className="tm-note">Team accounts come with the Business plan. <button type="button" className="pm-link" onClick={() => setPanel('plan')}>See plans</button></p>
                ) : (
                  <p className="tm-note">Everyone you add works in {businessName}: the same clients, invoices and brand. They sign in with their own email, and their own StagePay business, if they have one, stays separate.</p>
                )}

                {role === 'owner' && profile?.plan === 'business' && (
                  <>
                    <section className="block" aria-labelledby="tm-seats">
                      <h3 id="tm-seats">Places</h3>
                      <div className="pl-meter" role="img" aria-label={`${seatsUsed} of ${TEAM_SEATS} places used`} style={{ maxWidth: 320 }}>
                        {Array.from({ length: TEAM_SEATS }, (_, i) => <span key={i} className={i < seatsUsed ? 'on' : ''} />)}
                      </div>
                      <p className="help">{seatsUsed} of {TEAM_SEATS} used, counting you{teamMembers.some(m => m.status === 'pending') ? ' and invites not yet accepted' : ''}.</p>
                    </section>

                    <section className="block" aria-labelledby="tm-invite">
                      <h3 id="tm-invite">Invite someone</h3>
                      <p>StagePay doesn’t email the invite. You get a link to send them yourself, on WhatsApp or anywhere else.</p>
                      {teamFull ? (
                        <p className="help">Your team is full. Remove someone to free a place.</p>
                      ) : (
                        <form className="tm-invite" method="post" onSubmit={e => { e.preventDefault(); sendInvite() }}>
                          <div className="fld" style={{ flex: 1 }}>
                            <label htmlFor="invite-email">Their email</label>
                            <input id="invite-email" name="invite-email" type="email" className="in" autoComplete="off"
                              value={inviteEmail} disabled={inviting}
                              onChange={e => { setInviteEmail(e.target.value); setInviteError(''); setInviteLink(null) }} />
                          </div>
                          <div className="fld">
                            <label htmlFor="invite-role">Role</label>
                            <select id="invite-role" name="invite-role" className="in" value={inviteRole} onChange={e => setInviteRole(e.target.value as TeamRole)}>
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </select>
                          </div>
                          <button type="submit" className="save press" disabled={inviting || !inviteEmail.trim()}>{inviting ? 'Creating…' : 'Create invite link'}</button>
                        </form>
                      )}
                      {!teamFull && <p className="help" style={{ marginTop: 8 }}>{ROLE_LABEL[inviteRole]}: {ROLE_HELP[inviteRole]}</p>}
                      {inviteError && <p className="save-note err" role="alert" style={{ marginTop: 10 }}>{inviteError}</p>}
                      {inviteLink && (
                        <div className="tm-link" role="status">
                          <p>Invite ready. Send this link; it works once.</p>
                          <code>{inviteLink}</code>
                          <div className="sec-actions">
                            <button type="button" className="btn-line press" onClick={() => copyLink(inviteLink, 'new')}>{copiedId === 'new' ? 'Copied' : 'Copy link'}</button>
                            <a className="btn-line press tm-wa" href={`https://wa.me/?text=${encodeURIComponent(`Join ${businessName} on StagePay: ${inviteLink}`)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
                          </div>
                        </div>
                      )}
                    </section>
                  </>
                )}

                <section className="block" aria-labelledby="tm-list">
                  <h3 id="tm-list">People</h3>
                  {!teamLoaded ? (
                    <p className="help" role="status">Loading…</p>
                  ) : (
                    <ul className="tm-list">
                      <li>
                        <span className="tm-av" aria-hidden="true">{(role === 'owner' ? (profile?.name || profile?.email || '?') : businessName)[0].toUpperCase()}</span>
                        <div className="tm-who">
                          <b>{role === 'owner' ? (profile?.name || 'You') : `${businessName}’s owner`}</b>
                          <span>{role === 'owner' ? profile?.email : 'Manages billing and the team'}</span>
                        </div>
                        <span className="pm-pref">Owner</span>
                      </li>
                      {teamMembers.map(m => (
                        <li key={m.id}>
                          <span className="tm-av" aria-hidden="true">{m.email[0].toUpperCase()}</span>
                          <div className="tm-who">
                            <b>{m.email}</b>
                            <span>{m.status === 'active'
                              ? `Joined ${m.joined_at ? new Date(m.joined_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`
                              : `Invited ${new Date(m.invited_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, hasn’t joined yet`}</span>
                          </div>
                          {role === 'owner' ? (
                            <select className="in tm-role" aria-label={`Role for ${m.email}`} value={m.role} disabled={roleSaving === m.id}
                              onChange={e => changeRole(m.id, e.target.value as TeamRole)}>
                              <option value="staff">Staff</option>
                              <option value="admin">Admin</option>
                            </select>
                          ) : (
                            <span className="pm-pref">{ROLE_LABEL[m.role]}</span>
                          )}
                          {role === 'owner' && (confirmRemove === m.id ? (
                            <div className="tm-confirm">
                              <span className="help">{m.status === 'active' ? 'They lose access to this business.' : 'The invite link will stop working.'}</span>
                              <button type="button" className="btn-line" onClick={() => setConfirmRemove(null)}>Keep</button>
                              <button type="button" className="sec-danger press" disabled={removingId === m.id} onClick={() => removeMember(m.id)}>{removingId === m.id ? 'Removing…' : m.status === 'active' ? 'Remove' : 'Cancel invite'}</button>
                            </div>
                          ) : (
                            <div className="tm-actions">
                              {m.status === 'pending' && m.invite_token && (
                                <button type="button" className="pm-link" onClick={() => copyLink(`${window.location.origin}/join/${m.invite_token}`, m.id)}>{copiedId === m.id ? 'Copied' : 'Copy link'}</button>
                              )}
                              <button type="button" className="pm-link" onClick={() => setConfirmRemove(m.id)}>{m.status === 'active' ? 'Remove' : 'Cancel invite'}</button>
                            </div>
                          ))}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(removeError || roleError) && <p className="save-note err" role="alert" style={{ marginTop: 10 }}>{removeError || roleError}</p>}
                  {teamLoaded && teamMembers.length === 0 && <p className="help" style={{ marginTop: 10 }}>Nobody else yet.</p>}
                </section>
              </>
            )}
          </div>

          {/* ── SECURITY ── */}
          <div className={`settings-panel${panel === 'security' ? ' active' : ''}`}>
            <PanelHead title="Security" sub="Keep other people out of your account." />

            <section className="block" aria-labelledby="sec-2fa">
              <h3 id="sec-2fa">Two-step sign-in</h3>
              <p>After your password, StagePay asks for a 6-digit code from an authenticator app on your phone, such as Google Authenticator or Authy. Someone who learns your password still can’t get in.</p>
              <div className="sec-row">
                <div>
                  <b className={mfaOn ? 'sec-on' : ''}>{mfaOn === null ? 'Checking…' : mfaOn ? 'On' : 'Off'}</b>
                  <span className="help">{mfaOn ? 'You’re asked for a code each time you sign in.' : mfaOn === false ? 'Only your password protects this account.' : ''}</span>
                </div>
                {mfaOn !== null && (
                  mfaOn
                    ? <button type="button" className="btn-line press" disabled={mfaBusy} onClick={() => { setMfaError(''); setMfaModal('unenroll') }}>Turn off</button>
                    : <button type="button" className="save press" disabled={mfaBusy} onClick={startEnroll2FA}>{mfaBusy ? 'Starting…' : 'Turn on'}</button>
                )}
              </div>
              {mfaNote && <p className={`save-note${/is (on|off)\.$/.test(mfaNote) ? ' ok' : ' err'}`} role="status" style={{ marginTop: 10 }}>{mfaNote}</p>}
            </section>

            <section className="block" aria-labelledby="sec-pw">
              <h3 id="sec-pw">Password</h3>
              <form className="grid2" onSubmit={e => { e.preventDefault(); changePassword() }} method="post">
                <input type="email" name="username" autoComplete="username" value={profile?.email ?? ''} readOnly hidden />
                <div className="fld">
                  <label htmlFor="sec-pw-new">New password</label>
                  <input id="sec-pw-new" name="new-password" className="in" type="password" autoComplete="new-password" value={pw.next} onChange={e => { setPw(p => ({ ...p, next: e.target.value })); setPwMsg(null) }} />
                </div>
                <div className="fld">
                  <label htmlFor="sec-pw-again">Type it again</label>
                  <input id="sec-pw-again" name="confirm-password" className="in" type="password" autoComplete="new-password" value={pw.again} onChange={e => { setPw(p => ({ ...p, again: e.target.value })); setPwMsg(null) }} />
                </div>
                <div className="full sec-actions">
                  <button type="submit" className="btn-line press" disabled={pwBusy || pw.next.length < 8 || pw.next !== pw.again}>{pwBusy ? 'Changing…' : 'Change password'}</button>
                  {pwProblem ? <span className="save-note err">{pwProblem}</span>
                    : pwMsg ? <span className={`save-note ${pwMsg.ok ? 'ok' : 'err'}`} role="status">{pwMsg.text}</span>
                    : <span className="help">At least 8 characters.</span>}
                </div>
              </form>
            </section>

            <section className="block" aria-labelledby="sec-sess">
              <h3 id="sec-sess">Signed-in devices</h3>
              <p>Lost a phone, or signed in on someone else’s computer? Sign out everywhere except here.</p>
              <div className="sec-actions">
                <button type="button" className="btn-line press" disabled={!!signingOut || othersDone} onClick={() => signOut('others')}>
                  {signingOut === 'others' ? 'Signing out…' : othersDone ? 'Other devices signed out' : 'Sign out other devices'}
                </button>
                <button type="button" className="pm-link" disabled={!!signingOut} onClick={() => signOut('local')}>
                  {signingOut === 'here' ? 'Signing out…' : 'Sign out of this device'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* ── Two-step sign-in: set up ── */}
      {mfaModal === 'enroll' && (
        <div className="sec-backdrop" role="dialog" aria-modal="true" aria-labelledby="mfa-title">
          <div className="sec-modal">
            <h2 id="mfa-title">Set up two-step sign-in</h2>
            <ol className="sec-steps">
              <li>Open your authenticator app and add an account.</li>
              <li>Scan this code, or type in the key below it.</li>
              <li>Enter the 6-digit code the app shows.</li>
            </ol>
            {mfaQr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mfaQr} alt="QR code to scan with your authenticator app" width={168} height={168} className="sec-qr" />
            )}
            <p className="help sec-key">Key: <span>{mfaSecret}</span></p>
            <label htmlFor="s-mfa-code" className="sec-label">6-digit code</label>
            <input
              id="s-mfa-code"
              name="mfa_code"
              className="in sec-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={mfaCode}
              autoFocus
              onChange={e => { setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setMfaError('') }}
              onKeyDown={e => { if (e.key === 'Enter') confirmEnroll2FA() }}
            />
            {mfaError && <p className="save-note err" role="alert">{mfaError}</p>}
            <div className="sec-modal-foot">
              <button type="button" className="btn-line" onClick={cancelEnroll2FA}>Cancel</button>
              <button type="button" className="save press" disabled={mfaCode.length !== 6 || mfaBusy} onClick={confirmEnroll2FA}>
                {mfaBusy ? 'Checking…' : 'Turn on'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Two-step sign-in: turn off ── */}
      {mfaModal === 'unenroll' && (
        <div className="sec-backdrop" role="dialog" aria-modal="true" aria-labelledby="mfa-off-title">
          <div className="sec-modal" style={{ maxWidth: 400 }}>
            <h2 id="mfa-off-title">Turn off two-step sign-in?</h2>
            <p className="sec-copy">Only your password will protect your account. You can turn it back on any time.</p>
            {mfaError && <p className="save-note err" role="alert">{mfaError}</p>}
            <div className="sec-modal-foot">
              <button type="button" className="btn-line" onClick={() => { setMfaModal(null); setMfaError('') }}>Keep it on</button>
              <button type="button" className="sec-danger press" disabled={mfaBusy} onClick={unenroll2FA}>{mfaBusy ? 'Turning off…' : 'Turn off'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

