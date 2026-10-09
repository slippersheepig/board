import { getSyncedNow, loadTimeOffset } from '../timeSync.js';

export async function init() {
  const el = document.createElement('div');
  el.className = 'wc-widget';
  el.innerHTML = '<div id="wcList"></div>';
  const list = el.querySelector('#wcList');

  const zones = [
    { id: 'UTC', label: 'UTC' },
    { id: 'Asia/Shanghai', label: '北京' },
    { id: 'Asia/Tokyo', label: '东京' },
    { id: 'Europe/London', label: '伦敦' },
    { id: 'America/New_York', label: '纽约' },
  ];

  // 构建固定 DOM 节点，避免每秒 innerHTML 销毁与重建
  const rowElements = zones.map((z) => {
    const row = document.createElement('div');
    row.className = 'wc-row';

    const lbl = document.createElement('span');
    lbl.className = 'wc-label';
    lbl.textContent = z.label;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'wc-time';

    row.appendChild(lbl);
    row.appendChild(timeSpan);
    list.appendChild(row);

    return { id: z.id, timeSpan };
  });

  let timerId = null;

  function render() {
    const now = getSyncedNow();
    rowElements.forEach(({ id, timeSpan }) => {
      const dstr = now.toLocaleString('zh-Hans-CN', {
        timeZone: id,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      timeSpan.textContent = dstr;
    });
  }

  function start() {
    if (timerId) return;
    render();
    timerId = setInterval(render, 1000);
  }

  function stop() {
    if (!timerId) return;
    clearInterval(timerId);
    timerId = null;
  }

  el.onToolShow = start;
  el.onToolHide = stop;

  await loadTimeOffset();
  start();
  return el;
}
