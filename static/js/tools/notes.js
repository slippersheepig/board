export async function init(){
  const el = document.createElement('div');
  el.innerHTML = `
    <div>
      <textarea id="nArea" style="width:100%;height:120px"></textarea>
      <div style="margin-top:6px;">
        <button id="nSave">保存</button>
        <button id="nClear">清空</button>
      </div>
    </div>
  `;
  const KEY = 'cool_dashboard_notes';
  const area = el.querySelector('#nArea');
  area.value = localStorage.getItem(KEY) || '';
  el.querySelector('#nSave').onclick = ()=> {
    localStorage.setItem(KEY, area.value || '');
    alert('已保存到本地浏览器');
  };
  el.querySelector('#nClear').onclick = ()=> {
    if(confirm('清空？')){ area.value=''; localStorage.removeItem(KEY); }
  };
  return el;
}
