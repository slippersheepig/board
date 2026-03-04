export async function init(){
  const el = document.createElement('div');
  el.className = 'quote-widget';
  el.innerHTML = `
    <div class="quote-title">每日名言</div>
    <div id="quoteText" class="quote-text">加载中...</div>
    <div id="quoteMeta" class="quote-meta"></div>
    <button id="quoteRefresh" class="quote-refresh">手动刷新</button>
  `;

  const textEl = el.querySelector('#quoteText');
  const metaEl = el.querySelector('#quoteMeta');

  async function loadQuote(){
    textEl.textContent = '加载中...';
    metaEl.textContent = '';
    try {
      const resp = await fetch('/api/daily-quote', { method: 'GET' });
      if(!resp.ok) throw new Error(`http-${resp.status}`);
      const data = await resp.json();
      textEl.textContent = data.quote || '你瞅啥';
      metaEl.textContent = data.date ? `日期：${data.date}` : '';
    } catch {
      textEl.textContent = '你瞅啥';
      metaEl.textContent = '已启用兜底文案';
    }
  }

  el.querySelector('#quoteRefresh').addEventListener('click', loadQuote);
  await loadQuote();
  return el;
}
