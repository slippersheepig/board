import { getSyncedNow } from '../timeSync.js';

export async function init() {
  const el = document.createElement('div');
  el.className = 'cal-widget';

  let viewYear = 0;
  let viewMonth = 0;

  function renderCalendar(date = getSyncedNow()) {
    const today = getSyncedNow();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth();
    const currentDate = today.getDate();

    viewYear = date.getFullYear();
    viewMonth = date.getMonth();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    let html = `
      <div class="cal-header">
        <button type="button" id="prev" class="cal-btn" aria-label="上一月">&lt;</button>
        <div><strong>${viewYear} 年 ${viewMonth + 1} 月</strong></div>
        <button type="button" id="next" class="cal-btn" aria-label="下一月">&gt;</button>
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
        if ((r === 0 && c < firstDay) || day > totalDays) {
          html += '<td></td>';
        } else {
          const isToday = viewYear === currentYear && viewMonth === currentMonth && day === currentDate;
          const cls = isToday ? ' class="cal-today"' : '';
          html += `<td${cls}>${day}</td>`;
          day++;
        }
      }
      html += '</tr>';
    }

    html += '</tbody></table>';
    el.innerHTML = html;

    el.querySelector('#prev').addEventListener('click', () => renderCalendar(new Date(viewYear, viewMonth - 1, 1)));
    el.querySelector('#next').addEventListener('click', () => renderCalendar(new Date(viewYear, viewMonth + 1, 1)));
  }

  el.onToolShow = () => {
    renderCalendar(new Date(viewYear, viewMonth, 1));
  };

  renderCalendar();
  return el;
}
