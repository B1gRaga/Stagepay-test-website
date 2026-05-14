'use client'
import { useEffect, useState, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'
import { THEME_PRESETS, THEME_ORDER, resolveTheme, type InvoiceTheme } from '@/lib/invoice-themes'

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
}

type Panel = 'brand' | 'firm' | 'invoice' | 'payment' | 'notifs' | 'plan' | 'security'

const PANELS: { id: Panel; label: string; dot: string; dotStyle?: object }[] = [
  { id: 'brand',    label: 'Branding',          dot: '#10B981' },
  { id: 'firm',     label: 'Firm details',       dot: '#3B82F6' },
  { id: 'invoice',  label: 'Invoice defaults',   dot: '#F59E0B' },
  { id: 'payment',  label: 'Payment & banking',  dot: '#10B981' },
  { id: 'notifs',   label: 'Notifications',      dot: '#8B5CF6' },
  { id: 'plan',     label: 'Plan & billing',     dot: '#10B981' },
  { id: 'security', label: 'Security',           dot: '#EF4444' },
]

const VAT_COUNTRIES = [
  { g: 'Southern Africa', opts: [
    { v: 'BW', l: 'Botswana — 14% VAT',       rate: 14,   sym: 'P'   },
    { v: 'ZA', l: 'South Africa — 15% VAT',   rate: 15,   sym: 'R'   },
    { v: 'ZW', l: 'Zimbabwe — 15% VAT',       rate: 15,   sym: 'ZWL' },
    { v: 'NA', l: 'Namibia — 15% VAT',        rate: 15,   sym: 'N$'  },
    { v: 'ZM', l: 'Zambia — 16% VAT',         rate: 16,   sym: 'K'   },
    { v: 'MZ', l: 'Mozambique — 17% VAT',     rate: 17,   sym: 'MT'  },
    { v: 'LS', l: 'Lesotho — 15% VAT',        rate: 15,   sym: 'LSL' },
    { v: 'SZ', l: 'Eswatini — 15% VAT',       rate: 15,   sym: 'SZL' },
    { v: 'MW', l: 'Malawi — 16.5% VAT',       rate: 16.5, sym: 'MK'  },
    { v: 'MG', l: 'Madagascar — 20% VAT',     rate: 20,   sym: 'Ar'  },
  ]},
  { g: 'East Africa', opts: [
    { v: 'KE', l: 'Kenya — 16% VAT',          rate: 16,   sym: 'KSh' },
    { v: 'TZ', l: 'Tanzania — 18% VAT',       rate: 18,   sym: 'TSh' },
    { v: 'UG', l: 'Uganda — 18% VAT',         rate: 18,   sym: 'UGX' },
    { v: 'RW', l: 'Rwanda — 18% VAT',         rate: 18,   sym: 'RWF' },
    { v: 'ET', l: 'Ethiopia — 15% VAT',       rate: 15,   sym: 'ETB' },
  ]},
  { g: 'West Africa', opts: [
    { v: 'NG', l: 'Nigeria — 7.5% VAT',       rate: 7.5,  sym: '₦'   },
    { v: 'GH', l: 'Ghana — 15% VAT',          rate: 15,   sym: 'GH₵' },
    { v: 'SN', l: 'Senegal — 18% VAT',        rate: 18,   sym: 'CFA' },
    { v: 'CI', l: "Côte d'Ivoire — 18% VAT",  rate: 18,   sym: 'CFA' },
  ]},
  { g: 'Europe', opts: [
    { v: 'GB', l: 'United Kingdom — 20% VAT', rate: 20,   sym: '£'   },
    { v: 'DE', l: 'Germany — 19% VAT',        rate: 19,   sym: '€'   },
    { v: 'FR', l: 'France — 20% VAT',         rate: 20,   sym: '€'   },
    { v: 'NL', l: 'Netherlands — 21% VAT',    rate: 21,   sym: '€'   },
    { v: 'SE', l: 'Sweden — 25% VAT',         rate: 25,   sym: 'kr'  },
    { v: 'CH', l: 'Switzerland — 8.1% VAT',   rate: 8.1,  sym: 'CHF' },
  ]},
  { g: 'Middle East', opts: [
    { v: 'AE', l: 'UAE — 5% VAT',             rate: 5,    sym: 'AED' },
    { v: 'SA', l: 'Saudi Arabia — 15% VAT',   rate: 15,   sym: 'SAR' },
    { v: 'QA', l: 'Qatar — 0% (no VAT)',      rate: 0,    sym: 'QAR' },
  ]},
  { g: 'Americas', opts: [
    { v: 'US', l: 'United States — 0%',       rate: 0,    sym: '$'   },
    { v: 'CA', l: 'Canada — 5% GST',          rate: 5,    sym: 'CA$' },
    { v: 'AU', l: 'Australia — 10% GST',      rate: 10,   sym: 'A$'  },
    { v: 'NZ', l: 'New Zealand — 15% GST',    rate: 15,   sym: 'NZ$' },
    { v: 'IN', l: 'India — 18% GST',          rate: 18,   sym: '₹'   },
    { v: 'SG', l: 'Singapore — 9% GST',       rate: 9,    sym: 'S$'  },
  ]},
]

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
:root{
    --g:#10B981;--g2:#059669;--g-dim:rgba(16,185,129,0.1);
    --bg:#0F172A;--bg2:#1E293B;--surface:#263244;--surface2:#2d3a50;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#F8FAFC;--t2:rgba(248,250,252,0.6);--t3:rgba(248,250,252,0.3);
    --danger:#EF4444;--warn:#F59E0B;--info:#3B82F6;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Archivo',sans-serif;background:var(--bg);color:var(--t1);}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes panelIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 28px;background:var(--bg2);}
  .page-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2.5px;color:var(--t1);}

  .settings-wrap{padding:0 28px 24px;height:calc(100vh - 80px);}
  .settings-layout{
    display:grid;grid-template-columns:190px 1fr;gap:0;
    height:100%;border:1px solid var(--line);border-radius:10px;
    overflow:hidden;background:var(--bg2);
  }
  .settings-nav{border-right:1px solid var(--line);padding:12px 0;overflow-y:auto;flex-shrink:0;}
  .settings-nav-item{
    display:flex;align-items:center;gap:10px;
    padding:10px 16px;font-size:13px;color:var(--t2);
    cursor:pointer;transition:all .15s;
    border-left:3px solid transparent;
  }
  .settings-nav-item:hover{background:var(--surface);color:var(--t1);}
  .settings-nav-item.active{background:var(--g-dim);color:var(--g);border-left-color:var(--g);}
  .settings-panel{display:none;padding:28px 32px;overflow-y:auto;height:100%;}
  .settings-panel.active{display:block;animation:panelIn .25s ease both;}

  .settings-panel-hero{
    display:flex;align-items:center;gap:16px;
    padding:20px 24px;margin:-28px -32px 28px;
    border-bottom:1px solid var(--line);
  }
  .settings-panel-hero-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .settings-panel-hero-title{font-family:'Bebas Neue',sans-serif;font-size:24px;letter-spacing:2px;color:var(--t1);line-height:1;}
  .settings-panel-hero-sub{font-size:12px;color:var(--t3);margin-top:3px;line-height:1.5;}
  .settings-panel-hero-badge{margin-left:auto;font-size:11px;font-weight:600;padding:4px 12px;border-radius:999px;white-space:nowrap;}

  .settings-section{margin-bottom:28px;padding-bottom:28px;border-bottom:1px solid var(--line);position:relative;}
  .settings-section:last-child{border-bottom:none;margin-bottom:0;padding-bottom:0;}
  .settings-section::before{content:'';position:absolute;left:-32px;top:0;width:3px;height:0;background:var(--g);border-radius:0 2px 2px 0;transition:height .3s ease;}
  .settings-section:hover::before{height:100%;}
  .settings-section-title{font-family:'Bebas Neue',sans-serif;font-size:17px;letter-spacing:1.5px;color:var(--t1);margin-bottom:4px;display:flex;align-items:center;gap:10px;}
  .settings-section-badge{font-family:'Archivo',sans-serif;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:2px 8px;border-radius:3px;}
  .settings-section-desc{font-size:12px;color:var(--t3);margin-bottom:18px;line-height:1.6;}

  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .form-group{display:flex;flex-direction:column;gap:5px;}
  .form-group.full{grid-column:1/-1;}
  .form-label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);font-weight:600;}
  .form-input,.form-select,.form-textarea{
    background:var(--surface);border:1px solid var(--line2);
    border-radius:7px;padding:10px 12px;
    font-family:'Archivo',sans-serif;font-size:13px;color:var(--t1);
    outline:none;transition:border-color .2s, box-shadow .2s;width:100%;
  }
  .form-input:focus,.form-select:focus,.form-textarea:focus{
    border-color:rgba(16,185,129,.45);
    box-shadow:0 0 0 3px rgba(16,185,129,.07);
  }
  .form-textarea{resize:vertical;min-height:80px;}
  .form-select option,.form-select optgroup{background:var(--bg2);color:var(--t1);}

  .topbar-btn{display:inline-flex;align-items:center;gap:7px;padding:8px 18px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;transition:all .15s;border:1px solid var(--line2);letter-spacing:.05em;text-transform:uppercase;font-family:'Archivo',sans-serif;text-decoration:none;background:transparent;color:var(--t2);}
  .topbar-btn:hover{border-color:var(--g);color:var(--g);}
  .btn-primary{background:var(--g);color:var(--bg);border-color:var(--g);box-shadow:0 2px 8px rgba(16,185,129,.2);}
  .btn-primary:hover{background:#34d399;border-color:#34d399;color:var(--bg);}
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
  .sec-badge-fixed {background:rgba(16,185,129,.12);color:#10B981;border:1px solid rgba(16,185,129,.3);}

  .plan-card{background:var(--surface);border:1px solid var(--line2);border-radius:8px;padding:12px 14px;display:flex;flex-direction:column;align-items:flex-start;gap:6px;}

  .logo-zone{
    border:2px dashed var(--line2);border-radius:10px;
    padding:28px;text-align:center;cursor:pointer;
    transition:border-color .2s;margin-bottom:4px;
  }
  .logo-zone:hover{border-color:rgba(16,185,129,.4);}
  .logo-zone-icon{font-size:22px;margin-bottom:8px;opacity:.5;}
  .logo-zone-label{font-size:13px;color:var(--t2);font-weight:500;}
  .logo-zone-sub{font-size:11px;color:var(--t3);margin-top:4px;}

  .success-toast{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);border-radius:6px;font-size:12px;color:#34d399;font-weight:600;}

  .loading-spinner{display:flex;align-items:center;justify-content:center;padding:80px;gap:10px;color:var(--t3);font-size:13px;}

  @media(max-width:900px){
    .settings-layout{grid-template-columns:1fr;grid-template-rows:auto 1fr;}
    .settings-nav{border-right:none;border-bottom:1px solid var(--line);padding:6px;display:flex;overflow-x:auto;gap:0;}
    .settings-nav-item{white-space:nowrap;border-left:none;border-radius:8px;padding:8px 14px;border-bottom:2px solid transparent;font-size:12px;min-width:auto;}
    .settings-nav-item.active{border-left-color:transparent;border-bottom-color:var(--g);background:var(--g-dim);}
    .settings-panel{max-height:none;padding:20px 16px;}
    .settings-panel-hero{margin:-20px -16px 20px;padding:16px;}
    .settings-section::before{display:none;}
    .form-grid{grid-template-columns:1fr;}
  }
  @media(max-width:600px){
    .settings-wrap{padding:0 0 24px;}
  }

  .theme-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-bottom:20px;}
  @media(max-width:700px){.theme-grid{grid-template-columns:repeat(3,1fr);}}
  .theme-card{cursor:pointer;border-radius:8px;overflow:hidden;border:2px solid transparent;transition:border-color .15s,transform .1s;}
  .theme-card:hover{transform:scale(1.03);}
  .theme-card.selected{border-color:var(--g);box-shadow:0 0 0 3px rgba(16,185,129,.15);}
  .theme-card-name{text-align:center;font-size:10px;padding:4px 4px 6px;color:var(--t3);background:var(--surface);font-weight:400;font-family:'Archivo',sans-serif;}
  .theme-card.selected .theme-card-name{color:var(--g);font-weight:600;}

  .color-fields{display:flex;gap:14px;margin-bottom:20px;flex-wrap:wrap;}
  .color-field{flex:1;min-width:160px;}
  .color-field-label{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:6px;}
  .color-field-row{display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--line2);border-radius:7px;padding:6px 10px;transition:border-color .2s,box-shadow .2s;}
  .color-field-row:focus-within{border-color:rgba(16,185,129,.45);box-shadow:0 0 0 3px rgba(16,185,129,.07);}
  .color-field-hex{flex:1;background:none;border:none;outline:none;font-size:13px;color:var(--t1);font-family:'Courier New',monospace;min-width:0;}
  .color-field-hint{font-size:10px;color:var(--t3);margin-top:4px;}
  .color-clear-btn{background:none;border:none;cursor:pointer;color:var(--t3);font-size:16px;padding:0;line-height:1;flex-shrink:0;}
  .color-clear-btn:hover{color:var(--t1);}

  .preview-wrap{background:#f0f0f0;border-radius:10px;padding:16px;margin-bottom:4px;display:flex;align-items:center;justify-content:center;}
  .preview-label{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;font-weight:600;margin-bottom:10px;}
`

function BrandingColorField({
  label, value, placeholder, onChange
}: {
  label: string
  value: string
  placeholder: string
  onChange: (v: string) => void
}) {
  const isValid = /^#[0-9a-f]{6}$/i.test(value)
  const swatchColor = isValid ? value : placeholder
  return (
    <div className="color-field">
      <div className="color-field-label">{label}</div>
      <div className="color-field-row">
        <input
          type="color"
          value={swatchColor}
          onChange={e => onChange(e.target.value)}
          style={{ width: 26, height: 26, borderRadius: 5, border: 'none', padding: 0, cursor: 'pointer', flexShrink: 0, background: 'none' }}
          title="Pick a colour"
        />
        <input
          type="text"
          className="color-field-hex"
          value={value}
          placeholder={placeholder}
          maxLength={7}
          onChange={e => onChange(e.target.value)}
          spellCheck={false}
        />
        {value && (
          <button className="color-clear-btn" onClick={() => onChange('')} title="Reset to theme default">×</button>
        )}
      </div>
      <div className="color-field-hint">
        {value ? (isValid ? `Custom · ${value}` : 'Enter a valid hex e.g. #10B981') : `Theme default: ${placeholder}`}
      </div>
    </div>
  )
}

function InvoicePreviewMock({ theme: t, firmName }: { theme: InvoiceTheme; firmName: string }) {
  const fw = (n: number) => ({ fontWeight: n } as const)
  const uc = { textTransform: 'uppercase' as const }
  return (
    <div style={{ background: t.pageBg, borderRadius: 6, overflow: 'hidden', fontFamily: 'Arial,sans-serif', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,.18)', fontSize: 9 }}>

      {/* Header */}
      <div style={{ background: t.headerBg, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ color: t.headerFirmColor, ...fw(700), fontSize: 13, letterSpacing: 0.5 }}>{firmName}</div>
          <div style={{ color: t.headerSubColor, fontSize: 8, marginTop: 2 }}>Gaborone, Botswana</div>
          <div style={{ color: t.headerSubColor, fontSize: 8, marginTop: 1 }}>info@yourfirm.co.bw</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: t.headerFirmColor, ...fw(700), fontSize: 18, letterSpacing: 2 }}>INVOICE</div>
          <div style={{ color: t.headerSubColor, fontSize: 8, marginTop: 2 }}>INV-0042</div>
          <div style={{ color: t.headerSubColor, fontSize: 8, marginTop: 1 }}>Due: 2026-06-01</div>
        </div>
      </div>

      <div style={{ padding: '10px 14px', background: t.pageBg }}>
        {/* FROM / BILL TO */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {(['From', 'Bill To'] as const).map((lbl, i) => (
            <div key={lbl} style={{ flex: 1, background: t.boxBg, padding: '6px 8px', borderRadius: 3 }}>
              <div style={{ color: t.accentColor, fontSize: 7, ...fw(700), ...uc, letterSpacing: 0.8, marginBottom: 4 }}>{lbl}</div>
              <div style={{ color: t.bodyText, ...fw(600), fontSize: 9 }}>{i === 0 ? (firmName || 'Your Firm') : 'Acme Corp'}</div>
              <div style={{ color: '#64748B', fontSize: 8, marginTop: 2 }}>{i === 0 ? 'Gaborone, BW' : 'client@acme.com'}</div>
            </div>
          ))}
        </div>

        {/* Table header */}
        <div style={{ background: t.tableHeadBg, padding: '5px 8px', display: 'flex' }}>
          <span style={{ flex: 4, color: t.tableHeadText, fontSize: 8, ...fw(700) }}>Description</span>
          <span style={{ flex: 1, color: t.tableHeadText, fontSize: 8, ...fw(700), textAlign: 'right' as const }}>Qty</span>
          <span style={{ flex: 1.4, color: t.tableHeadText, fontSize: 8, ...fw(700), textAlign: 'right' as const }}>Amount</span>
        </div>

        {/* Rows */}
        {[
          { desc: 'Design services (4 hrs)', qty: '4', amt: 'P1,000.00', alt: false },
          { desc: 'Strategy consulting (2 hrs)', qty: '2', amt: 'P1,000.00', alt: true },
        ].map(row => (
          <div key={row.desc} style={{ padding: '4px 8px', display: 'flex', background: row.alt ? t.tableRowAltBg : t.pageBg, borderBottom: `1px solid ${t.lineColor}` }}>
            <span style={{ flex: 4, color: t.bodyText, fontSize: 8 }}>{row.desc}</span>
            <span style={{ flex: 1, color: '#64748B', fontSize: 8, textAlign: 'right' as const }}>{row.qty}</span>
            <span style={{ flex: 1.4, color: t.bodyText, fontSize: 8, textAlign: 'right' as const }}>{row.amt}</span>
          </div>
        ))}

        {/* Totals */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <div style={{ width: '44%' }}>
            {[['Subtotal', 'P2,000.00'], ['VAT (14%)', 'P280.00']].map(([lbl, val]) => (
              <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', paddingBlock: '2px' }}>
                <span style={{ color: '#64748B', fontSize: 8 }}>{lbl}</span>
                <span style={{ color: t.bodyText, fontSize: 8 }}>{val}</span>
              </div>
            ))}
            <div style={{ background: t.grandRowBg, borderRadius: 3, padding: '5px 8px', marginTop: 4, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: t.grandRowText, fontSize: 9, ...fw(700) }}>Balance Due</span>
              <span style={{ color: t.grandRowText, fontSize: 9, ...fw(700) }}>P2,280.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${t.lineColor}`, padding: '5px 14px', display: 'flex', justifyContent: 'space-between', background: t.pageBg }}>
        <span style={{ color: t.footerTextColor, fontSize: 7 }}>Generated by StagePay</span>
        <span style={{ color: t.footerTextColor, fontSize: 7 }}>INV-0042</span>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [loading, setLoading]   = useState(true)
  const [panel,   setPanel]     = useState<Panel>('brand')
  const [saving,    setSaving]    = useState(false)
  const [saved,     setSaved]     = useState<Panel | null>(null)
  const [upgrading, setUpgrading] = useState<string | null>(null)

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

  // Branding state
  const [branding, setBranding] = useState({ invoice_theme: 'dark-modern', brand_color_primary: '', brand_color_header: '' })
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoError,     setLogoError]     = useState('')
  const logoInputRef = useRef<HTMLInputElement>(null)

  // Firm details form state
  const [firm, setFirm] = useState({ name: '', firm_name: '', phone: '', address: '', city: '', country: 'BW', vat_number: '' })

  // Invoice defaults form state
  const [inv, setInv] = useState({ default_currency: 'P', default_vat_rate: '14', tax_label: 'VAT' })

  // Notification toggles (local only for now)
  const [notifs, setNotifs] = useState({ viewed: true, paid: true, overdue: true, reminder: false, weekly: true })

  useEffect(() => {
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
        setFirm({
          name:       p.name       ?? '',
          firm_name:  p.firm_name  ?? '',
          phone:      p.phone      ?? '',
          address:    p.address    ?? '',
          city:       p.city       ?? '',
          country:    p.country    ?? 'BW',
          vat_number: p.vat_number ?? '',
        })
        setInv({
          default_currency: p.default_currency ?? 'P',
          default_vat_rate: String(p.default_vat_rate ?? 14),
          tax_label:        p.tax_label ?? 'VAT',
        })
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function save(fields: Record<string, unknown>, panelId: Panel) {
    setSaving(true)
    try {
      const res  = await fetch('/api/profile', { method: 'PATCH', credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(fields) })
      const data = await res.json()
      if (res.ok) {
        setProfile(prev => prev ? { ...prev, ...data.profile } : data.profile)
        setSaved(panelId)
        setTimeout(() => setSaved(null), 2500)
      }
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

  function onVatCountryChange(val: string) {
    const all = VAT_COUNTRIES.flatMap(g => g.opts)
    const match = all.find(o => o.v === val)
    if (!match) return
    setInv(p => ({ ...p, default_vat_rate: String(match.rate) }))
  }

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="topbar"><div className="page-title">SETTINGS</div></div>
      <div className="loading-spinner">
        <span style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,.1)', borderTopColor: 'var(--g)', animation: 'spin .7s linear infinite', display: 'inline-block' }}/>
        Loading settings…
      </div>
    </>
  )

  return (
    <>
      <style>{CSS}</style>
      <div className="topbar"><div className="page-title">SETTINGS</div></div>

      <div className="settings-wrap" style={{ paddingTop: 24 }}>
        <div className="settings-layout">
          {/* Left nav */}
          <div className="settings-nav">
            {PANELS.map(p => (
              <div
                key={p.id}
                className={`settings-nav-item${panel === p.id ? ' active' : ''}`}
                onClick={() => setPanel(p.id)}
              >
                <span style={{ width: 8, height: 8, borderRadius: p.id === 'plan' ? 2 : '50%', background: p.dot, flexShrink: 0, display: 'inline-block', transform: p.id === 'plan' ? 'rotate(45deg)' : undefined, opacity: p.id === 'payment' ? .7 : 1 }}/>
                {p.label}
              </div>
            ))}
          </div>

          {/* ── BRANDING ── */}
          <div className={`settings-panel${panel === 'brand' ? ' active' : ''}`}>
            <div className="settings-panel-hero" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,.08) 0%,transparent 60%)' }}>
              <div className="settings-panel-hero-icon" style={{ background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.2)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><circle cx="12" cy="8" r="4"/><path d="M3 20c0-4 4-7 9-7s9 3 9 7"/></svg>
              </div>
              <div>
                <div className="settings-panel-hero-title">Branding</div>
                <div className="settings-panel-hero-sub">Your logo, colour and invoice template · Visible on every invoice you send</div>
              </div>
              <span className="settings-panel-hero-badge" style={{ background: 'var(--g-dim)', color: 'var(--g)', border: '1px solid rgba(16,185,129,.2)' }}>Visual identity</span>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">Logo <span className="settings-section-badge" style={{ background: 'rgba(16,185,129,.1)', color: 'var(--g)' }}>Upload</span></div>
              <div className="settings-section-desc">Upload your company logo. PNG or SVG recommended. Shows on all invoices and emails.</div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadLogo(f); e.target.value = '' }}
              />
              {profile?.logo_url ? (
                <div style={{ marginBottom: 16, padding: 16, background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line2)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src={profile.logo_url} alt="Logo" style={{ height: 48, objectFit: 'contain', borderRadius: 4 }}/>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600 }}>Logo uploaded</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>PNG, SVG, JPG · Max 2 MB</div>
                  </div>
                  <button
                    className="topbar-btn btn-outline"
                    style={{ fontSize: 11, padding: '5px 12px' }}
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >{logoUploading ? 'Uploading…' : 'Change'}</button>
                  <button
                    className="topbar-btn"
                    style={{ fontSize: 11, padding: '5px 12px', color: 'var(--danger)', borderColor: 'rgba(239,68,68,.3)' }}
                    disabled={logoUploading}
                    onClick={removeLogo}
                  >Remove</button>
                </div>
              ) : (
                <div
                  className="logo-zone"
                  style={{ cursor: logoUploading ? 'wait' : 'pointer' }}
                  onClick={() => !logoUploading && logoInputRef.current?.click()}
                >
                  <div className="logo-zone-icon">{logoUploading ? '…' : '⬆'}</div>
                  <div className="logo-zone-label">{logoUploading ? 'Uploading…' : 'Click to upload logo'}</div>
                  <div className="logo-zone-sub">PNG, SVG, JPG, WebP · Max 2 MB</div>
                </div>
              )}
              {logoError && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 6 }}>{logoError}</div>}
            </div>

            {/* ── Invoice template & colours ── */}
            <div className="settings-section">
              <div className="settings-section-title">
                Invoice template &amp; colours
                <span className="settings-section-badge" style={{ background: 'rgba(16,185,129,.1)', color: 'var(--g)' }}>Customise</span>
              </div>
              <div className="settings-section-desc">
                Choose a template that matches your brand, then fine-tune with custom accent and header colours. Changes apply to every invoice PDF you generate.
              </div>

              {/* Theme cards */}
              <div className="theme-grid">
                {THEME_ORDER.map(id => {
                  const t = THEME_PRESETS[id]
                  return (
                    <div
                      key={id}
                      className={`theme-card${branding.invoice_theme === id ? ' selected' : ''}`}
                      onClick={() => setBranding(p => ({ ...p, invoice_theme: id }))}
                    >
                      {/* Mini preview */}
                      <div style={{ background: t.pageBg }}>
                        <div style={{ background: t.headerBg, height: 26, padding: '4px 6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ width: 28, height: 5, background: t.headerFirmColor, borderRadius: 1, opacity: 0.9 }}/>
                            <div style={{ width: 18, height: 3, background: t.headerSubColor, borderRadius: 1, opacity: 0.5 }}/>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                            <div style={{ width: 22, height: 5, background: t.headerFirmColor, borderRadius: 1, opacity: 0.7 }}/>
                            <div style={{ width: 14, height: 3, background: t.headerSubColor, borderRadius: 1, opacity: 0.4 }}/>
                          </div>
                        </div>
                        <div style={{ padding: '4px 6px' }}>
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
                      <div className="theme-card-name">{t.name}</div>
                    </div>
                  )
                })}
              </div>

              {/* Custom colour overrides */}
              <div style={{ fontSize: 12, color: 'var(--t2)', fontWeight: 600, marginBottom: 10 }}>
                Custom colours <span style={{ fontWeight: 400, color: 'var(--t3)' }}>— override accent &amp; header (optional)</span>
              </div>
              <div className="color-fields">
                <BrandingColorField
                  label="Accent colour"
                  value={branding.brand_color_primary}
                  placeholder={THEME_PRESETS[branding.invoice_theme]?.accentColor ?? '#10B981'}
                  onChange={v => setBranding(p => ({ ...p, brand_color_primary: v }))}
                />
                <BrandingColorField
                  label="Header background"
                  value={branding.brand_color_header}
                  placeholder={THEME_PRESETS[branding.invoice_theme]?.headerBg ?? '#0F172A'}
                  onChange={v => setBranding(p => ({ ...p, brand_color_header: v }))}
                />
              </div>

              {/* Live preview */}
              <div className="preview-label">Live preview</div>
              <div className="preview-wrap">
                <InvoicePreviewMock
                  theme={resolveTheme(
                    branding.invoice_theme,
                    /^#[0-9a-f]{6}$/i.test(branding.brand_color_primary) ? branding.brand_color_primary : null,
                    /^#[0-9a-f]{6}$/i.test(branding.brand_color_header)  ? branding.brand_color_header  : null,
                  )}
                  firmName={firm.firm_name || firm.name || 'Your Firm'}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
                <button
                  className="topbar-btn btn-primary"
                  disabled={saving}
                  onClick={() => save({
                    invoice_theme:       branding.invoice_theme,
                    brand_color_primary: branding.brand_color_primary || null,
                    brand_color_header:  branding.brand_color_header  || null,
                  }, 'brand')}
                >
                  {saving ? 'Saving…' : 'Save branding'}
                </button>
                {saved === 'brand' && <span className="success-toast">✓ Saved</span>}
              </div>
            </div>
          </div>

          {/* ── FIRM DETAILS ── */}
          <div className={`settings-panel${panel === 'firm' ? ' active' : ''}`}>
            <div className="settings-panel-hero" style={{ background: 'linear-gradient(135deg,rgba(59,130,246,.07) 0%,transparent 60%)' }}>
              <div className="settings-panel-hero-icon" style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="1.8"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </div>
              <div>
                <div className="settings-panel-hero-title">Firm details</div>
                <div className="settings-panel-hero-sub">Business name, address, registration · Printed on every invoice</div>
              </div>
              <span className="settings-panel-hero-badge" style={{ background: 'rgba(59,130,246,.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,.2)' }}>Business info</span>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">Business information</div>
              <div className="settings-section-desc">This information appears on every invoice you send.</div>
              <div className="form-grid" style={{ maxWidth: 520 }}>
                <div className="form-group full">
                  <label className="form-label">Business / Firm name</label>
                  <input className="form-input" value={firm.firm_name} onChange={e => setFirm(p => ({ ...p, firm_name: e.target.value }))} placeholder="Your business name"/>
                </div>
                <div className="form-group full">
                  <label className="form-label">Your full name</label>
                  <input className="form-input" value={firm.name} onChange={e => setFirm(p => ({ ...p, name: e.target.value }))} placeholder="Your name"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone number</label>
                  <input className="form-input" value={firm.phone} onChange={e => setFirm(p => ({ ...p, phone: e.target.value }))} placeholder="e.g. +267 71 234 567"/>
                </div>
                <div className="form-group">
                  <label className="form-label">VAT / TIN number</label>
                  <input className="form-input" value={firm.vat_number} onChange={e => setFirm(p => ({ ...p, vat_number: e.target.value }))} placeholder="e.g. P03812345W"/>
                </div>
                <div className="form-group full">
                  <label className="form-label">Physical address</label>
                  <input className="form-input" value={firm.address} onChange={e => setFirm(p => ({ ...p, address: e.target.value }))} placeholder="Your business address"/>
                </div>
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-input" value={firm.city} onChange={e => setFirm(p => ({ ...p, city: e.target.value }))} placeholder="e.g. Gaborone"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Country</label>
                  <select className="form-select" value={firm.country} onChange={e => setFirm(p => ({ ...p, country: e.target.value }))}>
                    <option value="BW">Botswana</option><option value="ZA">South Africa</option>
                    <option value="ZW">Zimbabwe</option><option value="NA">Namibia</option>
                    <option value="KE">Kenya</option><option value="NG">Nigeria</option>
                    <option value="GH">Ghana</option><option value="GB">United Kingdom</option>
                    <option value="US">United States</option><option value="AE">UAE</option>
                    <option value="AU">Australia</option><option value="IN">India</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="topbar-btn btn-primary" disabled={saving} onClick={() => save({ ...firm }, 'firm')}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saved === 'firm' && <span className="success-toast">✓ Saved</span>}
            </div>
          </div>

          {/* ── INVOICE DEFAULTS ── */}
          <div className={`settings-panel${panel === 'invoice' ? ' active' : ''}`}>
            <div className="settings-panel-hero" style={{ background: 'linear-gradient(135deg,rgba(245,158,11,.07) 0%,transparent 60%)' }}>
              <div className="settings-panel-hero-icon" style={{ background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8"><path d="M4 2h12l4 4v16H4V2z"/><path d="M16 2v4h4"/><path d="M8 10h8M8 14h5"/></svg>
              </div>
              <div>
                <div className="settings-panel-hero-title">Invoice defaults</div>
                <div className="settings-panel-hero-sub">Currency, VAT rate, payment terms · Pre-fills every new invoice automatically</div>
              </div>
              <span className="settings-panel-hero-badge" style={{ background: 'rgba(245,158,11,.1)', color: '#F59E0B', border: '1px solid rgba(245,158,11,.2)' }}>Auto-fill</span>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">Invoice defaults</div>
              <div className="settings-section-desc">These values pre-fill every new invoice. You can always override them per invoice.</div>

              {/* Country VAT picker */}
              <div style={{ background: 'var(--g-dim)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 10, padding: '16px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}><circle cx="9" cy="9" r="8" stroke="#10B981" strokeWidth="1.5"/><path d="M9 4v5l3 2" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', marginBottom: 3 }}>Auto-detect VAT by country</div>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>Selecting your country sets the correct VAT rate and currency automatically.</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <select className="form-select" style={{ minWidth: 200 }} onChange={e => onVatCountryChange(e.target.value)}>
                    <option value="">— Pick a country —</option>
                    {VAT_COUNTRIES.map(g => (
                      <optgroup key={g.g} label={g.g}>
                        {g.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <div style={{ background: 'var(--g)', color: 'var(--bg)', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', minWidth: 60, textAlign: 'center' }}>{inv.default_vat_rate}%</div>
                </div>
              </div>

              <div className="form-grid" style={{ maxWidth: 520 }}>
                <div className="form-group">
                  <label className="form-label">Default currency</label>
                  <select className="form-select" value={inv.default_currency} onChange={e => setInv(p => ({ ...p, default_currency: e.target.value }))}>
                    {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Default VAT / tax rate (%)</label>
                  <input className="form-input" type="number" min="0" max="100" step="0.1" value={inv.default_vat_rate} onChange={e => setInv(p => ({ ...p, default_vat_rate: e.target.value }))}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Tax label</label>
                  <input className="form-input" value={inv.tax_label} onChange={e => setInv(p => ({ ...p, tax_label: e.target.value }))} placeholder="VAT, GST, IVA…"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Default payment terms</label>
                  <select className="form-select">
                    <option>30 days</option><option>14 days</option><option>7 days</option><option>Due on receipt</option>
                  </select>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button className="topbar-btn btn-primary" disabled={saving} onClick={() => save({ default_currency: inv.default_currency, default_vat_rate: Number(inv.default_vat_rate), tax_label: inv.tax_label }, 'invoice')}>
                {saving ? 'Saving…' : 'Save changes'}
              </button>
              {saved === 'invoice' && <span className="success-toast">✓ Saved</span>}
            </div>
          </div>

          {/* ── PAYMENT & BANKING ── */}
          <div className={`settings-panel${panel === 'payment' ? ' active' : ''}`}>
            <div className="settings-panel-hero" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,.07) 0%,transparent 60%)' }}>
              <div className="settings-panel-hero-icon" style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.2)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/></svg>
              </div>
              <div>
                <div className="settings-panel-hero-title">Payment &amp; banking</div>
                <div className="settings-panel-hero-sub">Bank account details · Appear in invoice footer so clients know where to pay</div>
              </div>
              <span className="settings-panel-hero-badge" style={{ background: 'var(--g-dim)', color: 'var(--g)', border: '1px solid rgba(16,185,129,.2)' }}>Get paid</span>
            </div>
            <div className="settings-section">
              <div className="settings-section-title">Bank account details <span className="settings-section-badge" style={{ background: 'rgba(16,185,129,.1)', color: 'var(--g)' }}>Invoice footer</span></div>
              <div className="settings-section-desc">These appear in your invoice footer so clients know exactly where to pay. Managed in the app.</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.15)', borderRadius: 8, marginBottom: 16 }}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="1.5" style={{ flexShrink: 0 }}><circle cx="8" cy="8" r="6"/><path d="M8 7v4M8 5.5v.5"/></svg>
                <span style={{ fontSize: 12, color: 'var(--t2)' }}>Your bank details are included automatically in every PDF export and client email.</span>
              </div>
              <div className="form-grid" style={{ maxWidth: 520 }}>
                <div className="form-group full"><label className="form-label">Bank name</label><input className="form-input" placeholder="e.g. First National Bank Botswana"/></div>
                <div className="form-group"><label className="form-label">Account name</label><input className="form-input" placeholder="e.g. Acme Corp Pty Ltd"/></div>
                <div className="form-group"><label className="form-label">Account number</label><input className="form-input" placeholder="e.g. 62123456789"/></div>
                <div className="form-group"><label className="form-label">Branch code</label><input className="form-input" placeholder="e.g. 282672"/></div>
                <div className="form-group"><label className="form-label">Swift / BIC (international)</label><input className="form-input" placeholder="e.g. FIRNBWGX"/></div>
              </div>
              <div style={{ marginTop: 20 }} className="settings-section-desc">
                <strong style={{ color: 'var(--t2)' }}>Online payments</strong> — Stripe, PayFast and other payment gateway integrations are available on the Business plan.
              </div>
            </div>
            <button className="topbar-btn btn-primary" style={{ opacity: .5, cursor: 'not-allowed' }} disabled>Payment settings coming soon</button>
          </div>

          {/* ── NOTIFICATIONS ── */}
          <div className={`settings-panel${panel === 'notifs' ? ' active' : ''}`}>
            <div className="settings-panel-hero" style={{ background: 'linear-gradient(135deg,rgba(139,92,246,.07) 0%,transparent 60%)' }}>
              <div className="settings-panel-hero-icon" style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.2)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8B5CF6" strokeWidth="1.8"><path d="M6 8a6 6 0 0112 0v4l2 3H4l2-3V8z"/><path d="M10 17a2 2 0 004 0"/></svg>
              </div>
              <div>
                <div className="settings-panel-hero-title">Notifications</div>
                <div className="settings-panel-hero-sub">Payment alerts, overdue reminders · Stay informed without checking the app</div>
              </div>
              <span className="settings-panel-hero-badge" style={{ background: 'rgba(139,92,246,.1)', color: '#8B5CF6', border: '1px solid rgba(139,92,246,.2)' }}>Alerts</span>
            </div>
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
            <div className="settings-panel-hero" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,.1) 0%,rgba(59,130,246,.05) 100%)' }}>
              <div className="settings-panel-hero-icon" style={{ background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.25)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M12 2l3 7h7l-5.5 4 2 7L12 16l-6.5 4 2-7L2 9h7z"/></svg>
              </div>
              <div>
                <div className="settings-panel-hero-title">Plan &amp; billing</div>
                <div className="settings-panel-hero-sub">{profile?.plan === 'pro' ? 'Pro plan' : profile?.plan === 'business' ? 'Business plan' : 'Starter · Free · 2 invoices/month'}</div>
              </div>
              <span className="settings-panel-hero-badge" style={{ background: 'var(--g)', color: 'var(--bg)', fontWeight: 700 }}>{(profile?.plan ?? 'free').toUpperCase()}</span>
            </div>
            {billingStatus === 'success' && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 16px', background:'rgba(16,185,129,.12)', border:'1px solid rgba(16,185,129,.3)', borderRadius:8, marginBottom:20 }}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M3 8l3.5 3.5L13 5"/></svg>
                <span style={{ fontSize:13, color:'#34d399', fontWeight:600 }}>
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
              <div className="settings-section-desc">You are on the <strong style={{ color: 'var(--t2)' }}>{profile?.plan ?? 'free'}</strong> plan. Subscriptions renew every 30 days.</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 8 }}>
                {[
                  { id: 'free',     name: 'Starter',  price: 'Free',     features: ['2 invoices/month', 'PDF export', 'WhatsApp send'],                               highlight: false },
                  { id: 'pro',      name: 'Pro',       price: 'P200/mo',  features: ['Unlimited invoices', 'Email delivery', 'Auto-reminders', 'AI generation'],      highlight: true  },
                  { id: 'business', name: 'Business',  price: 'P500/mo',  features: ['Everything in Pro', 'Multi-user', 'API access', 'Priority support'],            highlight: false },
                ].map(plan => {
                  const isCurrent = plan.id === (profile?.plan ?? 'free')
                  const canUpgrade = !isCurrent && plan.id !== 'free'
                  return (
                    <div key={plan.name} className="plan-card" style={{ border: isCurrent ? '1px solid rgba(16,185,129,.4)' : undefined, gap: 8 }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 18, letterSpacing: 1.5, color: plan.highlight ? 'var(--g)' : 'var(--t1)' }}>{plan.name}</div>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: 'var(--t1)' }}>{plan.price}</div>
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

          {/* ── SECURITY ── */}
          <div className={`settings-panel${panel === 'security' ? ' active' : ''}`}>
            <div className="settings-panel-hero" style={{ background: 'linear-gradient(135deg,rgba(239,68,68,.07) 0%,transparent 60%)' }}>
              <div className="settings-panel-hero-icon" style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.8"><path d="M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z"/><path d="M9 12l2 2 4-4" stroke="#EF4444"/></svg>
              </div>
              <div>
                <div className="settings-panel-hero-title">Security</div>
                <div className="settings-panel-hero-sub">Two-factor authentication · Session control · Security assessment</div>
              </div>
              <span className="settings-panel-hero-badge" style={{ background: 'rgba(239,68,68,.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,.2)' }}>Account protection</span>
            </div>

            {/* 2FA */}
            <div className="settings-section">
              <div className="settings-section-title">Two-factor authentication (TOTP)</div>
              <div className="settings-section-desc">Require a time-based one-time code from an authenticator app (Google Authenticator, Authy, 1Password) every time you sign in.</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--surface)', border: '1px solid var(--line2)', borderRadius: 10, marginTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: profile?.two_fa_enabled ? 'var(--g)' : 'var(--t3)', boxShadow: profile?.two_fa_enabled ? '0 0 6px rgba(16,185,129,.5)' : 'none' }}/>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
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
