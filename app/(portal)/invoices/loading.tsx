export default function Loading() {
  return (
    <>
      <style>{`
        @keyframes sk{0%,100%{opacity:.35}50%{opacity:.7}}
        .sk{animation:sk 1.4s ease-in-out infinite;background:rgba(255,255,255,0.06);border-radius:4px;}
        html[data-theme="light"] .sk{background:rgba(15,23,42,0.08);}

        .sk-topbar{height:56px;border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:var(--bg2,#1E293B);}
        html[data-theme="light"] .sk-topbar{background:#ffffff;border-color:rgba(26,26,26,0.08);}

        .sk-content{padding:24px 28px;}
        .sk-filter{display:flex;gap:10px;margin-bottom:14px;}
        .sk-search{height:36px;flex:1;min-width:200px;}
        .sk-pill{height:28px;width:60px;border-radius:6px;}

        .sk-table{background:var(--bg2,#1E293B);border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;}
        html[data-theme="light"] .sk-table{background:#e9e3da;border-color:rgba(26,26,26,0.08);}
        .sk-thead{display:grid;grid-template-columns:28px 90px 1fr 140px 110px 110px 180px;gap:12px;padding:11px 20px;border-bottom:1px solid rgba(255,255,255,0.06);background:rgba(255,255,255,0.03);}
        html[data-theme="light"] .sk-thead{background:rgba(26,26,26,0.03);border-color:rgba(26,26,26,0.08);}
        .sk-th{height:10px;border-radius:3px;}
        .sk-row{display:grid;grid-template-columns:28px 90px 1fr 140px 110px 110px 180px;gap:12px;padding:14px 20px;border-bottom:1px solid rgba(255,255,255,0.06);align-items:center;}
        html[data-theme="light"] .sk-row{border-color:rgba(26,26,26,0.07);}
        .sk-row:last-child{border-bottom:none;}
        .sk-cell{height:13px;border-radius:3px;}

        @media(max-width:768px){
          .sk-topbar{padding:0 16px;}
          .sk-content{padding:12px 16px;}
          .sk-thead,.sk-row{display:none;}
          .sk-cards{background:var(--bg2,#1E293B);border:1px solid rgba(255,255,255,0.06);border-radius:12px;overflow:hidden;}
          html[data-theme="light"] .sk-cards{background:#e9e3da;border-color:rgba(26,26,26,0.08);}
          .sk-card{display:flex;align-items:center;gap:14px;padding:13px 16px;border-bottom:1px solid rgba(255,255,255,0.06);}
          html[data-theme="light"] .sk-card{border-color:rgba(26,26,26,0.07);}
          .sk-card:last-child{border-bottom:none;}
          .sk-av{width:36px;height:36px;border-radius:8px;flex-shrink:0;}
          .sk-card-info{flex:1;display:flex;flex-direction:column;gap:6px;}
          .sk-card-name{height:13px;width:55%;border-radius:3px;}
          .sk-card-meta{height:10px;width:35%;border-radius:3px;}
          .sk-card-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;}
          .sk-card-amt{height:16px;width:52px;border-radius:3px;}
          .sk-card-badge{height:18px;width:42px;border-radius:4px;}
        }
        @media(min-width:769px){.sk-cards{display:none;}}
        @media(max-width:600px){.sk-filter{flex-direction:column;}.sk-search{flex:none;width:100%;}}
      `}</style>

      {/* Topbar */}
      <div className="sk-topbar">
        <div className="sk" style={{ width: 90, height: 14, borderRadius: 3 }} />
        <div className="sk" style={{ width: 110, height: 32, borderRadius: 6 }} />
      </div>

      <div className="sk-content">
        {/* Filter bar */}
        <div className="sk-filter">
          <div className="sk sk-search" />
          {[60, 52, 70, 64, 72, 50].map((w, i) => (
            <div key={i} className="sk sk-pill" style={{ width: w }} />
          ))}
        </div>

        {/* Desktop table */}
        <div className="sk-table">
          <div className="sk-thead">
            <div className="sk sk-th" style={{ width: 16 }} />
            <div className="sk sk-th" style={{ width: 55 }} />
            <div className="sk sk-th" style={{ width: 48 }} />
            <div className="sk sk-th" style={{ width: 52 }} />
            <div className="sk sk-th" style={{ width: 36 }} />
            <div className="sk sk-th" style={{ width: 52 }} />
            <div className="sk sk-th" style={{ width: 100 }} />
          </div>
          {Array.from({ length: 8 }, (_, i) => (
            <div className="sk-row" key={i} style={{ animationDelay: `${i * 0.07}s` }}>
              <div className="sk sk-cell" style={{ width: 14, height: 14, borderRadius: 3 }} />
              <div className="sk sk-cell" style={{ width: '70%' }} />
              <div className="sk sk-cell" style={{ width: '55%' }} />
              <div className="sk sk-cell" style={{ width: '60%' }} />
              <div className="sk sk-cell" style={{ width: '65%' }} />
              <div className="sk sk-cell" style={{ width: '50%', height: 17, borderRadius: 3 }} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <div className="sk sk-cell" style={{ width: 44, height: 18, borderRadius: 4 }} />
                <div className="sk sk-cell" style={{ width: 24, height: 22, borderRadius: 4 }} />
              </div>
            </div>
          ))}
        </div>

        {/* Mobile card list */}
        <div className="sk-cards">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="sk-card" key={i}>
              <div className="sk sk-av" />
              <div className="sk-card-info">
                <div className="sk sk-card-name" />
                <div className="sk sk-card-meta" />
              </div>
              <div className="sk-card-right">
                <div className="sk sk-card-amt" />
                <div className="sk sk-card-badge" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
