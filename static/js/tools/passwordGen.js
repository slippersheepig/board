export async function init(){
  const el = document.createElement('div');
  el.innerHTML = `
    <div>
      <label>长度 <input id="pwLen" type="number" value="12" min="4" max="64" /></label>
      <button id="pwGen">生成</button>
      <div id="pwOut" style="margin-top:8px;"></div>
    </div>
  `;
  el.querySelector('#pwGen').onclick = ()=>{
    const len = parseInt(el.querySelector('#pwLen').value) || 12;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
    let s = '';
    for(let i=0;i<len;i++) s += chars.charAt(Math.floor(Math.random()*chars.length));
    el.querySelector('#pwOut').textContent = s;
  };
  return el;
}
