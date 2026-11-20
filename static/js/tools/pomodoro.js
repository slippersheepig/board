export async function init() {
  const el = document.createElement('div');
  el.className = 'pom-widget';
  el.innerHTML = `
    <div id="pomDisplay" class="pom-display">25:00</div>
    <div class="pom-btns">
      <button type="button" id="pomStart">开始</button>
      <button type="button" id="pomStop">暂停</button>
      <button type="button" id="pomReset">重置</button>
    </div>
  `;

  const DEFAULT_SECONDS = 25 * 60;
  let remainingMs = DEFAULT_SECONDS * 1000; // 暂停时保存的剩余毫秒
  let deadline = 0;                         // 计时中对应的到期时间戳；0 表示未在计时
  let timer = null;

  const displayEl = el.querySelector('#pomDisplay');
  const startBtn = el.querySelector('#pomStart');
  const stopBtn = el.querySelector('#pomStop');
  const resetBtn = el.querySelector('#pomReset');

  function formatT(totalSec) {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // 基于到期时间戳而非每秒自减：后台标签页 setInterval 被限流时也不会走慢
  function render() {
    if (deadline) {
      const leftMs = deadline - Date.now();
      if (leftMs <= 0) {
        clearInterval(timer);
        timer = null;
        deadline = 0;
        remainingMs = 0;
        startBtn.textContent = '开始';
        displayEl.textContent = '完成！';
        return;
      }
      remainingMs = leftMs;
    } else if (remainingMs <= 0) {
      displayEl.textContent = '完成！';
      return;
    }
    displayEl.textContent = formatT(Math.ceil(remainingMs / 1000));
  }

  startBtn.addEventListener('click', () => {
    if (timer) return;
    if (remainingMs <= 0) remainingMs = DEFAULT_SECONDS * 1000;
    deadline = Date.now() + remainingMs;
    startBtn.textContent = '开始';
    timer = setInterval(render, 250);
    render();
  });

  stopBtn.addEventListener('click', () => {
    if (!timer) return;
    clearInterval(timer);
    timer = null;
    render(); // 先结算暂停时刻的剩余时间
    deadline = 0;
    if (remainingMs > 0) startBtn.textContent = '继续';
  });

  resetBtn.addEventListener('click', () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    deadline = 0;
    remainingMs = DEFAULT_SECONDS * 1000;
    startBtn.textContent = '开始';
    displayEl.textContent = formatT(DEFAULT_SECONDS);
  });

  // 工具隐藏时停止轮询（墙钟时间仍在流逝），显示时恢复
  el.onToolHide = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  el.onToolShow = () => {
    if (deadline && !timer) {
      timer = setInterval(render, 250);
    }
    render();
  };

  return el;
}
