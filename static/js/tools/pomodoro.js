export async function init() {
  const el = document.createElement('div');
  el.className = 'pom-widget';
  el.innerHTML = `
    <div id="pomDisplay" class="pom-display">25:00</div>
    <div class="pom-btns">
      <button id="pomStart">开始</button>
      <button id="pomStop">暂停</button>
      <button id="pomReset">重置</button>
    </div>
  `;

  let timer = null;
  const DEFAULT_SECONDS = 25 * 60;
  let remaining = DEFAULT_SECONDS;

  const displayEl = el.querySelector('#pomDisplay');
  const startBtn = el.querySelector('#pomStart');
  const stopBtn = el.querySelector('#pomStop');
  const resetBtn = el.querySelector('#pomReset');

  function formatT(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function tick() {
    remaining--;
    displayEl.textContent = formatT(remaining);
    if (remaining <= 0) {
      clearInterval(timer);
      timer = null;
      displayEl.textContent = '完成！';
    }
  }

  startBtn.onclick = () => {
    if (timer) return;
    if (remaining <= 0) remaining = DEFAULT_SECONDS;
    displayEl.textContent = formatT(remaining);
    timer = setInterval(tick, 1000);
  };

  stopBtn.onclick = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  resetBtn.onclick = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    remaining = DEFAULT_SECONDS;
    displayEl.textContent = formatT(remaining);
  };

  return el;
}
