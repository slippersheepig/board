// 应用编排层：按设备能力初始化背景（优先 Three.js 3D，降级 Canvas 2D）并管理工具栏模块加载

const bgCanvas = document.getElementById('bgCanvas');

// ================= 能力与资源判断 =================
function canUseWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}

function isLowPerformance() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const cores = navigator.hardwareConcurrency;
  if (typeof cores === 'number' && cores <= 4) return true;
  const mem = navigator.deviceMemory;
  if (typeof mem === 'number' && mem <= 2) return true;
  return false;
}

// URL 包含 #bg2d 或 ?bg2d 时强制使用 2D 背景（便于调试或降级）
const force2D = /[?&#]bg2d\b/.test(location.hash) || /[?&#]bg2d\b/.test(location.search);
const want3D = !force2D && canUseWebGL() && !isLowPerformance();

const THREE_SOURCES = [
  'https://cdn.jsdelivr.net/npm/three/build/three.module.js',
  'https://fastly.jsdelivr.net/npm/three/build/three.module.js',
  'https://unpkg.com/three/build/three.module.js',
];

async function loadThree() {
  if (!want3D) return null;
  let lastErr = null;
  for (const src of THREE_SOURCES) {
    try {
      return await import(/* @vite-ignore */ src);
    } catch (err) {
      lastErr = err;
      console.warn(`[bg] 3D 加载失败: ${src}`, err && err.message);
    }
  }
  console.warn('[bg] Three.js 全部不可用，回退 2D 背景', lastErr);
  return null;
}

async function initBackground() {
  if (!bgCanvas || bgCanvas.dataset.bgReady) return;
  bgCanvas.dataset.bgReady = '1';

  const THREE = await loadThree();
  if (THREE) {
    try {
      const mod = await import('./background3d.js');
      const stop = mod.init(THREE, bgCanvas);
      if (stop) return;
      console.warn('[bg] 3D 初始化失败，回退 2D');
    } catch (err) {
      console.warn('[bg] 3D 初始化异常，回退 2D', err);
    }
  }
  const mod = await import('./background2d.js');
  mod.init(bgCanvas);
}

// 延后启动，避免与首屏脚本解析争抢主线程
if (document.readyState === 'complete') {
  initBackground();
} else {
  window.addEventListener('load', () => {
    setTimeout(initBackground, 30);
  }, { once: true });
}

// ================= 小工具按需加载与生命周期管理 =================
const toolArea = document.getElementById('toolArea');
const buttons = document.querySelectorAll('#toolButtons button');
const loaded = new Map();
const loadingPromises = new Map();
let activeToolName = null;
let loadRequestId = 0;

function showHint(msg) {
  if (!toolArea) return;
  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = msg;
  toolArea.replaceChildren(hint);
}

function invokeLifecycle(name, hookName) {
  const entry = loaded.get(name);
  if (entry && typeof entry[hookName] === 'function') {
    entry[hookName]();
  }
}

function updateActiveButton(name) {
  buttons.forEach((b) => {
    const isActive = b.dataset.tool === name;
    b.classList.toggle('active', isActive);
    b.setAttribute('aria-pressed', String(isActive));
  });
}

function getOrCreateTool(name) {
  if (loaded.has(name)) {
    return Promise.resolve(loaded.get(name));
  }
  if (loadingPromises.has(name)) {
    return loadingPromises.get(name);
  }

  const promise = (async () => {
    const module = await import(`./tools/${name}.js`);
    const el = await module.init();
    const wrapper = document.createElement('div');
    wrapper.className = 'tool-wrapper';
    wrapper.appendChild(el);
    const entry = {
      wrapper,
      onShow: typeof el.onToolShow === 'function' ? () => el.onToolShow() : null,
      onHide: typeof el.onToolHide === 'function' ? () => el.onToolHide() : null,
    };
    loaded.set(name, entry);
    return entry;
  })();

  loadingPromises.set(name, promise);
  promise.finally(() => {
    loadingPromises.delete(name);
  });
  return promise;
}

async function loadTool(name) {
  if (!toolArea || !name) return;
  if (activeToolName === name && loaded.has(name)) return;

  const requestId = ++loadRequestId;

  if (activeToolName && activeToolName !== name) {
    invokeLifecycle(activeToolName, 'onHide');
    activeToolName = null;
  }

  updateActiveButton(name);

  if (loaded.has(name)) {
    const entry = loaded.get(name);
    toolArea.replaceChildren(entry.wrapper);
    activeToolName = name;
    invokeLifecycle(name, 'onShow');
    return;
  }

  showHint('模块加载中…');
  try {
    const entry = await getOrCreateTool(name);
    if (requestId !== loadRequestId) {
      // 用户在加载期间已切换到其他工具，挂起后台模块以防定时器空跑
      if (typeof entry.onHide === 'function') {
        entry.onHide();
      }
      return;
    }
    toolArea.replaceChildren(entry.wrapper);
    activeToolName = name;
    invokeLifecycle(name, 'onShow');
  } catch (err) {
    console.error(err);
    if (requestId === loadRequestId) {
      showHint(`加载失败：${err?.message || err}`);
    }
  }
}

buttons.forEach((b) => {
  b.addEventListener('click', () => loadTool(b.dataset.tool));
});
