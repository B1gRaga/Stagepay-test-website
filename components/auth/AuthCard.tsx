// Form parts shared by every auth screen (sign in, sign up, password reset).
export const FORM_CSS = `
  @keyframes barLoad{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}
  .ac-title{font-size:24px;font-weight:800;letter-spacing:-.015em;line-height:1.2;margin-bottom:6px;color:#1F2A44;}
  .ac-sub{font-size:14px;color:#475569;line-height:1.55;margin-bottom:22px;}
  .ac-title + .ac-form,.ac-title + .ac-ok,.ac-title + .ac-btn{margin-top:18px;}
  .ac-form{display:flex;flex-direction:column;gap:16px;}
  .ac-group{display:flex;flex-direction:column;gap:6px;}
  .ac-group label,.ac-label{font-size:13px;font-weight:600;color:#1F2A44;}
  .ac-input{background:#F8F9FA;border:1px solid rgba(31,42,68,.14);border-radius:8px;height:46px;padding:0 14px;font:500 15px var(--font-manrope),sans-serif;color:#1F2A44;outline:none;width:100%;transition:border-color .15s,background-color .15s;}
  .ac-input:focus{background:#FFFFFF;border-color:#F2A900;}
  .ac-input::placeholder{color:#94A3B8;}
  .ac-code{text-align:center;font-size:22px;letter-spacing:.4em;font-variant-numeric:tabular-nums;}
  .ac-btn{height:46px;border:0;border-radius:8px;background:#F2A900;color:#1F2A44;font:700 15px var(--font-manrope),sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;width:100%;}
  .ac-btn:hover:not(:disabled){background:#FFB81C;}
  .ac-btn:disabled{opacity:.5;cursor:not-allowed;}
  .ac-btn:focus-visible,.ac-input:focus-visible,.ac-foot a:focus-visible,.ac-link:focus-visible{outline:2px solid #1F2A44;outline-offset:2px;}
  .ac-hint{font-size:12px;color:#64748B;}
  .ac-link{font-size:13px;font-weight:600;color:#1F2A44;text-decoration:underline;text-decoration-color:rgba(31,42,68,.3);text-underline-offset:3px;}
  .ac-error{background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.18);border-radius:8px;padding:10px 14px;font-size:13px;color:#B91C1C;line-height:1.5;}
  .ac-ok{background:rgba(29,168,81,.08);border:1px solid rgba(29,168,81,.25);border-radius:8px;padding:12px 14px;font-size:14px;color:#14532D;line-height:1.55;}
  .ac-foot{font-size:13px;color:#64748B;text-align:center;margin-top:22px;}
  .ac-foot a{color:#1F2A44;font-weight:600;text-decoration:underline;text-decoration-color:rgba(31,42,68,.3);text-underline-offset:3px;}
`

export function Spinner() {
  return (
    <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 13 }}>
      {[0, 150, 300, 150].map((d, i) => (
        <span key={i} style={{ width: 3, height: '100%', borderRadius: 1, background: '#1F2A44', opacity: [1, .82, .65, .48][i], animation: `barLoad .75s ${d}ms ease-in-out infinite`, transformOrigin: 'bottom', display: 'inline-block' }} />
      ))}
    </span>
  )
}
