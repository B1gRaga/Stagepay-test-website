export default function Loading() {
  return (
    <>
      <style>{`@keyframes barLoad{0%,100%{transform:scaleY(.3)}50%{transform:scaleY(1)}}`}</style>
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'60vh'}}>
        <div style={{display:'flex',alignItems:'flex-end',gap:'5px',height:'28px'}}>
          <div style={{width:6,height:'100%',borderRadius:2,background:'#10B981',animation:'barLoad .75s 0ms ease-in-out infinite',transformOrigin:'bottom'}}/>
          <div style={{width:6,height:'100%',borderRadius:2,background:'#10B981',opacity:.82,animation:'barLoad .75s 150ms ease-in-out infinite',transformOrigin:'bottom'}}/>
          <div style={{width:6,height:'100%',borderRadius:2,background:'#10B981',opacity:.65,animation:'barLoad .75s 300ms ease-in-out infinite',transformOrigin:'bottom'}}/>
          <div style={{width:6,height:'100%',borderRadius:2,background:'#10B981',opacity:.48,animation:'barLoad .75s 150ms ease-in-out infinite',transformOrigin:'bottom'}}/>
        </div>
      </div>
    </>
  )
}