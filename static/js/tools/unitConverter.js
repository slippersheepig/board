export async function init(){
  const c = document.createElement('div');
  c.innerHTML = `
    <div style="display:flex;gap:18px;flex-wrap:wrap;justify-content:center;width:100%;padding:6px 0">
      <div id="lenBlock" class="converter-block" style="flex:1;min-width:240px;display:flex;flex-direction:column;align-items:center;gap:8px">
        <h4 style="margin:0">长度</h4>
        <input id="lenVal" placeholder="数值" style="width:90%;"/>
        <div class="converter-row" style="width:90%; display:flex; gap:8px; align-items:center; justify-content:center; flex-wrap:wrap;">
          <select id="lenFrom" style="flex:1; min-width:100px;"><option value="m">米 (m)</option><option value="cm">厘米 (cm)</option><option value="ft">英尺 (ft)</option></select>
          <select id="lenTo"   style="flex:1; min-width:100px;"><option value="cm">厘米 (cm)</option><option value="m">米 (m)</option><option value="ft">英尺 (ft)</option></select>
          <button id="lenConvertBtn" class="neon-btn" type="button">转换</button>
        </div>
        <div id="lenOut" style="width:90%;text-align:center;color:var(--muted);margin-top:6px;">结果：--</div>
      </div>
      <div id="tpBlock" class="converter-block" style="flex:1;min-width:240px;display:flex;flex-direction:column;align-items:center;gap:8px">
        <h4 style="margin:0">温度</h4>
        <input id="tpVal" placeholder="数值" style="width:90%;"/>
        <div class="converter-row" style="width:90%; display:flex; gap:8px; align-items:center; justify-content:center; flex-wrap:wrap;">
          <select id="tpFrom" style="flex:1; min-width:100px;"><option value="C">℃</option><option value="F">℉</option></select>
          <select id="tpTo"   style="flex:1; min-width:100px;"><option value="F">℉</option><option value="C">℃</option></select>
          <button id="tpConvertBtn" class="neon-btn" type="button">转换</button>
        </div>
        <div id="tpOut" style="width:90%;text-align:center;color:var(--muted);margin-top:6px;">结果：--</div>
      </div>
    </div>
  `;

  function fmtNum(v){
    if(typeof v !== 'number' || !isFinite(v)) return '--';
    const rounded = Math.round(v * 1e6) / 1e6;
    return ('' + rounded).replace(/\.?0+$/, '');
  }

  const lenVal = c.querySelector('#lenVal');
  const lenFrom = c.querySelector('#lenFrom');
  const lenTo = c.querySelector('#lenTo');
  const lenOut = c.querySelector('#lenOut');

  const tpVal = c.querySelector('#tpVal');
  const tpFrom = c.querySelector('#tpFrom');
  const tpTo = c.querySelector('#tpTo');
  const tpOut = c.querySelector('#tpOut');

  const lenConvertBtn = c.querySelector('#lenConvertBtn');
  const tpConvertBtn = c.querySelector('#tpConvertBtn');

  lenConvertBtn.onclick = ()=>{
    const v = parseFloat(lenVal.value || '0');
    const from = lenFrom.value;
    const to = lenTo.value;
    let m = v;
    if(from === 'cm') m = v / 100;
    if(from === 'ft') m = v * 0.3048;
    let out = m;
    if(to === 'cm') out = m * 100;
    if(to === 'ft') out = m / 0.3048;

    if(typeof out === 'number' && isFinite(out)) {
      lenOut.textContent = '结果：' + fmtNum(out);
    } else {
      lenOut.textContent = '结果：--';
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
    if(typeof out === 'number' && isFinite(out)) {
      tpOut.textContent = '结果：' + fmtNum(out);
    } else {
      tpOut.textContent = '结果：--';
    }
  }

  lenVal.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') lenConvertBtn.click(); });
  tpVal.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') tpConvertBtn.click(); });

  tpConvertBtn.addEventListener('click', convertTemp);

  return c;
}
