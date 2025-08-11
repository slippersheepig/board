export async function init(){
  const el = document.createElement('div');
  el.innerHTML = `
    <div>
      <div id="swDisplay" style="font-size:20px">00:00.000</div>
      <div style="margin-top:8px"><button id="swStart">开始</button> <button id="swStop">停止</button> <button id="swReset">重置</button></div>
      <div id="swLaps" style="margin-top:8px;max-height:120px;overflow:auto"></div>
    </div>
  `;
  let running=false, startT=0, elapsed=0, raf=0;
  const disp = el.querySelector('#swDisplay');
  const laps = el.querySelector('#swLaps');

  function fmt(ms){ const mm = Math.floor(ms/60000).toString().padStart(2,'0'); const ss = Math.floor(ms/1000%60).toString().padStart(2,'0'); const msPart = Math.floor(ms%1000).toString().padStart(3,'0'); return `${mm}:${ss}.${msPart}`; }

  function tick(){
    const now = performance.now();
    const total = elapsed + (now - startT);
    disp.textContent = fmt(total);
    raf = requestAnimationFrame(tick);
  }

  el.querySelector('#swStart').onclick = ()=>{
    if(!running){
      running=true; startT = performance.now(); raf = requestAnimationFrame(tick);
    } else {
      const now = performance.now(); const total = elapsed + (now - startT);
      const item = document.createElement('div'); item.textContent = fmt(total); laps.prepend(item);
    }
  };
  el.querySelector('#swStop').onclick = ()=>{
    if(running){ running=false; cancelAnimationFrame(raf); elapsed += performance.now() - startT; }
  };
  el.querySelector('#swReset').onclick = ()=>{
    running=false; cancelAnimationFrame(raf); elapsed=0; disp.textContent='00:00.000'; laps.innerHTML='';
  };
  return el;
}
