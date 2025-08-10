export async function init(){
  const c = document.createElement('div');
  c.innerHTML = `
    <div style="display:flex;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px">
        <h4>长度</h4>
        <input id="lenVal" placeholder="数值" />
        <select id="lenFrom"><option value="m">米(m)</option><option value="cm">厘米(cm)</option><option value="ft">英尺(ft)</option></select>
        <select id="lenTo"><option value="cm">厘米(cm)</option><option value="m">米(m)</option><option value="ft">英尺(ft)</option></select>
        <button id="lenGo">转换</button>
        <div id="lenOut"></div>
      </div>

      <div style="flex:1;min-width:200px">
        <h4>温度</h4>
        <input id="tpVal" placeholder="数值" />
        <select id="tpFrom"><option value="C">℃</option><option value="F">℉</option></select>
        <select id="tpTo"><option value="F">℉</option><option value="C">℃</option></select>
        <button id="tpGo">转换</button>
        <div id="tpOut"></div>
      </div>
    </div>
  `;
  c.querySelector('#lenGo').onclick = ()=>{
    const v = parseFloat(c.querySelector('#lenVal').value||'0');
    const from = c.querySelector('#lenFrom').value;
    const to = c.querySelector('#lenTo').value;
    let m = v;
    if(from === 'cm') m = v/100;
    if(from === 'ft') m = v*0.3048;
    let out = m;
    if(to === 'cm') out = m*100;
    if(to === 'ft') out = m/0.3048;
    c.querySelector('#lenOut').textContent = out;
  };
  c.querySelector('#tpGo').onclick = ()=>{
    const v = parseFloat(c.querySelector('#tpVal').value||'0');
    const from = c.querySelector('#tpFrom').value;
    const to = c.querySelector('#tpTo').value;
    let cval = v;
    if(from === 'F') cval = (v - 32) * 5/9;
    let out = cval;
    if(to === 'F') out = cval * 9/5 + 32;
    c.querySelector('#tpOut').textContent = out.toFixed(2);
  };
  return c;
}
