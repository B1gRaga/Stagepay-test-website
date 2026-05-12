export default function Loading() {
  return (
    <>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}.sp{animation:sp .7s linear infinite;display:inline-block}`}</style>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', gap:10, color:'rgba(248,250,252,0.3)', fontSize:13, fontFamily:'sans-serif' }}>
        <span className="sp" style={{ width:16, height:16, borderRadius:'50%', border:'2px solid rgba(255,255,255,.08)', borderTopColor:'#10B981' }}/>
        Loading…
      </div>
    </>
  )
}
