export async function init() {
  const el = document.createElement('div');
  el.className = 'sw-widget';
  el.innerHTML = `
    <div id="swDisplay" class="sw-display">00:00.000</div>
    <div class="sw-btns">
      <button type="button" id="swStart">开始</button>
      <button type="button" id="swStop">暂停</button>
      <button type="button" id="swReset">重置</button>
    </div>
    <div id="swLaps" class="sw-laps" hidden></div>
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

  function stopLoop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function tick() {
    if (!running) {
      raf = 0;
      return;
    }
    const total = elapsed + (performance.now() - startT);
    disp.textContent = fmt(total);
    raf = requestAnimationFrame(tick);
  }

  startBtn.addEventListener('click', () => {
    if (!running) {
      running = true;
      startT = performance.now();
      stopLoop();
      raf = requestAnimationFrame(tick);
      startBtn.textContent = '计次';
    } else {
      const total = elapsed + (performance.now() - startT);
      lapCount++;
      laps.hidden = false;
      const item = document.createElement('div');
      item.className = 'sw-lap-item';
      const idxSpan = document.createElement('span');
      idxSpan.textContent = `#${lapCount}`;
      const timeSpan = document.createElement('span');
      timeSpan.textContent = fmt(total);
      item.append(idxSpan, timeSpan);
      laps.prepend(item);
    }
  });

  stopBtn.addEventListener('click', () => {
    if (!running) return;
    running = false;
    stopLoop();
    elapsed += performance.now() - startT;
    disp.textContent = fmt(elapsed);
    startBtn.textContent = '继续';
  });

  resetBtn.addEventListener('click', () => {
    running = false;
    stopLoop();
    elapsed = 0;
    lapCount = 0;
    disp.textContent = '00:00.000';
    laps.replaceChildren();
    laps.hidden = true;
    startBtn.textContent = '开始';
  });

  el.onToolHide = stopLoop;

  el.onToolShow = () => {
    if (running) {
      stopLoop();
      raf = requestAnimationFrame(tick);
    }
  };

  return el;
}
