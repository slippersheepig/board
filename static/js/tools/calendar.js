export async function init() {
  const el = document.createElement('div');
  el.className = 'cal-widget';
  el.innerHTML = '<div id="calWrap"></div>';
  const wrap = el.querySelector('#calWrap');

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDate = today.getDate();

  function renderCalendar(date = new Date()) {
    const y = date.getFullYear();
    const m = date.getMonth();
    const firstDay = new Date(y, m, 1).getDay();
    const totalDays = new Date(y, m + 1, 0).getDate();

    let html = `
      <div class="cal-header">
        <button id="prev" class="cal-btn" aria-label="上一月">&lt;</button>
        <div><strong>${y} 年 ${m + 1} 月</strong></div>
        <button id="next" class="cal-btn" aria-label="下一月">&gt;</button>
      </div>
      <table class="cal-table">
        <thead>
          <tr><th>日</th><th>一</th><th>二</th><th>三</th><th>四</th><th>五</th><th>六</th></tr>
        </thead>
        <tbody>
    `;

    let day = 1;
    for (let r = 0; r < 6; r++) {
      if (day > totalDays) break;
      html += '<tr>';
      for (let c = 0; c < 7; c++) {
        if (r === 0 && c < firstDay) {
          html += '<td></td>';
        } else if (day > totalDays) {
          html += '<td></td>';
        } else {
          const isToday = (y === currentYear && m === currentMonth && day === currentDate);
          const cls = isToday ? ' class="cal-today"' : '';
          html += `<td${cls}>${day}</td>`;
          day++;
        }
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    wrap.innerHTML = html;

    wrap.querySelector('#prev').onclick = () => renderCalendar(new Date(y, m - 1, 1));
    wrap.querySelector('#next').onclick = () => renderCalendar(new Date(y, m + 1, 1));
  }

  renderCalendar();
  return el;
}
