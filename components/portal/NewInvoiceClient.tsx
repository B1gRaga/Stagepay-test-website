'use client'
import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { LogoIcon } from '@/components/Logo'

// ── Types ────────────────────────────────────────────────────────────────────
type LineItem = { desc: string; qty: number; rate: number }
type Client   = { id: string; name: string; email: string | null; phone: string | null }
type Profile  = { firm_name: string | null; name: string | null; address: string | null; email: string | null; default_currency: string; default_vat_rate: number; tax_label: string }

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

function today() { return new Date().toISOString().split('T')[0] }
function addDays(d: string, n: number) {
  const dt = new Date(d); dt.setDate(dt.getDate() + n)
  return dt.toISOString().split('T')[0]
}
function fmtAmt(n: number, sym: string) {
  return `${sym}${Number(n).toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
function fmtDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[parseInt(m)-1]} ${y}`
}

// ── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
:root{
    --g:#F2A900;--g2:#C98C00;--g-dim:rgba(242,169,0,0.1);
    --bg:#18213A;--bg2:#1F2A44;--surface:#1F2A44;--surface2:#2B3756;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#FAF7F0;--t2:rgba(250,247,240,0.6);--t3:rgba(250,247,240,0.3);
    --danger:#EF4444;--warn:#F59E0B;--info:#3B82F6;
  }
  html[data-theme="light"]{
    --bg:#FAF7F0;--bg2:#ffffff;--surface:#F1ECE1;--surface2:#E4DDCF;
    --line:rgba(31,42,68,.08);--line2:rgba(31,42,68,.14);
    --t1:#1F2A44;--t2:rgba(31,42,68,.65);--t3:rgba(31,42,68,.45);
    --g-dim:rgba(242,169,0,.12);
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:var(--font-archivo),sans-serif;background:var(--bg);color:var(--t1);}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes dots{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
  @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 28px;background:var(--bg2);}
  .page-title{font-size:18px;font-weight:700;letter-spacing:-.01em;color:var(--t1);}

  .gen-wrap{padding:16px 28px;height:calc(100vh - 56px);}
  .gen-layout{display:grid;grid-template-columns:1fr 400px;gap:16px;height:100%;}
  .gen-left{display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:2px;padding-bottom:16px;}
  .gen-right{background:var(--bg2);border:1px solid var(--line);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;}
  html[data-theme="light"] .gen-right{box-shadow:0 1px 4px rgba(0,0,0,.06),0 1px 2px rgba(0,0,0,.04);}

  /* Advanced / Edit details panel */
  .adv-toggle{
    display:flex;align-items:center;justify-content:space-between;
    padding:12px 16px;background:var(--bg2);border:1px solid var(--line);
    border-radius:10px;cursor:pointer;transition:all .2s;
  }
  .adv-toggle:hover{border-color:var(--line2);}
  .adv-toggle.open{border-radius:10px 10px 0 0;border-color:rgba(242,169,0,.3);background:rgba(242,169,0,.04);}
  .adv-toggle-label{font-size:12px;font-weight:600;color:var(--t2);letter-spacing:.04em;text-transform:uppercase;transition:color .2s;}
  .adv-toggle.open .adv-toggle-label{color:var(--g);}
  .adv-toggle-hint{font-size:11px;color:var(--t3);}
  .adv-chevron{width:20px;height:20px;color:var(--t3);transition:transform .25s;flex-shrink:0;}
  .adv-chevron.open{transform:rotate(180deg);color:var(--g);}
  .adv-body{
    background:var(--bg2);border:1px solid rgba(242,169,0,.2);
    border-top:none;border-radius:0 0 10px 10px;
    padding:0 16px;overflow:hidden;
    max-height:0;transition:max-height .35s ease, padding .35s;
  }
  .adv-body.open{max-height:2400px;padding:16px;}

  /* Form */
  .form-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .form-group{display:flex;flex-direction:column;gap:5px;}
  .form-group.full{grid-column:1/-1;}
  .form-label{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--t3);font-weight:600;}
  .form-input,.form-select,.form-textarea{
    background:rgba(242,169,0,.1) !important;border:1px solid rgba(242,169,0,.25) !important;
    border-radius:7px;padding:10px 12px;
    font-family:var(--font-archivo),sans-serif;font-weight:700;font-size:13px;color:var(--t1) !important;
    outline:none;transition:border-color .2s, box-shadow .2s;width:100%;
  }
  .form-input::placeholder,.form-textarea::placeholder{color:var(--t3) !important;}
  .form-input:focus,.form-select:focus,.form-textarea:focus{
    border-color:rgba(242,169,0,.45);box-shadow:0 0 0 3px rgba(242,169,0,.07);
  }
  .form-textarea{resize:vertical;min-height:80px;}
  .form-select option,.form-select optgroup{background:var(--bg2);color:var(--t1);}

  /* Client pills */
  .client-pills{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;}
  .client-pill{
    display:flex;align-items:center;gap:6px;
    background:var(--surface);border:1px solid var(--line2);
    border-radius:20px;padding:4px 12px 4px 6px;
    font-size:12px;color:var(--t2);cursor:pointer;transition:all .15s;
    font-family:var(--font-archivo),sans-serif;font-weight:700;border:none;
  }
  .client-pill:hover{border:1px solid var(--g);color:var(--t1);}
  .client-pill-av{
    width:18px;height:18px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:10px;flex-shrink:0;
  }

  /* Line items */
  .line-items-header{display:grid;grid-template-columns:1fr 90px 90px 90px 28px;gap:8px;padding:0 0 6px;border-bottom:1px solid var(--line);}
  .li-col-head{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--t3);font-weight:600;}
  .line-item-row{display:grid;grid-template-columns:1fr 90px 90px 90px 28px;gap:8px;padding:8px 0;align-items:center;border-bottom:1px solid var(--line);}
  .line-item-row .form-input:focus{border-color:rgba(242,169,0,.5);box-shadow:0 0 0 3px rgba(242,169,0,.08);}
  .li-amt{font-size:13px;font-weight:600;color:var(--t1);text-align:right;padding-right:4px;}
  .li-del{background:transparent;border:none;cursor:pointer;color:var(--t3);border-radius:4px;padding:4px;transition:color .15s;display:flex;align-items:center;}
  .li-del:hover{color:var(--danger);}
  .add-line-btn{
    display:flex;align-items:center;gap:6px;
    background:transparent;border:1px dashed var(--line2);
    border-radius:6px;padding:8px 14px;cursor:pointer;
    font-size:12px;color:var(--t3);margin-top:8px;width:100%;
    justify-content:center;transition:all .15s;font-family:var(--font-archivo),sans-serif;font-weight:700;
  }
  .add-line-btn:hover{border-color:var(--g);color:var(--g);}

  /* Deposit presets */
  .deposit-preset{
    padding:4px 10px;border-radius:4px;border:1px solid var(--line2);
    background:transparent;color:var(--t3);font-size:11px;cursor:pointer;
    transition:all .15s;font-family:var(--font-archivo),sans-serif;font-weight:600;
  }
  .deposit-preset.active{background:var(--g-dim);border-color:rgba(242,169,0,.3);color:var(--g);}
  .deposit-preset:hover{border-color:var(--g);color:var(--g);}

  /* Toggle */
  .toggle-sw{width:36px;height:20px;border-radius:10px;background:var(--surface);border:1px solid var(--line2);position:relative;cursor:pointer;transition:background .2s;flex-shrink:0;display:inline-block;}
  .toggle-sw.on{background:var(--g);border-color:var(--g);}
  .toggle-sw::after{content:'';position:absolute;top:3px;left:3px;width:12px;height:12px;border-radius:50%;background:var(--t3);transition:transform .2s, background .2s;}
  .toggle-sw.on::after{transform:translateX(16px);background:#fff;}

  /* Action bar */
  .action-bar{
    display:flex;align-items:center;gap:10px;
    margin-top:16px;padding-top:14px;
    border-top:1px solid var(--line);
    position:sticky;bottom:0;background:var(--bg2);padding-bottom:4px;
  }
  .apply-btn{
    flex:1;background:var(--g);color:var(--bg);border:none;border-radius:8px;
    padding:12px;font-size:13px;font-weight:700;letter-spacing:.05em;
    text-transform:uppercase;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:8px;
    transition:all .2s;box-shadow:0 3px 10px rgba(242,169,0,.2);
    font-family:var(--font-archivo),sans-serif;
  }
  .apply-btn:hover{background:#C98C00;}
  .clear-btn{
    background:transparent;color:var(--t3);border:1px solid var(--line2);
    border-radius:8px;padding:12px 16px;font-size:12px;cursor:pointer;
    transition:all .15s;white-space:nowrap;font-family:var(--font-archivo),sans-serif;font-weight:700;
  }
  .clear-btn:hover{border-color:var(--danger);color:var(--danger);}

  /* Preview */
  .preview-header{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;}
  .preview-header-title{font-size:12px;font-weight:600;color:var(--t2);letter-spacing:.05em;text-transform:uppercase;}
  .preview-body{flex:1;overflow-y:auto;padding:18px;}
  .preview-invoice{background:var(--bg2);border:1px solid var(--line2);border-radius:10px;overflow:hidden;}
  .prev-top{background:var(--surface);padding:16px 18px;border-bottom:1px solid var(--line);position:relative;}
  html[data-theme="light"] .prev-top{background:var(--bg2);}
  .prev-top::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--g),transparent 60%);opacity:.6;}
  .prev-brand{font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:18px;letter-spacing:2px;color:var(--t1);}
  .prev-meta{font-size:11px;color:var(--t3);margin-top:3px;}
  .prev-body{padding:16px 18px;}
  .prev-from-to{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:16px;}
  .prev-section-label{font-size:9px;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);margin-bottom:4px;}
  .prev-name{font-size:12px;font-weight:600;color:var(--t1);}
  .prev-detail{font-size:11px;color:var(--t3);line-height:1.6;}
  .prev-table{width:100%;border-collapse:collapse;margin-bottom:12px;}
  .prev-table th{font-size:9px;letter-spacing:.09em;text-transform:uppercase;color:var(--t3);padding:0 0 8px;border-bottom:1px solid var(--line);text-align:left;font-weight:600;}
  .prev-table th:last-child,.prev-table td:last-child{text-align:right;}
  .prev-table td{font-size:12px;color:var(--t2);padding:8px 0;border-bottom:1px solid var(--line);}
  .prev-table tr:last-child td{border-bottom:none;}
  .prev-totals{border-top:1px solid var(--line2);padding-top:10px;}
  .prev-total-row{display:flex;justify-content:space-between;font-size:11px;color:var(--t3);padding:3px 0;}
  .prev-total-final{background:var(--g);border-radius:7px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center;margin-top:8px;}
  .preview-actions{padding:14px 18px;border-top:1px solid var(--line);display:flex;gap:8px;}
  .btn-primary{background:var(--g);color:var(--bg);border:none;border-radius:6px;padding:9px 18px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;flex:1;font-family:var(--font-archivo),sans-serif;transition:all .15s;}
  .btn-primary:hover{background:#C98C00;}
  .btn-primary:disabled{opacity:.5;cursor:not-allowed;}
  .btn-outline{background:transparent;color:var(--t2);border:1px solid var(--line2);border-radius:6px;padding:9px 14px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;font-family:var(--font-archivo),sans-serif;transition:all .15s;}
  .btn-outline:hover{border-color:var(--g);color:var(--g);}
  .pill-draft{background:rgba(100,116,139,.12);color:rgba(250,247,240,.45);border:1px solid rgba(100,116,139,.2);display:inline-block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:3px 9px;border-radius:4px;}
  html[data-theme="light"] .pill-draft{color:rgba(31,42,68,.5);background:rgba(100,116,139,.1);border-color:rgba(100,116,139,.25);}

  /* Send Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:1200;display:flex;align-items:center;justify-content:center;padding:16px;}
  .modal-box{background:var(--bg2);border:1px solid var(--line2);border-radius:14px;width:100%;max-width:480px;overflow:hidden;animation:modalIn .2s ease;}
  .modal-header{padding:20px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;}
  .modal-title{font-family:var(--font-bebas),sans-serif;font-weight:700;font-size:18px;letter-spacing:2px;color:var(--t1);}
  .modal-close{background:transparent;border:none;color:var(--t3);cursor:pointer;font-size:20px;line-height:1;padding:0 4px;}
  .modal-body{padding:24px;}
  .modal-footer{padding:16px 24px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;}
  .channel-tabs{display:flex;gap:6px;margin-bottom:20px;}
  .channel-tab{flex:1;padding:10px;border-radius:8px;border:1px solid var(--line2);background:transparent;color:var(--t3);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-archivo),sans-serif;text-transform:uppercase;letter-spacing:.05em;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:7px;}
  .channel-tab.active{border-color:var(--g);background:var(--g-dim);color:var(--g);}
  .channel-tab.active.wa{border-color:#25D366;background:rgba(37,211,102,.1);color:#25D366;}
  .success-banner{display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(242,169,0,.1);border:1px solid rgba(242,169,0,.25);border-radius:8px;margin-bottom:16px;}

  @media(max-width:1024px){
    .gen-layout{grid-template-columns:1fr;}
    .gen-right{display:none;}
  }
  @media(max-width:768px){.topbar{padding:0 16px;}.mob-hide{display:none !important;}}
  @media(max-width:600px){
    .gen-wrap{padding:12px 16px;}
    .form-grid{grid-template-columns:1fr;}
    .form-input,.form-select,.form-textarea{font-size:12px !important;}
    .form-input::placeholder,.form-textarea::placeholder{font-size:12px !important;}
    .line-items-header{display:none;}
    .line-item-row{
      grid-template-columns:1fr 1fr auto 28px;
      grid-template-rows:auto auto;
      gap:6px 8px;
      padding:10px 0;
    }
    .line-item-row>*:nth-child(1){grid-column:1/-1;}
  }
`

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewInvoiceClient({
  initialProfile,
  initialClients,
  editId,
  initialInvoice = null,
}: {
  initialProfile: Profile | null
  initialClients: Client[]
  editId: string | null
  initialInvoice?: Record<string, any> | null
}) {
  const router = useRouter()

  // Data — pre-populated from server; only editId triggers a client fetch
  const [profile,  setProfile]  = useState<Profile | null>(initialProfile)
  const [clients,  setClients]  = useState<Client[]>(initialClients)

  // Form
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientName,  setClientName]  = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [clientPhone, setClientPhone] = useState('')
  const [project,     setProject]     = useState('')
  const [currency,    setCurrency]    = useState('P')
  const [issueDate,   setIssueDate]   = useState(today())
  const [dueDate,     setDueDate]     = useState(addDays(today(), 30))
  const [vatRate,     setVatRate]     = useState(14)
  const [items,       setItems]       = useState<LineItem[]>([{ desc: '', qty: 1, rate: 0 }])
  const [depositOn,   setDepositOn]   = useState(false)
  const [depositPct,  setDepositPct]  = useState(50)
  const [discountOn,  setDiscountOn]  = useState(false)
  const [discountAmt, setDiscountAmt] = useState(0)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurInterval, setRecurInterval] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly')
  const [notes,       setNotes]       = useState('')
  const [tc,          setTc]          = useState('')
  const [terms,       setTerms]       = useState('30')

  // UI
  const [advOpen,  setAdvOpen]  = useState(false)

  // Save / send
  const [saving,         setSaving]         = useState(false)
  const [sendModalOpen,  setSendModalOpen]  = useState(false)
  const [savedInvoiceId, setSavedInvoiceId] = useState<string | null>(null)
  const [savedInvNum,    setSavedInvNum]    = useState<string | null>(null)
  const [channel,        setChannel]        = useState<'email' | 'wa'>('email')
  const [sendEmail,      setSendEmail]      = useState('')
  const [sendPhone,      setSendPhone]      = useState('')
  const [sending,        setSending]        = useState(false)
  const [sendDone,       setSendDone]       = useState(false)
  const [sendError,      setSendError]      = useState('')

  // Set defaults from pre-fetched profile
  useEffect(() => {
    if (initialProfile && !editId) {
      setCurrency(initialProfile.default_currency || 'P')
      setVatRate(Number(initialProfile.default_vat_rate) || 14)
    }
  }, [])

  // Populate form from server-pre-fetched invoice (edit mode)
  useEffect(() => {
    if (!editId || !initialInvoice) return
    const inv = initialInvoice
    setClientName(inv.client_name || '')
    setClientEmail(inv.client_email || '')
    setClientPhone(inv.client_phone || '')
    setProject(inv.project || '')
    setCurrency(inv.currency || initialProfile?.default_currency || 'P')
    setIssueDate(inv.issue_date || today())
    setDueDate(inv.due_date || addDays(today(), 30))
    setVatRate(inv.vat_rate ?? 14)
    setNotes(inv.notes || '')
    if (inv.deposit_amount > 0) setDepositOn(true)
    if (inv.invoice_items?.length) {
      setItems(inv.invoice_items
        .sort((a: any, b: any) => a.sort_order - b.sort_order)
        .map((it: any) => ({ desc: it.description, qty: it.quantity, rate: it.unit_price })))
    }
  }, [])

  // ── Computed totals ──
  const subtotal       = useMemo(() => items.reduce((s, i) => s + (i.qty || 0) * (i.rate || 0), 0), [items])
  const effectiveDiscount = useMemo(() => discountOn ? Math.min(discountAmt, subtotal) : 0, [discountOn, discountAmt, subtotal])
  const discountedSub  = useMemo(() => subtotal - effectiveDiscount, [subtotal, effectiveDiscount])
  const vatAmt         = useMemo(() => discountedSub * (vatRate / 100), [discountedSub, vatRate])
  const total          = useMemo(() => discountedSub + vatAmt, [discountedSub, vatAmt])
  const depositAmt     = useMemo(() => depositOn ? total * (depositPct / 100) : 0, [depositOn, total, depositPct])

  // ── Helpers ──
  function clearForm() {
    setSelectedClientId(null)
    setClientName(''); setClientEmail(''); setClientPhone(''); setProject('')
    setCurrency(profile?.default_currency || 'P')
    setIssueDate(today()); setDueDate(addDays(today(), 30))
    setVatRate(Number(profile?.default_vat_rate) || 14)
    setItems([{ desc: '', qty: 1, rate: 0 }])
    setDepositOn(false); setDepositPct(50)
    setDiscountOn(false); setDiscountAmt(0)
    setIsRecurring(false); setRecurInterval('monthly')
    setNotes(''); setTc(''); setTerms('30')
  }

  function selectClient(c: Client) {
    setSelectedClientId(c.id)
    setClientName(c.name)
    setClientEmail(c.email ?? '')
    setClientPhone(c.phone ?? '')
    if (!advOpen) setAdvOpen(true)
  }

  const updateItem = useCallback((i: number, field: keyof LineItem, val: string | number) => {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }, [])

  const addItem = useCallback(() => {
    setItems(prev => [...prev, { desc: '', qty: 1, rate: 0 }])
  }, [])

  const removeItem = useCallback((i: number) => {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i))
  }, [])

  // ── Save invoice ──
  async function saveInvoice(status: 'draft' | 'sent') {
    setSaving(true)
    try {
      const payload = {
        status,
        client_id:            selectedClientId ?? null,
        client_name:          clientName || 'Unknown Client',
        client_email:         clientEmail || null,
        client_phone:         clientPhone || null,
        project:              project || null,
        currency,
        issue_date:           issueDate,
        due_date:             dueDate || null,
        vat_rate:             vatRate,
        discount_amount:      effectiveDiscount,
        deposit_amount:       depositAmt,
        is_recurring:         isRecurring,
        recurrence_interval:  isRecurring ? recurInterval : undefined,
        notes:                notes || null,
        items: items.filter(i => i.desc.trim()).map(i => ({
          description: i.desc,
          quantity:    Number(i.qty) || 1,
          unit_price:  Number(i.rate) || 0,
        })),
      }

      const url    = editId ? `/api/invoices/${editId}` : '/api/invoices'
      const method = editId ? 'PATCH' : 'POST'
      const res    = await fetch(url, { method, credentials: 'include', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const data   = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save')

      const savedInvoice = data.invoice

      // Auto-save client if name provided and no existing client was selected
      const name = clientName.trim()
      if (name && name !== 'Unknown Client' && !selectedClientId) {
        const exists = clients.some(c => c.name.toLowerCase() === name.toLowerCase())
        if (!exists) {
          try {
            const cr = await fetch('/api/clients', {
              method: 'POST', credentials: 'include',
              headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ name, email: clientEmail || undefined, phone: clientPhone || undefined }),
            })
            if (cr.ok) {
              const cd = await cr.json()
              // Link the new client back to the invoice
              if (cd.client?.id) {
                setSelectedClientId(cd.client.id)
                fetch(`/api/invoices/${savedInvoice.id}`, {
                  method: 'PATCH', credentials: 'include',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify({ client_id: cd.client.id }),
                }).catch(() => {})
              }
            }
          } catch { /* non-fatal */ }
        }
      }

      return savedInvoice
    } finally {
      setSaving(false)
    }
  }

  async function handleDraft() {
    try {
      const inv = await saveInvoice('draft')
      router.push(`/invoices/${inv.id}`)
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function handleSendClick() {
    // Save first, then open send modal
    setSaving(true)
    try {
      const inv = await saveInvoice('draft')
      setSavedInvoiceId(inv.id)
      setSavedInvNum(inv.invoice_number)
      setSendEmail(clientEmail)
      setSendPhone(clientPhone)
      setSendDone(false)
      setSendError('')
      setSendModalOpen(true)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleSend() {
    if (!savedInvoiceId) return
    setSending(true)
    setSendError('')
    try {
      if (channel === 'email') {
        const res = await fetch('/api/email/send', {
          method: 'POST', credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ invoice_id: savedInvoiceId, to_email: sendEmail }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || 'Send failed')
      } else {
        const res = await fetch('/api/whatsapp/send', {
          method: 'POST', credentials: 'include',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            invoice_id:     savedInvoiceId,
            to_phone:       sendPhone,
            invoice_number: savedInvNum,
            client_name:    clientName,
            total_amount:   total,
            currency,
            due_date:       dueDate,
          }),
        })
        const d = await res.json()
        if (!res.ok) throw new Error(d.error || 'Send failed')
      }
      setSendDone(true)
      setTimeout(() => { setSendModalOpen(false); router.push(`/invoices/${savedInvoiceId}`) }, 1800)
    } catch (e: any) {
      setSendError(e.message)
    } finally {
      setSending(false)
    }
  }

  async function handlePDF() {
    try {
      let invId = savedInvoiceId
      if (!invId) {
        const inv = await saveInvoice('draft')
        invId = inv.id
        setSavedInvoiceId(inv.id)
      }
      window.open(`/api/invoices/${invId}/pdf`, '_blank')
    } catch (e: any) {
      alert(e.message)
    }
  }

  const firmName = profile?.firm_name || profile?.name || 'Your Firm'

  const COLORS = ['#F2A900','#3B82F6','#F59E0B','#E8D8C3','#EF4444','#C98C00']

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar"><h1 className="page-title">{editId ? 'Edit invoice' : 'New invoice'}</h1></div>

      <div className="gen-wrap">
        <div className="gen-layout">

          {/* ── LEFT: Form ── */}
          <div className="gen-left">

            {/* Advanced / Edit details */}
            <div>
              <div className={`adv-toggle${advOpen ? ' open' : ''}`} onClick={() => setAdvOpen(p => !p)}>
                <div className="adv-toggle-left">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 4h10M5 8h6M7 12h2"/></svg>
                  <div>
                    <div className="adv-toggle-label">Edit details</div>
                    <div className="adv-toggle-hint">
                      {clientName || 'Client'}{project ? ` · ${project}` : ''} · {items.length} line item{items.length !== 1 ? 's' : ''} · VAT {vatRate}%
                    </div>
                  </div>
                </div>
                <svg className={`adv-chevron${advOpen ? ' open' : ''}`} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 6l4 4 4-4"/></svg>
              </div>

              <div className={`adv-body${advOpen ? ' open' : ''}`}>
                {/* Client quick-select */}
                {clients.length > 0 && (
                  <div style={{ marginBottom: 14 }}>
                    <div className="form-label" style={{ marginBottom: 8 }}>Quick select client</div>
                    <div className="client-pills">
                      {clients.slice(0, 6).map((c, i) => {
                        const color = COLORS[i % COLORS.length]
                        const ini   = c.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                        return (
                          <button key={c.id} className="client-pill" onClick={() => selectClient(c)}>
                            <div className="client-pill-av" style={{ background: `${color}22`, color }}>{ini}</div>
                            {c.name.split(' ')[0]}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label" htmlFor="ni-client-name">Client name</label>
                    <input id="ni-client-name" name="client_name" className="form-input" value={clientName} onChange={e => { setClientName(e.target.value); setSelectedClientId(null) }} placeholder="e.g. Molapo Tower Ltd."/>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ni-client-email">Client email</label>
                    <input id="ni-client-email" name="client_email" className="form-input" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@company.co.bw"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ni-client-phone">Client phone (WhatsApp)</label>
                    <input id="ni-client-phone" name="client_phone" className="form-input" type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+267 71 234 567"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ni-currency">Currency</label>
                    <select id="ni-currency" name="currency" className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                      {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ni-issue-date">Issue date</label>
                    <input id="ni-issue-date" name="issue_date" className="form-input" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ni-due-date">Due date</label>
                    <input id="ni-due-date" name="due_date" className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/>
                  </div>
                  <div className="form-group full">
                    <label className="form-label" htmlFor="ni-project">Project description</label>
                    <input id="ni-project" name="project" className="form-input" value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Molapo Tower — Phase 2 Structural Review"/>
                  </div>
                </div>

                {/* Line items */}
                <div style={{ marginTop: 16 }}>
                  <div className="form-label" style={{ marginBottom: 8 }}>Line items</div>
                  <div className="line-items-header">
                    <div className="li-col-head">Description</div>
                    <div className="li-col-head">Qty / Hrs</div>
                    <div className="li-col-head">Rate</div>
                    <div className="li-col-head">Amount</div>
                    <div/>
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="line-item-row">
                      <input id={`ni-desc-${i}`} name={`item_desc_${i}`} className="form-input" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} placeholder="Service description" style={{ padding: '7px 10px' }}/>
                      <input id={`ni-qty-${i}`} name={`item_qty_${i}`} className="form-input" type="number" value={item.qty} min={0} step="0.5" onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 0)} placeholder="Qty" style={{ padding: '7px 10px' }}/>
                      <input id={`ni-rate-${i}`} name={`item_rate_${i}`} className="form-input" type="number" value={item.rate} min={0} onChange={e => updateItem(i, 'rate', parseFloat(e.target.value) || 0)} placeholder="Rate" style={{ padding: '7px 10px' }}/>
                      <div className="li-amt">{fmtAmt((item.qty || 0) * (item.rate || 0), currency)}</div>
                      <button className="li-del" onClick={() => removeItem(i)}>
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M2 4h12M5 4V2h6v2M6 7v6M10 7v6M3 4l1 10h8l1-10"/></svg>
                      </button>
                    </div>
                  ))}
                  <button className="add-line-btn" onClick={addItem}>
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
                    Add line item
                  </button>
                </div>

                <div className="form-grid" style={{ marginTop: 14 }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ni-vat-rate">VAT rate (%)</label>
                    <input id="ni-vat-rate" name="vat_rate" className="form-input" type="number" value={vatRate} min={0} max={100} step="0.1" onChange={e => setVatRate(parseFloat(e.target.value) || 0)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="ni-payment-terms">Payment terms</label>
                    <select id="ni-payment-terms" name="payment_terms" className="form-select" value={terms} onChange={e => setTerms(e.target.value)}>
                      <option value="30">30 days</option>
                      <option value="14">14 days</option>
                      <option value="7">7 days</option>
                      <option value="0">Due on receipt</option>
                    </select>
                  </div>

                  {/* Deposit */}
                  <div className="form-group full">
                    <div className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      Deposit required
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--t3)' }}>{depositOn ? 'On' : 'Off'}</span>
                        <div className={`toggle-sw${depositOn ? ' on' : ''}`} onClick={() => setDepositOn(p => !p)}/>
                      </span>
                    </div>
                    {depositOn && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 5 }}>Deposit %</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input id="ni-deposit-pct" name="deposit_pct" className="form-input" type="number" min={1} max={100} value={depositPct} onChange={e => setDepositPct(Number(e.target.value))} style={{ width: 80, padding: '7px 10px' }}/>
                            <span style={{ fontSize: 13, color: 'var(--t3)' }}>%</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {[25, 50, 100].map(p => (
                                <button key={p} className={`deposit-preset${depositPct === p ? ' active' : ''}`} onClick={() => setDepositPct(p)}>{p}%</button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div style={{ background: 'var(--g-dim)', border: '1px solid rgba(242,169,0,.2)', borderRadius: 8, padding: '8px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--g)', marginBottom: 2 }}>Deposit due</div>
                          <div style={{ fontFamily: "var(--font-bebas),sans-serif", fontWeight: 700, fontSize: 20, color: 'var(--g)' }}>{fmtAmt(depositAmt, currency)}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Discount */}
                  <div className="form-group full">
                    <div className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      Discount
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--t3)' }}>{discountOn ? 'On' : 'Off'}</span>
                        <div className={`toggle-sw${discountOn ? ' on' : ''}`} onClick={() => setDiscountOn(p => !p)}/>
                      </span>
                    </div>
                    {discountOn && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 5 }}>Discount amount</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input id="ni-discount-amt" name="discount_amt" className="form-input" type="number" min={0} max={subtotal} value={discountAmt} onChange={e => setDiscountAmt(Number(e.target.value) || 0)} style={{ width: 100, padding: '7px 10px' }}/>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {[5, 10, 15, 20].map(p => {
                                const amt = Math.round(subtotal * p / 100 * 100) / 100
                                return (
                                  <button key={p} className={`deposit-preset${discountAmt === amt ? ' active' : ''}`} onClick={() => setDiscountAmt(amt)}>{p}%</button>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                        {effectiveDiscount > 0 && (
                          <div style={{ background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, padding: '8px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: '#F87171', marginBottom: 2 }}>Discount</div>
                            <div style={{ fontFamily: "var(--font-bebas),sans-serif", fontWeight: 700, fontSize: 20, color: '#F87171' }}>−{fmtAmt(effectiveDiscount, currency)}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Recurring */}
                  <div className="form-group full">
                    <div className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      Recurring invoice
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--t3)' }}>{isRecurring ? 'On' : 'Off'}</span>
                        <div className={`toggle-sw${isRecurring ? ' on' : ''}`} onClick={() => setIsRecurring(p => !p)}/>
                      </span>
                    </div>
                    {isRecurring && (
                      <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                        <select id="ni-recur-interval" name="recur_interval" className="form-select" value={recurInterval} onChange={e => setRecurInterval(e.target.value as any)} style={{ width: 160 }}>
                          <option value="monthly">Monthly</option>
                          <option value="quarterly">Quarterly</option>
                          <option value="yearly">Yearly</option>
                        </select>
                        <span style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.5 }}>
                          A new draft invoice will be auto-generated each period. You can edit and send it before it goes out.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="form-group full">
                    <label className="form-label" htmlFor="ni-notes">Notes (optional)</label>
                    <input id="ni-notes" name="notes" className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Bank: FNB Botswana, Acc: 62123456789"/>
                  </div>

                  <div className="form-group full">
                    <label className="form-label" htmlFor="ni-tc">Terms &amp; conditions (optional)</label>
                    <textarea id="ni-tc" name="tc" className="form-textarea" value={tc} onChange={e => setTc(e.target.value)} rows={3} placeholder="e.g. Payment is due within 30 days. Late payments incur 2% interest per month."/>
                  </div>
                </div>

                {/* Action bar */}
                <div className="action-bar">
                  <button className="apply-btn" onClick={() => {}}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M1 8s3-5 7-5 7 5 7 5-3 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
                    Apply &amp; preview
                  </button>
                  <button className="clear-btn" onClick={clearForm}>Clear form</button>
                </div>
              </div>
            </div>
          </div>

          {/* ── RIGHT: Live preview ── */}
          <div className="gen-right">
            <div className="preview-header">
              <span className="preview-header-title">Live preview</span>
              <span className="pill-draft">Draft</span>
            </div>

            <div className="preview-body">
              <div className="preview-invoice">
                {/* Header */}
                <div className="prev-top">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ display: 'inline-flex', width: 28, height: 28, flexShrink: 0 }}>
                        <LogoIcon />
                      </span>
                      <div className="prev-brand">{firmName.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "var(--font-bebas),sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: 2, color: 'var(--g)' }}>INVOICE</div>
                      <div className="prev-meta">#{savedInvNum || 'Auto'} · {fmtDate(issueDate) || '—'}</div>
                    </div>
                  </div>
                </div>

                {/* Body */}
                <div className="prev-body">
                  <div className="prev-from-to">
                    <div>
                      <div className="prev-section-label">From</div>
                      <div className="prev-name">{firmName}</div>
                      <div className="prev-detail">{profile?.address || ''}{profile?.email ? `\n${profile.email}` : ''}</div>
                    </div>
                    <div>
                      <div className="prev-section-label">Bill to</div>
                      <div className="prev-name">{clientName || 'Client Name'}</div>
                      <div className="prev-detail">{clientEmail || '—'}{clientPhone ? `\n${clientPhone}` : ''}</div>
                    </div>
                  </div>

                  {project && <div className="prev-section-label" style={{ marginBottom: 8 }}>{project}</div>}

                  <table className="prev-table">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th style={{ textAlign: 'right' }}>Qty</th>
                        <th style={{ textAlign: 'right' }}>Rate</th>
                        <th style={{ textAlign: 'right' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(i => i.desc).map((it, idx) => (
                        <tr key={idx}>
                          <td>{it.desc}</td>
                          <td style={{ textAlign: 'right' }}>{it.qty}</td>
                          <td style={{ textAlign: 'right' }}>{fmtAmt(it.rate, currency)}</td>
                          <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--t1)' }}>{fmtAmt((it.qty || 0) * (it.rate || 0), currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="prev-totals">
                    <div className="prev-total-row"><span>Subtotal</span><span>{fmtAmt(subtotal, currency)}</span></div>
                    {effectiveDiscount > 0 && (
                      <div className="prev-total-row" style={{ color: '#F87171' }}><span>Discount</span><span>−{fmtAmt(effectiveDiscount, currency)}</span></div>
                    )}
                    <div className="prev-total-row"><span>VAT ({vatRate}%)</span><span>{fmtAmt(vatAmt, currency)}</span></div>
                  </div>
                  <div className="prev-total-final">
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>Total Due</span>
                    <span style={{ fontFamily: "var(--font-bebas),sans-serif", fontWeight: 700, fontSize: 20, color: '#fff', letterSpacing: 1 }}>{fmtAmt(total, currency)}</span>
                  </div>

                  {depositOn && depositAmt > 0 && (
                    <div style={{ marginTop: 10, background: 'var(--g-dim)', border: '1px solid rgba(242,169,0,.2)', borderRadius: 7, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--g)', marginBottom: 2 }}>Deposit Required</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)' }}>{depositPct}% of total</div>
                        </div>
                        <div style={{ fontFamily: "var(--font-bebas),sans-serif", fontWeight: 700, fontSize: 22, color: 'var(--g)' }}>{fmtAmt(depositAmt, currency)}</div>
                      </div>
                    </div>
                  )}

                  {tc && (
                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 5 }}>Terms &amp; Conditions</div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.6 }}>{tc}</div>
                    </div>
                  )}

                  {notes && <div style={{ marginTop: 10, fontSize: 11, color: 'var(--t3)', lineHeight: 1.6 }}>{notes}</div>}

                  <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-flex', width: 14, height: 14 }}><LogoIcon /></span>
                      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--t3)' }}>StagePay</span>
                    </div>
                    {dueDate && <span style={{ fontSize: 9, color: 'var(--t3)' }}>Due {fmtDate(dueDate)}</span>}
                  </div>
                </div>
              </div>
            </div>

            <div className="preview-actions">
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleSendClick} disabled={saving}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M2 8l12-6-6 12V8H2z"/></svg>
                {saving ? 'Saving…' : 'Send Invoice'}
              </button>
              <button className="btn-outline" onClick={handlePDF} disabled={saving}>
                <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 1h6l4 4v10H4V1z"/><path d="M10 1v4h4"/></svg>
                PDF
              </button>
              <button className="btn-outline" onClick={handleDraft} disabled={saving}>Draft</button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Send Modal ── */}
      {sendModalOpen && (
        <div className="modal-overlay" onClick={() => !sending && setSendModalOpen(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">SEND INVOICE</div>
              <button className="modal-close" onClick={() => setSendModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              {sendDone ? (
                <div className="success-banner">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="rgba(242,169,0,.2)"/><path d="M6 10l3 3 5-5" stroke="#F2A900" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g)' }}>Invoice sent!</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Redirecting to invoices…</div>
                  </div>
                </div>
              ) : (
                <>
                  {savedInvNum && (
                    <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
                      Invoice <strong style={{ color: 'var(--t2)' }}>{savedInvNum}</strong> for <strong style={{ color: 'var(--t2)' }}>{clientName}</strong> — {fmtAmt(total - depositAmt, currency)}
                    </div>
                  )}
                  <div className="channel-tabs">
                    <button className={`channel-tab${channel === 'email' ? ' active' : ''}`} onClick={() => setChannel('email')}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 5l7 5 7-5"/></svg>
                      Email
                    </button>
                    <button className={`channel-tab${channel === 'wa' ? ' active wa' : ''}`} onClick={() => setChannel('wa')}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill={channel === 'wa' ? '#25D366' : 'currentColor'}><path d="M8 0C3.582 0 0 3.582 0 8c0 1.4.367 2.715 1.007 3.853L0 16l4.247-1.108A7.96 7.96 0 008 16c4.418 0 8-3.582 8-8S12.418 0 8 0zm4.078 11.248c-.172.484-1.003.932-1.374.99-.353.054-.8.077-1.29-.08a11.7 11.7 0 01-1.167-.44c-2.051-.889-3.39-2.965-3.493-3.103-.102-.138-.83-1.106-.83-2.11 0-1.003.525-1.497.712-1.7.186-.204.406-.255.541-.255.135 0 .271 0 .39.007.125.007.293-.047.458.35.169.403.574 1.394.624 1.496.05.102.084.221.017.356-.067.135-.1.22-.2.338l-.289.34c-.101.101-.207.21-.09.41.118.203.522.861 1.122 1.393.77.69 1.42.9 1.62.999.2.098.317.082.434-.05.118-.13.504-.591.638-.794.134-.204.268-.17.45-.102.184.068 1.165.553 1.365.654.2.1.334.15.384.234.05.084.05.486-.122.97z"/></svg>
                      WhatsApp
                    </button>
                  </div>

                  {channel === 'email' ? (
                    <div className="form-group">
                      <label className="form-label" htmlFor="ni-send-email">Send to email</label>
                      <input id="ni-send-email" name="send_email" className="form-input" type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="client@email.com" autoFocus/>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label" htmlFor="ni-send-phone">Send to WhatsApp number</label>
                      <input id="ni-send-phone" name="send_phone" className="form-input" type="tel" value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+267 71 234 567" autoFocus/>
                      <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>Include country code, e.g. +267 for Botswana</div>
                    </div>
                  )}

                  {sendError && (
                    <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, fontSize: 12, color: 'var(--danger)' }}>
                      {sendError}
                    </div>
                  )}
                </>
              )}
            </div>
            {!sendDone && (
              <div className="modal-footer">
                <button className="btn-outline" onClick={() => setSendModalOpen(false)} disabled={sending}>Cancel</button>
                <button
                  className="btn-primary"
                  style={{ flex: 'unset', padding: '9px 24px' }}
                  onClick={handleSend}
                  disabled={sending || (channel === 'email' ? !sendEmail.trim() : !sendPhone.trim())}
                >
                  {sending ? (
                    <><span style={{ width: 14, height: 14, borderRadius: '50%', border: '2px solid rgba(255,255,255,.3)', borderTopColor: '#fff', animation: 'spin .7s linear infinite', display: 'inline-block' }}/> Sending…</>
                  ) : (
                    <>{channel === 'email' ? 'Send via Email' : 'Send via WhatsApp'}</>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
