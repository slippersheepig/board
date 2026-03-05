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
    const controller = new AbortController();
    const timer = setTimeout(()=> controller.abort(), 5000);
    try {
      const resp = await fetch('/api/daily-quote', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      if(!resp.ok) throw new Error(`http-${resp.status}`);
      const data = await resp.json();
      textEl.textContent = data.quote || '你瞅啥';
      if(data.isFallback){
        const reason = data.error ? `，原因：${data.error}` : '';
        metaEl.textContent = data.date ? `日期：${data.date}（已启用兜底文案${reason}）` : `已启用兜底文案${reason}`;
      }else{
        metaEl.textContent = data.date ? `日期：${data.date}` : '';
      }
    } catch {
      textEl.textContent = '你瞅啥';
      metaEl.textContent = '已启用兜底文案';
    } finally {
      clearTimeout(timer);
    }
  }

  el.querySelector('#quoteRefresh').addEventListener('click', loadQuote);
  await loadQuote();
  return el;
}
