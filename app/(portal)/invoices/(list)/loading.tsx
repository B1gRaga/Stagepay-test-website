// Same frame as InvoicesTable, so nothing jumps when the rows arrive.
const CSS = `
  .sk-top{height:56px;border-bottom:1px solid var(--line);background:var(--bg2);display:flex;align-items:center;padding:0 28px;}
  .sk-content{padding:24px 28px;}
  .sk{display:block;border-radius:6px;background:color-mix(in srgb,var(--t1) 8%,transparent);animation:sk-pulse 1.4s ease-in-out infinite;}
  .sk-sheet{background:var(--bg2);border:1px solid var(--line);border-radius:12px;overflow:hidden;margin-top:14px;}
  .sk-row{display:flex;align-items:center;gap:16px;height:62px;padding:0 20px;border-bottom:1px solid var(--line);}
  .sk-row:last-child{border-bottom:0;}
  @keyframes sk-pulse{50%{opacity:.5}}
  @media (prefers-reduced-motion: reduce){.sk{animation:none;}}
  @media(max-width:768px){.sk-top{padding:0 16px;}.sk-content{padding:16px;}.sk-row{padding:0 16px;}}
`

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading invoices">
      <style>{CSS}</style>
      <div className="sk-top"><span className="sk" style={{ width: 90, height: 18 }} /></div>
      <div className="sk-content">
        <span className="sk" style={{ width: 260, height: 16, marginBottom: 22 }} />
        <span className="sk" style={{ width: '100%', maxWidth: 380, height: 38, borderRadius: 8 }} />
        <div className="sk-sheet">
          {Array.from({ length: 7 }, (_, i) => (
            <div key={i} className="sk-row">
              <span className="sk" style={{ width: 18, height: 18, borderRadius: 9 }} />
              <span style={{ flex: 1 }}>
                <span className="sk" style={{ width: `${40 + ((i * 17) % 30)}%`, height: 13, marginBottom: 7 }} />
                <span className="sk" style={{ width: '22%', height: 11 }} />
              </span>
              <span className="sk" style={{ width: 70, height: 15 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
