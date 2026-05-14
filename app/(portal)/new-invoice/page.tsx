'use client'
import { useEffect, useState, useMemo, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// ── Types ────────────────────────────────────────────────────────────────────
type LineItem = { desc: string; qty: number; rate: number }
type Client   = { id: string; name: string; email: string | null; phone: string | null }
type Profile  = { firm_name: string | null; name: string | null; address: string | null; email: string | null; default_currency: string; default_vat_rate: number; tax_label: string }

const CHIP_PROMPTS: Record<string, string> = {
  consulting:    'Consulting retainer for [Client] — 20 hours at [Rate]/hr, 30-day payment terms',
  engineering:   'Structural engineering review for [Client] — site inspection plus 12 hours analysis at [Rate]/hr',
  design:        'Brand design project for [Client] — logo, brand guidelines and social kit, flat fee [Amount]',
  legal:         'Legal services for [Client] — contract drafting and review, 8 hours at [Rate]/hr',
  construction:  'Construction phase 2 for [Client] — labour and materials, [Amount] total, 50% deposit',
}

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
    --g:#10B981;--g2:#059669;--g-dim:rgba(16,185,129,0.1);
    --bg:#0F172A;--bg2:#1E293B;--surface:#263244;--surface2:#2d3a50;
    --line:rgba(255,255,255,0.06);--line2:rgba(255,255,255,0.11);
    --t1:#F8FAFC;--t2:rgba(248,250,252,0.6);--t3:rgba(248,250,252,0.3);
    --danger:#EF4444;--warn:#F59E0B;--info:#3B82F6;
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:'Archivo',sans-serif;background:var(--bg);color:var(--t1);}
  @keyframes spin{to{transform:rotate(360deg)}}
  @keyframes dots{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
  @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
  @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  @keyframes modalIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}

  .topbar{height:56px;flex-shrink:0;border-bottom:1px solid var(--line);display:flex;align-items:center;padding:0 28px;background:var(--bg2);}
  .page-title{font-family:'Bebas Neue',sans-serif;font-size:20px;letter-spacing:2.5px;color:var(--t1);}

  .gen-wrap{padding:16px 28px;height:calc(100vh - 56px);}
  .gen-layout{display:grid;grid-template-columns:1fr 400px;gap:16px;height:100%;}
  .gen-left{display:flex;flex-direction:column;gap:12px;overflow-y:auto;padding-right:2px;padding-bottom:16px;}
  .gen-right{background:var(--bg2);border:1px solid var(--line);border-radius:12px;display:flex;flex-direction:column;overflow:hidden;}

  /* AI Hero */
  .ai-hero{background:var(--bg2);border:1px solid var(--line);border-radius:12px;padding:20px;}
  .ai-hero-header{display:flex;align-items:center;gap:10px;margin-bottom:16px;}
  .ai-hero-icon{width:32px;height:32px;background:var(--g-dim);border:1px solid rgba(16,185,129,.25);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
  .ai-hero-title{font-size:14px;font-weight:600;color:var(--t1);}
  .ai-hero-sub{font-size:11px;color:var(--t3);margin-top:1px;}
  .ai-big-textarea{
    width:100%;background:var(--surface);border:1px solid var(--line2);
    border-radius:8px;padding:14px;font-family:'Archivo',sans-serif;
    font-size:14px;color:var(--t1);outline:none;resize:none;line-height:1.6;
    transition:border-color .2s, box-shadow .2s;
  }
  .ai-big-textarea:focus{border-color:rgba(16,185,129,.5);box-shadow:0 0 0 3px rgba(16,185,129,.07);}
  .ai-big-textarea::placeholder{color:var(--t3);font-size:14px;}
  .ai-big-textarea.thinking{
    background:linear-gradient(90deg,var(--surface) 25%,rgba(16,185,129,.06) 50%,var(--surface) 75%);
    background-size:200% auto;animation:shimmer 1.4s linear infinite;
  }
  .prompt-chips{display:flex;gap:6px;flex-wrap:wrap;margin:10px 0;}
  .prompt-chip{
    padding:5px 12px;border-radius:20px;border:1px solid var(--line2);
    background:transparent;color:var(--t3);font-size:11px;font-weight:500;
    cursor:pointer;transition:all .15s;font-family:'Archivo',sans-serif;
    letter-spacing:.03em;
  }
  .prompt-chip:hover{border-color:var(--g);color:var(--g);background:var(--g-dim);}
  .ai-thinking{display:flex;align-items:center;gap:10px;margin-top:10px;}
  .ai-dots{display:flex;gap:4px;}
  .ai-dots span{width:6px;height:6px;border-radius:50%;background:var(--g);animation:dots 1.2s infinite;}
  .ai-dots span:nth-child(2){animation-delay:.2s;}
  .ai-dots span:nth-child(3){animation-delay:.4s;}
  .ai-thinking-text{font-size:12px;color:var(--t3);}
  .ai-generate-btn{
    width:100%;background:var(--g);color:var(--bg);
    border:none;border-radius:8px;padding:14px;
    font-family:'Archivo',sans-serif;font-size:13px;font-weight:700;
    letter-spacing:.07em;text-transform:uppercase;cursor:pointer;
    display:flex;align-items:center;justify-content:center;gap:8px;
    transition:all .2s;box-shadow:0 3px 10px rgba(16,185,129,.2);margin-top:12px;
  }
  .ai-generate-btn:hover{background:#34d399;transform:translateY(-1px);box-shadow:0 6px 20px rgba(16,185,129,.35);}
  .ai-generate-btn:disabled{opacity:.5;transform:none;cursor:not-allowed;box-shadow:none;}

  .ai-result{background:var(--g-dim);border:1px solid rgba(16,185,129,.25);border-radius:10px;padding:14px 16px;animation:fadeIn .3s ease;}
  .ai-result-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;}
  .ai-result-title{font-size:12px;font-weight:700;color:var(--g);letter-spacing:.04em;display:flex;align-items:center;gap:6px;}
  .ai-result-body{font-size:12px;color:var(--t2);line-height:1.7;}

  /* Advanced / Edit details panel */
  .adv-toggle{
    display:flex;align-items:center;justify-content:space-between;
    padding:12px 16px;background:var(--bg2);border:1px solid var(--line);
    border-radius:10px;cursor:pointer;transition:all .2s;
  }
  .adv-toggle:hover{border-color:var(--line2);}
  .adv-toggle.open{border-radius:10px 10px 0 0;border-color:rgba(16,185,129,.3);background:rgba(16,185,129,.04);}
  .adv-toggle-label{font-size:12px;font-weight:600;color:var(--t2);letter-spacing:.04em;text-transform:uppercase;transition:color .2s;}
  .adv-toggle.open .adv-toggle-label{color:var(--g);}
  .adv-toggle-hint{font-size:11px;color:var(--t3);}
  .adv-chevron{width:20px;height:20px;color:var(--t3);transition:transform .25s;flex-shrink:0;}
  .adv-chevron.open{transform:rotate(180deg);color:var(--g);}
  .adv-body{
    background:var(--bg2);border:1px solid rgba(16,185,129,.2);
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
    background:var(--surface);border:1px solid var(--line2);
    border-radius:7px;padding:10px 12px;
    font-family:'Archivo',sans-serif;font-size:13px;color:var(--t1);
    outline:none;transition:border-color .2s, box-shadow .2s;width:100%;
  }
  .form-input:focus,.form-select:focus,.form-textarea:focus{
    border-color:rgba(16,185,129,.45);box-shadow:0 0 0 3px rgba(16,185,129,.07);
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
    font-family:'Archivo',sans-serif;border:none;
  }
  .client-pill:hover{border:1px solid var(--g);color:var(--t1);}
  .client-pill-av{
    width:18px;height:18px;border-radius:50%;
    display:flex;align-items:center;justify-content:center;
    font-family:'Bebas Neue',sans-serif;font-size:10px;flex-shrink:0;
  }

  /* Line items */
  .line-items-header{display:grid;grid-template-columns:1fr 90px 90px 90px 28px;gap:8px;padding:0 0 6px;border-bottom:1px solid var(--line);}
  .li-col-head{font-size:10px;letter-spacing:.09em;text-transform:uppercase;color:var(--t3);font-weight:600;}
  .line-item-row{display:grid;grid-template-columns:1fr 90px 90px 90px 28px;gap:8px;padding:8px 0;align-items:center;border-bottom:1px solid var(--line);}
  .li-amt{font-size:13px;font-weight:600;color:var(--t1);text-align:right;padding-right:4px;}
  .li-del{background:transparent;border:none;cursor:pointer;color:var(--t3);border-radius:4px;padding:4px;transition:color .15s;display:flex;align-items:center;}
  .li-del:hover{color:var(--danger);}
  .add-line-btn{
    display:flex;align-items:center;gap:6px;
    background:transparent;border:1px dashed var(--line2);
    border-radius:6px;padding:8px 14px;cursor:pointer;
    font-size:12px;color:var(--t3);margin-top:8px;width:100%;
    justify-content:center;transition:all .15s;font-family:'Archivo',sans-serif;
  }
  .add-line-btn:hover{border-color:var(--g);color:var(--g);}

  /* Deposit presets */
  .deposit-preset{
    padding:4px 10px;border-radius:4px;border:1px solid var(--line2);
    background:transparent;color:var(--t3);font-size:11px;cursor:pointer;
    transition:all .15s;font-family:'Archivo',sans-serif;font-weight:600;
  }
  .deposit-preset.active{background:var(--g-dim);border-color:rgba(16,185,129,.3);color:var(--g);}
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
    transition:all .2s;box-shadow:0 3px 10px rgba(16,185,129,.2);
    font-family:'Archivo',sans-serif;
  }
  .apply-btn:hover{background:#34d399;}
  .clear-btn{
    background:transparent;color:var(--t3);border:1px solid var(--line2);
    border-radius:8px;padding:12px 16px;font-size:12px;cursor:pointer;
    transition:all .15s;white-space:nowrap;font-family:'Archivo',sans-serif;
  }
  .clear-btn:hover{border-color:var(--danger);color:var(--danger);}

  /* Preview */
  .preview-header{padding:14px 18px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;}
  .preview-header-title{font-size:12px;font-weight:600;color:var(--t2);letter-spacing:.05em;text-transform:uppercase;}
  .preview-body{flex:1;overflow-y:auto;padding:18px;}
  .preview-invoice{background:var(--bg2);border:1px solid var(--line2);border-radius:10px;overflow:hidden;}
  .prev-top{background:var(--surface);padding:16px 18px;border-bottom:1px solid var(--line);position:relative;}
  .prev-top::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--g),transparent 60%);opacity:.6;}
  .prev-brand{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--t1);}
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
  .btn-primary{background:var(--g);color:var(--bg);border:none;border-radius:6px;padding:9px 18px;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;flex:1;font-family:'Archivo',sans-serif;transition:all .15s;}
  .btn-primary:hover{background:#34d399;}
  .btn-primary:disabled{opacity:.5;cursor:not-allowed;}
  .btn-outline{background:transparent;color:var(--t2);border:1px solid var(--line2);border-radius:6px;padding:9px 14px;font-size:12px;font-weight:600;letter-spacing:.05em;text-transform:uppercase;cursor:pointer;font-family:'Archivo',sans-serif;transition:all .15s;}
  .btn-outline:hover{border-color:var(--g);color:var(--g);}
  .pill-draft{background:rgba(100,116,139,.12);color:rgba(248,250,252,.3);border:1px solid rgba(100,116,139,.2);display:inline-block;font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;padding:3px 9px;border-radius:4px;}

  /* Send Modal */
  .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);backdrop-filter:blur(4px);z-index:500;display:flex;align-items:center;justify-content:center;padding:16px;}
  .modal-box{background:var(--bg2);border:1px solid var(--line2);border-radius:14px;width:100%;max-width:480px;overflow:hidden;animation:modalIn .2s ease;}
  .modal-header{padding:20px 24px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;}
  .modal-title{font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:2px;color:var(--t1);}
  .modal-close{background:transparent;border:none;color:var(--t3);cursor:pointer;font-size:20px;line-height:1;padding:0 4px;}
  .modal-body{padding:24px;}
  .modal-footer{padding:16px 24px;border-top:1px solid var(--line);display:flex;gap:8px;justify-content:flex-end;}
  .channel-tabs{display:flex;gap:6px;margin-bottom:20px;}
  .channel-tab{flex:1;padding:10px;border-radius:8px;border:1px solid var(--line2);background:transparent;color:var(--t3);font-size:12px;font-weight:600;cursor:pointer;font-family:'Archivo',sans-serif;text-transform:uppercase;letter-spacing:.05em;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:7px;}
  .channel-tab.active{border-color:var(--g);background:var(--g-dim);color:var(--g);}
  .channel-tab.active.wa{border-color:#25D366;background:rgba(37,211,102,.1);color:#25D366;}
  .success-banner{display:flex;align-items:center;gap:10px;padding:14px 16px;background:rgba(16,185,129,.1);border:1px solid rgba(16,185,129,.25);border-radius:8px;margin-bottom:16px;}

  @media(max-width:1024px){
    .gen-layout{grid-template-columns:1fr;}
    .gen-right{display:none;}
  }
  @media(max-width:600px){
    .gen-wrap{padding:12px 16px;}
    .form-grid{grid-template-columns:1fr;}
  }
`

// ── Component ─────────────────────────────────────────────────────────────────
export default function NewInvoicePage() {
  const router      = useRouter()
  const searchParams = useSearchParams()
  const editId       = searchParams.get('edit')

  // Data
  const [profile,  setProfile]  = useState<Profile | null>(null)
  const [clients,  setClients]  = useState<Client[]>([])

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
  const [notes,       setNotes]       = useState('')
  const [tc,          setTc]          = useState('')
  const [terms,       setTerms]       = useState('30')

  // AI
  const [prompt,    setPrompt]    = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult,  setAiResult]  = useState<string | null>(null)

  // UI
  const [advOpen,  setAdvOpen]  = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

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

  useEffect(() => {
    const calls: Promise<any>[] = [
      fetch('/api/profile', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/clients', { credentials: 'include' }).then(r => r.json()),
    ]
    if (editId) calls.push(fetch(`/api/invoices/${editId}`, { credentials: 'include' }).then(r => r.json()))

    Promise.all(calls).then(([pd, cd, editData]) => {
      const p: Profile = pd.profile
      if (p) {
        setProfile(p)
        if (!editId) {
          setCurrency(p.default_currency || 'P')
          setVatRate(Number(p.default_vat_rate) || 14)
        }
      }
      setClients(cd.clients ?? [])

      if (editId && editData?.invoice) {
        const inv = editData.invoice
        setClientName(inv.client_name || '')
        setClientEmail(inv.client_email || '')
        setClientPhone(inv.client_phone || '')
        setProject(inv.project || '')
        setCurrency(inv.currency || p?.default_currency || 'P')
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
      }
    })
  }, [editId])

  // ── Computed totals ──
  const subtotal = useMemo(() => items.reduce((s, i) => s + (i.qty || 0) * (i.rate || 0), 0), [items])
  const vatAmt   = useMemo(() => subtotal * (vatRate / 100), [subtotal, vatRate])
  const total    = useMemo(() => subtotal + vatAmt, [subtotal, vatAmt])
  const depositAmt = useMemo(() => depositOn ? total * (depositPct / 100) : 0, [depositOn, total, depositPct])

  // ── Helpers ──
  function clearForm() {
    setSelectedClientId(null)
    setClientName(''); setClientEmail(''); setClientPhone(''); setProject('')
    setCurrency(profile?.default_currency || 'P')
    setIssueDate(today()); setDueDate(addDays(today(), 30))
    setVatRate(Number(profile?.default_vat_rate) || 14)
    setItems([{ desc: '', qty: 1, rate: 0 }])
    setDepositOn(false); setDepositPct(50)
    setNotes(''); setTc(''); setTerms('30')
    setPrompt(''); setAiResult(null)
  }

  function selectClient(c: Client) {
    setSelectedClientId(c.id)
    setClientName(c.name)
    setClientEmail(c.email ?? '')
    setClientPhone(c.phone ?? '')
    if (!advOpen) setAdvOpen(true)
  }

  function updateItem(i: number, field: keyof LineItem, val: string | number) {
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: val } : it))
  }

  function addItem() {
    setItems(prev => [...prev, { desc: '', qty: 1, rate: 0 }])
  }

  function removeItem(i: number) {
    setItems(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i))
  }

  // ── AI generation ──
  async function generateInvoice() {
    if (!prompt.trim() || aiLoading) return
    setAiLoading(true)
    setAiResult(null)
    try {
      const res  = await fetch('/api/ai/generate', {
        method: 'POST', credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'AI error')
      const inv = data.invoice
      if (inv.client_name)  setClientName(inv.client_name)
      if (inv.client_email) setClientEmail(inv.client_email)
      if (inv.client_phone) setClientPhone(inv.client_phone)
      if (inv.project)      setProject(inv.project)
      if (inv.currency)     setCurrency(inv.currency)
      if (inv.vat_rate != null) setVatRate(Number(inv.vat_rate))
      if (inv.due_days)     setDueDate(addDays(today(), Number(inv.due_days)))
      if (inv.notes)        setNotes(inv.notes)
      if (inv.items?.length) {
        setItems(inv.items.map((it: any) => ({ desc: it.description || '', qty: Number(it.quantity) || 1, rate: Number(it.unit_price) || 0 })))
      }
      if (inv.deposit_amount > 0) {
        setDepositOn(true)
        const pct = total > 0 ? Math.round((inv.deposit_amount / total) * 100) : 50
        setDepositPct(pct)
      }
      setAdvOpen(true)
      const lines = [
        inv.client_name && `Client: ${inv.client_name}`,
        inv.project && `Project: ${inv.project}`,
        inv.items?.length && `${inv.items.length} line item${inv.items.length !== 1 ? 's' : ''} detected`,
        inv.vat_rate != null && `VAT: ${inv.vat_rate}%`,
        inv.due_days && `Payment terms: ${inv.due_days} days`,
      ].filter(Boolean)
      setAiResult(lines.join(' · ') || 'Invoice details extracted')
    } catch (e: any) {
      setAiResult('Could not parse: ' + (e.message || 'AI error'))
    } finally {
      setAiLoading(false)
    }
  }

  // ── Save invoice ──
  async function saveInvoice(status: 'draft' | 'sent') {
    setSaving(true)
    try {
      const payload = {
        status,
        client_id:      selectedClientId ?? null,
        client_name:    clientName || 'Unknown Client',
        client_email:   clientEmail || null,
        client_phone:   clientPhone || null,
        project:        project || null,
        currency,
        issue_date:     issueDate,
        due_date:       dueDate || null,
        vat_rate:       vatRate,
        deposit_amount: depositAmt,
        notes:          notes || null,
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
      await saveInvoice('draft')
      router.push('/invoices')
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
      setTimeout(() => { setSendModalOpen(false); router.push('/invoices') }, 1800)
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

  const COLORS = ['#10B981','#3B82F6','#F59E0B','#E8D8C3','#EF4444','#059669']

  return (
    <>
      <style>{CSS}</style>

      <div className="topbar"><div className="page-title">{editId ? 'EDIT INVOICE' : 'NEW INVOICE'}</div></div>

      <div className="gen-wrap">
        <div className="gen-layout">

          {/* ── LEFT: Form ── */}
          <div className="gen-left">

            {/* AI Hero */}
            <div className="ai-hero">
              <div className="ai-hero-header">
                <div className="ai-hero-icon">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="1.8"><path d="M2 8l5 5 7-7"/><circle cx="8" cy="8" r="7" strokeOpacity=".3"/></svg>
                </div>
                <div>
                  <div className="ai-hero-title">Describe your work</div>
                  <div className="ai-hero-sub">AI will extract client, line items, rates and VAT automatically</div>
                </div>
              </div>

              <textarea
                ref={textareaRef}
                className={`ai-big-textarea${aiLoading ? ' thinking' : ''}`}
                placeholder='e.g. "Phase 2 structural review for Molapo Tower — 40 hours at P950/hr plus P2,400 site inspection, 30-day payment terms"'
                rows={3}
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) generateInvoice() }}
                disabled={aiLoading}
              />

              <div className="prompt-chips">
                {Object.entries(CHIP_PROMPTS).map(([k, v]) => (
                  <button key={k} className="prompt-chip" onClick={() => { setPrompt(v); textareaRef.current?.focus() }}>
                    {k.charAt(0).toUpperCase() + k.slice(1).replace(/([A-Z])/g, ' $1')}
                  </button>
                ))}
              </div>

              {aiLoading && (
                <div className="ai-thinking">
                  <div className="ai-dots"><span/><span/><span/></div>
                  <span className="ai-thinking-text">Reading your description…</span>
                </div>
              )}

              <button className="ai-generate-btn" onClick={generateInvoice} disabled={aiLoading || !prompt.trim()}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M2 8l5 5 7-7"/></svg>
                {aiLoading ? 'Generating…' : 'Generate Invoice'}
                {!aiLoading && <span style={{ fontSize: 11, opacity: .6, fontWeight: 400, letterSpacing: 0, textTransform: 'none', marginLeft: 4 }}>or Cmd+Enter</span>}
              </button>
            </div>

            {/* AI Result */}
            {aiResult && (
              <div className="ai-result">
                <div className="ai-result-header">
                  <div className="ai-result-title">
                    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#10B981" strokeWidth="2"><path d="M2 8l5 5 7-7"/></svg>
                    Invoice generated
                  </div>
                  <button onClick={() => setAiResult(null)} style={{ background: 'transparent', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>×</button>
                </div>
                <div className="ai-result-body">{aiResult}</div>
              </div>
            )}

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
                    <label className="form-label">Client name</label>
                    <input className="form-input" value={clientName} onChange={e => { setClientName(e.target.value); setSelectedClientId(null) }} placeholder="e.g. Molapo Tower Ltd."/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client email</label>
                    <input className="form-input" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@company.co.bw"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Client phone (WhatsApp)</label>
                    <input className="form-input" type="tel" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="+267 71 234 567"/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Currency</label>
                    <select className="form-select" value={currency} onChange={e => setCurrency(e.target.value)}>
                      {CURRENCIES.map(c => <option key={c.v} value={c.v}>{c.l}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Issue date</label>
                    <input className="form-input" type="date" value={issueDate} onChange={e => setIssueDate(e.target.value)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Due date</label>
                    <input className="form-input" type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}/>
                  </div>
                  <div className="form-group full">
                    <label className="form-label">Project description</label>
                    <input className="form-input" value={project} onChange={e => setProject(e.target.value)} placeholder="e.g. Molapo Tower — Phase 2 Structural Review"/>
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
                      <input className="form-input" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} placeholder="Service description" style={{ padding: '7px 10px' }}/>
                      <input className="form-input" type="number" value={item.qty} min={0} step="0.5" onChange={e => updateItem(i, 'qty', parseFloat(e.target.value) || 0)} style={{ padding: '7px 10px' }}/>
                      <input className="form-input" type="number" value={item.rate} min={0} onChange={e => updateItem(i, 'rate', parseFloat(e.target.value) || 0)} style={{ padding: '7px 10px' }}/>
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
                    <label className="form-label">VAT rate (%)</label>
                    <input className="form-input" type="number" value={vatRate} min={0} max={100} step="0.1" onChange={e => setVatRate(parseFloat(e.target.value) || 0)}/>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Payment terms</label>
                    <select className="form-select" value={terms} onChange={e => setTerms(e.target.value)}>
                      <option value="30">30 days</option>
                      <option value="14">14 days</option>
                      <option value="7">7 days</option>
                      <option value="0">Due on receipt</option>
                    </select>
                  </div>

                  {/* Deposit */}
                  <div className="form-group full">
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      Deposit required
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 11, color: 'var(--t3)' }}>{depositOn ? 'On' : 'Off'}</span>
                        <div className={`toggle-sw${depositOn ? ' on' : ''}`} onClick={() => setDepositOn(p => !p)}/>
                      </span>
                    </label>
                    {depositOn && (
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                        <div style={{ flex: 1, minWidth: 120 }}>
                          <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 5 }}>Deposit %</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <input className="form-input" type="number" min={1} max={100} value={depositPct} onChange={e => setDepositPct(Number(e.target.value))} style={{ width: 80, padding: '7px 10px' }}/>
                            <span style={{ fontSize: 13, color: 'var(--t3)' }}>%</span>
                            <div style={{ display: 'flex', gap: 4 }}>
                              {[25, 50, 100].map(p => (
                                <button key={p} className={`deposit-preset${depositPct === p ? ' active' : ''}`} onClick={() => setDepositPct(p)}>{p}%</button>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div style={{ background: 'var(--g-dim)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 8, padding: '8px 14px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--g)', marginBottom: 2 }}>Deposit due</div>
                          <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: 'var(--g)' }}>{fmtAmt(depositAmt, currency)}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-group full">
                    <label className="form-label">Notes (optional)</label>
                    <input className="form-input" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Bank: FNB Botswana, Acc: 62123456789"/>
                  </div>

                  <div className="form-group full">
                    <label className="form-label">Terms &amp; conditions (optional)</label>
                    <textarea className="form-textarea" value={tc} onChange={e => setTc(e.target.value)} rows={3} placeholder="e.g. Payment is due within 30 days. Late payments incur 2% interest per month."/>
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
                      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                        <rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/>
                        <rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/>
                        <rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/>
                        <rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/>
                      </svg>
                      <div className="prev-brand">{firmName.toUpperCase()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 14, letterSpacing: 2, color: 'var(--g)' }}>INVOICE</div>
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
                    <div className="prev-total-row"><span>VAT ({vatRate}%)</span><span>{fmtAmt(vatAmt, currency)}</span></div>
                  </div>
                  <div className="prev-total-final">
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'rgba(255,255,255,.8)' }}>Total Due</span>
                    <span style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 20, color: '#fff', letterSpacing: 1 }}>{fmtAmt(total, currency)}</span>
                  </div>

                  {depositOn && depositAmt > 0 && (
                    <div style={{ marginTop: 10, background: 'var(--g-dim)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 7, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--g)', marginBottom: 2 }}>Deposit Required</div>
                          <div style={{ fontSize: 11, color: 'var(--t3)' }}>{depositPct}% of total</div>
                        </div>
                        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, color: 'var(--g)' }}>{fmtAmt(depositAmt, currency)}</div>
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
                      <svg width="14" height="14" viewBox="0 0 32 32" fill="none"><rect x="0" y="17" width="6" height="15" rx="2" fill="#10B981"/><rect x="9" y="12" width="6" height="20" rx="2" fill="#10B981" opacity=".82"/><rect x="18" y="6" width="6" height="26" rx="2" fill="#10B981" opacity=".65"/><rect x="27" y="0" width="5" height="32" rx="2" fill="#10B981" opacity=".48"/></svg>
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
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" fill="rgba(16,185,129,.2)"/><path d="M6 10l3 3 5-5" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round"/></svg>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--g)' }}>Invoice sent!</div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>Redirecting to invoices…</div>
                  </div>
                </div>
              ) : (
                <>
                  {savedInvNum && (
                    <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 16 }}>
                      Invoice <strong style={{ color: 'var(--t2)' }}>{savedInvNum}</strong> for <strong style={{ color: 'var(--t2)' }}>{clientName}</strong> — {fmtAmt(total, currency)}
                    </div>
                  )}
                  <div className="channel-tabs">
                    <button className={`channel-tab${channel === 'email' ? ' active' : ''}`} onClick={() => setChannel('email')}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="1" y="3" width="14" height="10" rx="2"/><path d="M1 5l7 5 7-5"/></svg>
                      Email
                    </button>
                    <button className={`channel-tab${channel === 'wa' ? ' active wa' : ''}`} onClick={() => setChannel('wa')}>
                      <svg width="14" height="14" viewBox="0 0 16 16" fill={channel === 'wa' ? '#25D366' : 'currentColor'}><path d="M8 0C3.58 0 0 3.58 0 8c0 1.41.37 2.74 1.02 3.89L0 16l4.25-1.11A7.94 7.94 0 008 16c4.42 0 8-3.58 8-8s-3.58-8-8-8z"/></svg>
                      WhatsApp
                    </button>
                  </div>

                  {channel === 'email' ? (
                    <div className="form-group">
                      <label className="form-label">Send to email</label>
                      <input className="form-input" type="email" value={sendEmail} onChange={e => setSendEmail(e.target.value)} placeholder="client@email.com" autoFocus/>
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">Send to WhatsApp number</label>
                      <input className="form-input" type="tel" value={sendPhone} onChange={e => setSendPhone(e.target.value)} placeholder="+267 71 234 567" autoFocus/>
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
