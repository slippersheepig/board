export async function init(){
  const el = document.createElement('div');
  el.innerHTML = `
    <div>
      <div id="pomDisplay" style="font-size:18px">未运行</div>
      <div style="margin-top:8px"><button id="pomStart">开始 25 分</button> <button id="pomStop">停止</button></div>
    </div>
  `;
  let timer=null, remaining=0;
  function formatT(sec){ const m = Math.floor(sec/60).toString().padStart(2,'0'); const s = (sec%60).toString().padStart(2,'0'); return `${m}:${s}`; }
  el.querySelector('#pomStart').onclick = ()=>{
    if(timer) return;
    remaining=25*60; el.querySelector('#pomDisplay').textContent=formatT(remaining);
    timer = setInterval(()=>{ remaining--; el.querySelector('#pomDisplay').textContent=formatT(remaining); if(remaining<=0){ clearInterval(timer); timer=null; el.querySelector('#pomDisplay').textContent='完成！'; } },1000);
  };
  el.querySelector('#pomStop').onclick = ()=>{ if(timer){ clearInterval(timer); timer=null; el.querySelector('#pomDisplay').textContent='已停止'; } };
  return el;
}
