import { getSyncedNow, loadTimeOffset } from '../timeSync.js';

export async function init() {
  const el = document.createElement('div');
  el.className = 'wc-widget';

  const zones = [
    { id: 'UTC', label: 'UTC' },
    { id: 'Asia/Shanghai', label: '北京' },
    { id: 'Asia/Tokyo', label: '东京' },
    { id: 'Europe/London', label: '伦敦' },
    { id: 'America/New_York', label: '纽约' },
  ];

  // 预创建固定 DOM 与 DateTimeFormat 实例，避免每秒重复重建
  const rowElements = zones.map((z) => {
    const row = document.createElement('div');
    row.className = 'wc-row';

    const lbl = document.createElement('span');
    lbl.className = 'wc-label';
    lbl.textContent = z.label;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'wc-time';

    row.append(lbl, timeSpan);
    el.appendChild(row);

    const formatter = new Intl.DateTimeFormat('zh-Hans-CN', {
      timeZone: z.id,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    return { formatter, timeSpan };
  });

  let timerId = null;

  function render() {
    const now = getSyncedNow();
    rowElements.forEach(({ formatter, timeSpan }) => {
      timeSpan.textContent = formatter.format(now);
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

  start();
  loadTimeOffset().then(() => {
    if (timerId) render();
  });
  return el;
}
