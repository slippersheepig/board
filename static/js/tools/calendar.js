export async function init(){
  const el = document.createElement('div');
  el.innerHTML = `<div id="calWrap"></div>`;
  const wrap = el.querySelector('#calWrap');

  function renderCalendar(date = new Date()){
    const y = date.getFullYear();
    const m = date.getMonth();
    const firstDay = new Date(y,m,1).getDay();
    const days = new Date(y,m+1,0).getDate();
    let html = `<div style="display:flex;justify-content:space-between;align-items:center"><button id="prev">&lt;</button><div><strong>${y} - ${m+1}</strong></div><button id="next">&gt;</button></div>`;
    html += '<table style="width:100%;margin-top:8px;border-collapse:collapse;"><thead><tr><th>日</th><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th>六</th></tr></thead><tbody>';
    let day = 1;
    for(let r=0;r<6;r++){
      html += '<tr>';
      for(let c=0;c<7;c++){
        if(r===0 && c<firstDay){ html += '<td></td>'; continue; }
        if(day>days){ html += '<td></td>'; continue; }
        html += `<td style="padding:6px;border:1px solid rgba(255,255,255,0.04)">${day}</td>`;
        day++;
      }
      html += '</tr>';
    }
    html += '</tbody></table>';
    wrap.innerHTML = html;
    wrap.querySelector('#prev').onclick = ()=> renderCalendar(new Date(y, m-1, 1));
    wrap.querySelector('#next').onclick = ()=> renderCalendar(new Date(y, m+1, 1));
  }
  renderCalendar();
  return el;
}
