export default function LoadingScreen() {
  const css = `
    .sp-load{
      position:fixed;inset:0;
      display:flex;flex-direction:column;align-items:center;justify-content:center;
      background:var(--bg,#0F172A);z-index:9000;gap:18px;
    }
    .sp-bars{display:flex;align-items:flex-end;gap:5px;height:52px;}
    .sp-bar{border-radius:3px 3px 2px 2px;background:#10B981;}

    /* bars start reversed (descending L→R) and settle to ascending L→R */
    .sp-b1{width:10px;animation:spB1 .8s cubic-bezier(.34,1.56,.64,1) .24s both;}
    .sp-b2{width:10px;opacity:.82;animation:spB2 .8s cubic-bezier(.34,1.56,.64,1) .12s both;}
    .sp-b3{width:10px;opacity:.65;animation:spB3 .8s cubic-bezier(.34,1.56,.64,1) .04s both;}
    .sp-b4{width: 9px;opacity:.48;animation:spB4 .8s cubic-bezier(.34,1.56,.64,1) 0s   both;}

    @keyframes spB1{from{height:52px}to{height:24px}}
    @keyframes spB2{from{height:42px}to{height:33px}}
    @keyframes spB3{from{height:33px}to{height:42px}}
    @keyframes spB4{from{height:24px}to{height:52px}}

    .sp-name{
      font-family:var(--font-bebas,sans-serif);
      font-size:20px;letter-spacing:4px;
      color:var(--t2,rgba(248,250,252,.5));
      animation:spFade .35s ease .88s both;
    }
    .sp-name em{color:#10B981;font-style:normal;}
    @keyframes spFade{
      from{opacity:0;transform:translateY(5px)}
      to{opacity:1;transform:none}
    }
  `
  return (
    <>
      <style>{css}</style>
      <div className="sp-load">
        <div className="sp-bars">
          <div className="sp-bar sp-b1" />
          <div className="sp-bar sp-b2" />
          <div className="sp-bar sp-b3" />
          <div className="sp-bar sp-b4" />
        </div>
        <div className="sp-name">STAGE<em>PAY</em></div>
      </div>
    </>
  )
}
