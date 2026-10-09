export async function init() {
  const el = document.createElement('div');
  el.className = 'pw-widget';
  el.innerHTML = `
    <div class="pw-controls">
      <label>长度 <input id="pwLen" class="pw-len-input" type="number" value="12" min="4" max="64" /></label>
      <button id="pwGen">生成</button>
    </div>
    <div id="pwOut" class="pw-out" title="点击复制密码">点击「生成」获取密码</div>
  `;

  const lenInput = el.querySelector('#pwLen');
  const genBtn = el.querySelector('#pwGen');
  const outDiv = el.querySelector('#pwOut');

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=';

  function generate() {
    const rawLen = parseInt(lenInput.value, 10);
    const len = Math.max(4, Math.min(64, Number.isFinite(rawLen) ? rawLen : 12));
    lenInput.value = len;

    let pwd = '';
    for (let i = 0; i < len; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    outDiv.textContent = pwd;
  }

  genBtn.onclick = generate;

  outDiv.onclick = async () => {
    const text = outDiv.textContent;
    if (!text || text.includes('点击')) return;
    try {
      await navigator.clipboard.writeText(text);
      const prev = outDiv.textContent;
      outDiv.textContent = '已复制到剪贴板！';
      setTimeout(() => {
        if (outDiv.textContent === '已复制到剪贴板！') {
          outDiv.textContent = prev;
        }
      }, 1200);
    } catch {
      // 剪贴板权限不可用时静默降级（用户仍可直接全选文本）
    }
  };

  generate(); // 初始生成一个密码，避免留白
  return el;
}
