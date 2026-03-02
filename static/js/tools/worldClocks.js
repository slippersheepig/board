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
  let timerId = null;

  function render(){
    list.innerHTML = '';
    const now = new Date();
    zones.forEach(z=>{
      const dstr = now.toLocaleString('zh-Hans-CN', { timeZone: z.id });
      const row = document.createElement('div');
      row.style.marginBottom='6px';
      row.textContent = `${z.label}: ${dstr}`;
      list.appendChild(row);
    });
  }

  function start(){
    if (timerId) return;
    render();
    timerId = setInterval(render, 1000);
  }

  function stop(){
    if(!timerId) return;
    clearInterval(timerId);
    timerId = null;
  }

  el.onToolShow = start;
  el.onToolHide = stop;

  // 首次加载立即显示
  start();
  return el;
}
