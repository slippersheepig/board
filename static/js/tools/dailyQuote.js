export async function init(){
  const el = document.createElement('div');
  el.className = 'quote-widget';
  el.innerHTML = `
    <div class="quote-title">每日名言</div>
    <div id="quoteText" class="quote-text">加载中...</div>
    <div id="quoteMeta" class="quote-meta"></div>
    <details id="quoteDebug" class="quote-debug" hidden>
      <summary>查看异常详情</summary>
      <pre id="quoteDebugContent"></pre>
    </details>
    <button id="quoteRefresh" class="quote-refresh">手动刷新</button>
  `;

  const textEl = el.querySelector('#quoteText');
  const metaEl = el.querySelector('#quoteMeta');
  const debugEl = el.querySelector('#quoteDebug');
  const debugContentEl = el.querySelector('#quoteDebugContent');

  function renderDebug(debug){
    if(!debug || Object.keys(debug).length === 0){
      debugEl.hidden = true;
      debugContentEl.textContent = '';
      return;
    }
    debugEl.hidden = false;
    debugContentEl.textContent = JSON.stringify(debug, null, 2);
  }

  async function loadQuote(){
    textEl.textContent = '加载中...';
    metaEl.textContent = '';
    renderDebug(null);
    const controller = new AbortController();
    const timer = setTimeout(()=> controller.abort(), 5000);
    try {
      const resp = await fetch('/api/daily-quote', {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
      });
      const data = await resp.json().catch(()=> ({}));
      if(!resp.ok){
        const error = new Error(`http-${resp.status}`);
        error.payload = data;
        throw error;
      }
      textEl.textContent = data.quote || '你瞅啥';
      if(data.isFallback){
        const reason = data.debug?.error ? `，原因：${data.debug.error}` : '';
        metaEl.textContent = data.date ? `日期：${data.date}（已启用兜底文案${reason}）` : `已启用兜底文案${reason}`;
        renderDebug(data.debug);
      }else{
        metaEl.textContent = data.date ? `日期：${data.date}` : '';
        renderDebug(null);
      }
    } catch (err) {
      textEl.textContent = '你瞅啥';
      metaEl.textContent = '请求失败，已启用兜底文案';
      renderDebug({
        error: err?.message || 'request_failed',
        payload: err?.payload || null,
      });
    } finally {
      clearTimeout(timer);
    }
  }

  el.querySelector('#quoteRefresh').addEventListener('click', loadQuote);
  await loadQuote();
  return el;
}
