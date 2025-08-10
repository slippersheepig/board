export async function init(){
  const c = document.createElement('div');
  c.innerHTML = `
    <div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;width:100%">
      <div id="lenBlock" style="flex:1;min-width:240px;display:flex;flex-direction:column;align-items:center;gap:8px">
        <h4 style="margin:0">长度</h4>
        <input id="lenVal" placeholder="数值" style="width:85%;"/>
        <div style="display:flex;gap:8px;width:85%;justify-content:center;">
          <select id="lenFrom" style="flex:1"><option value="m">米 (m)</option><option value="cm">厘米 (cm)</option><option value="ft">英尺 (ft)</option></select>
          <select id="lenTo" style="flex:1"><option value="cm">厘米 (cm)</option><option value="m">米 (m)</option><option value="ft">英尺 (ft)</option></select>
        </div>
        <div id="lenOut" style="width:85%;text-align:center;color:var(--muted);margin-top:6px;">结果：--</div>
      </div>

      <div id="tpBlock" style="flex:1;min-width:240px;display:flex;flex-direction:column;align-items:center;gap:8px">
        <h4 style="margin:0">温度</h4>
        <!-- 顶部一行：左侧是“长度转换”按钮（来源于左侧长度输入），右侧可以放提示或空白 -->
        <div class="row" style="width:85%;justify-content:flex-start;">
          <button id="lenConvertBtn" class="btn">转换（长度）</button>
          <div style="flex:1"></div>
        </div>

        <input id="tpVal" placeholder="数值" style="width:85%;"/>
        <div style="display:flex;gap:8px;width:85%;justify-content:center;">
          <select id="tpFrom" style="flex:1"><option value="C">℃</option><option value="F">℉</option></select>
          <select id="tpTo" style="flex:1"><option value="F">℉</option><option value="C">℃</option></select>
        </div>
        <div id="tpOut" style="width:85%;text-align:center;color:var(--muted);margin-top:6px;">结果：--</div>
      </div>
    </div>
  `;

  const lenVal = c.querySelector('#lenVal');
  const lenFrom = c.querySelector('#lenFrom');
  const lenTo = c.querySelector('#lenTo');
  const lenOut = c.querySelector('#lenOut');

  const tpVal = c.querySelector('#tpVal');
  const tpFrom = c.querySelector('#tpFrom');
  const tpTo = c.querySelector('#tpTo');
  const tpOut = c.querySelector('#tpOut');

  const lenConvertBtn = c.querySelector('#lenConvertBtn');

  lenConvertBtn.onclick = ()=>{
    const v = parseFloat(lenVal.value || '0');
    const from = lenFrom.value;
    const to = lenTo.value;
    let m = v;
    if(from === 'cm') m = v/100;
    if(from === 'ft') m = v*0.3048;
    let out = m;
    if(to === 'cm') out = m*100;
    if(to === 'ft') out = m/0.3048;
    lenOut.textContent = '结果：' + Number.isFinite(out) ? out : String(out);
    if(typeof out === 'number' && isFinite(out)) {
      lenOut.textContent = '结果：' + (Math.round(out * 10000)/10000);
    }
  };

  function convertTemp(){
    const v = parseFloat(tpVal.value || '0');
    const from = tpFrom.value;
    const to = tpTo.value;
    let cval = v;
    if(from === 'F') cval = (v - 32) * 5/9;
    let out = cval;
    if(to === 'F') out = cval * 9/5 + 32;
    tpOut.textContent = '结果：' + (Math.round(out * 100)/100);
  }

  tpVal.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') convertTemp(); });

  tpOut.addEventListener('click', convertTemp);

  return c;
}
