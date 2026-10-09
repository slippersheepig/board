export async function init() {
  const el = document.createElement('div');
  el.className = 'sw-widget';
  el.innerHTML = `
    <div id="swDisplay" class="sw-display">00:00.000</div>
    <div class="sw-btns">
      <button id="swStart">开始</button>
      <button id="swStop">暂停</button>
      <button id="swReset">重置</button>
    </div>
    <div id="swLaps" class="sw-laps" style="display:none;"></div>
  `;

  let running = false;
  let startT = 0;
  let elapsed = 0;
  let raf = 0;
  let lapCount = 0;

  const disp = el.querySelector('#swDisplay');
  const startBtn = el.querySelector('#swStart');
  const stopBtn = el.querySelector('#swStop');
  const resetBtn = el.querySelector('#swReset');
  const laps = el.querySelector('#swLaps');

  function fmt(ms) {
    const mm = Math.floor(ms / 60000).toString().padStart(2, '0');
    const ss = Math.floor((ms / 1000) % 60).toString().padStart(2, '0');
    const msPart = Math.floor(ms % 1000).toString().padStart(3, '0');
    return `${mm}:${ss}.${msPart}`;
  }

  function tick() {
    const now = performance.now();
    const total = elapsed + (now - startT);
    disp.textContent = fmt(total);
    raf = requestAnimationFrame(tick);
  }

  startBtn.onclick = () => {
    if (!running) {
      running = true;
      startT = performance.now();
      raf = requestAnimationFrame(tick);
      startBtn.textContent = '计次';
    } else {
      const now = performance.now();
      const total = elapsed + (now - startT);
      lapCount++;
      laps.style.display = 'block';
      const item = document.createElement('div');
      item.className = 'sw-lap-item';
      item.innerHTML = `<span>#${lapCount}</span><span>${fmt(total)}</span>`;
      laps.prepend(item);
    }
  };

  stopBtn.onclick = () => {
    if (running) {
      running = false;
      cancelAnimationFrame(raf);
      elapsed += performance.now() - startT;
      startBtn.textContent = '继续';
    }
  };

  resetBtn.onclick = () => {
    running = false;
    cancelAnimationFrame(raf);
    elapsed = 0;
    lapCount = 0;
    disp.textContent = '00:00.000';
    laps.innerHTML = '';
    laps.style.display = 'none';
    startBtn.textContent = '开始';
  };

  el.onToolHide = () => {
    if (running) {
      cancelAnimationFrame(raf);
    }
  };

  el.onToolShow = () => {
    if (running) {
      raf = requestAnimationFrame(tick);
    }
  };

  return el;
}
