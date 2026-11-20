export async function init() {
  const el = document.createElement('div');
  el.className = 'pw-widget';
  el.innerHTML = `
    <div class="pw-controls">
      <label>长度 <input id="pwLen" class="pw-len-input" type="number" value="12" min="4" max="64" /></label>
      <button type="button" id="pwGen">生成</button>
    </div>
    <div id="pwOut" class="pw-out" role="button" tabindex="0" title="点击复制密码">点击「生成」获取密码</div>
  `;

  const lenInput = el.querySelector('#pwLen');
  const genBtn = el.querySelector('#pwGen');
  const outDiv = el.querySelector('#pwOut');

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';
  const randBuf = new Uint32Array(1);
  let currentPassword = '';
  let feedbackTimer = null;

  // 密码必须用加密安全随机源；配合拒绝采样消除取模偏差，保证每个字符等概率
  function randIndex(max) {
    const limit = Math.floor(0x100000000 / max) * max;
    let value;
    do {
      crypto.getRandomValues(randBuf);
      value = randBuf[0];
    } while (value >= limit);
    return value % max;
  }

  function generate() {
    if (feedbackTimer) {
      clearTimeout(feedbackTimer);
      feedbackTimer = null;
    }
    const rawLen = parseInt(lenInput.value, 10);
    const len = Math.max(4, Math.min(64, Number.isFinite(rawLen) ? rawLen : 12));
    lenInput.value = len;

    let pwd = '';
    for (let i = 0; i < len; i++) {
      pwd += chars.charAt(randIndex(chars.length));
    }
    currentPassword = pwd;
    outDiv.textContent = currentPassword;
  }

  async function copyPassword() {
    if (!currentPassword) return;
    try {
      await navigator.clipboard.writeText(currentPassword);
      if (feedbackTimer) clearTimeout(feedbackTimer);
      outDiv.textContent = '已复制到剪贴板！';
      feedbackTimer = setTimeout(() => {
        outDiv.textContent = currentPassword;
        feedbackTimer = null;
      }, 1200);
    } catch {
      // 剪贴板权限不可用时静默降级（用户仍可直接全选文本）
    }
  }

  genBtn.addEventListener('click', generate);
  lenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generate();
  });
  outDiv.addEventListener('click', copyPassword);
  outDiv.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      copyPassword();
    }
  });

  generate();
  return el;
}
