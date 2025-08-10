export async function init(){
  const el = document.createElement('div');
  const zones = [
    {id:'UTC', label:'UTC'},
    {id:'Asia/Shanghai', label:'北京'},
    {id:'Asia/Tokyo', label:'东京'},
    {id:'Europe/London', label:'伦敦'},
    {id:'America/New_York', label:'纽约'}
  ];
  el.innerHTML = `<div id="wcList"></div>`;
  const list = el.querySelector('#wcList');
  function render(){
    list.innerHTML = '';
    zones.forEach(z=>{
      const dstr = new Date().toLocaleString('zh-Hans-CN', { timeZone: z.id });
      const row = document.createElement('div'); row.style.marginBottom='6px'; row.textContent = `${z.label}: ${dstr}`;
      list.appendChild(row);
    });
  }
  render();
  const id = setInterval(render,1000);
  return el;
}
