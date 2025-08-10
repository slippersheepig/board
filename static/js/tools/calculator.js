export async function init(){
  const container = document.createElement('div');
  container.innerHTML = `
    <div style="display:flex;gap:8px;align-items:center">
      <input id="calcExpr" placeholder="例如 12/3 + 4" style="flex:1;padding:6px;border-radius:6px"/>
      <button id="calcGo">计算</button>
    </div>
    <div id="calcOut" style="margin-top:8px;color:var(--muted)"></div>
  `;
  const expr = container.querySelector('#calcExpr');
  const out = container.querySelector('#calcOut');
  container.querySelector('#calcGo').addEventListener('click', ()=>{
    try{
      if(!/^[0-9+\-*/().\s]+$/.test(expr.value)) throw new Error('非法字符');
      const res = Function(`"use strict"; return (${expr.value})`)();
      out.textContent = String(res);
    }catch(e){ out.textContent = '表达式错误'; }
  });
  return container;
}
