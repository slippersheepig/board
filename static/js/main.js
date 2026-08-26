// main.js — 应用编排层：加载背景（优先 3D，降级 2D）+ 保留原有小工具逻辑
// 原文件中的背景渲染逻辑已拆分到 background2d.js（2D 兜底）与
// background3d.js（Three.js 3D）。此处负责按设备能力选择，并保持工具功能不变。

const bgCanvas = document.getElementById('bgCanvas');

// ================= 能力与资源判断 =================
function canUseWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch (e) {
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

// 若用户在 URL 加 #bg2d 可强制用 2D（调试用）
const force2D = /[#?]bg2d/.test(location.hash) || /[#?]bg2d/.test(location.search);
const want3D = !force2D && canUseWebGL() && !isLowPerformance();

// 尝试多种来源加载 Three.js（本地优先，CDN 兜底）
const THREE_SOURCES = [
  '/static/js/vendor/three.module.js',
  'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js',
  'https://unpkg.com/three@0.160.0/build/three.module.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/0.160.0/three.module.min.js'
];

async function loadThree() {
  if (!want3D) return null;
  let lastErr = null;
  for (const src of THREE_SOURCES) {
    try {
      return await import(/* @vite-ignore */ src);
    } catch (err) {
      lastErr = err;
      console.warn('[bg] 3D 加载失败: ' + src, err && err.message);
    }
  }
  console.warn('[bg] Three.js 全部不可用，回退 2D 背景', lastErr);
  return null;
}

async function initBackground() {
  // 若页面已被卸载或已初始化过，安全退出
  if (!bgCanvas || bgCanvas.dataset.bgReady) return;
  bgCanvas.dataset.bgReady = '1';

  const THREE = await loadThree();
  if (THREE) {
    try {
      const mod = await import('./background3d.js');
      const stop = mod.init(THREE, bgCanvas);
      if (stop) {
        console.log('[bg] 已启用 3D 背景');
        return;
      }
      console.warn('[bg] 3D 初始化失败，回退 2D');
    } catch (err) {
      console.warn('[bg] 3D 初始化异常，回退 2D', err);
    }
  }
  const mod = await import('./background2d.js');
  mod.init(bgCanvas);
  console.log('[bg] 已启用 2D 背景');
}

// 稍后启动，避免与首屏 JS 解析抢资源（对低配移动端更友好）
if (document.readyState === 'complete') {
  initBackground();
} else {
  window.addEventListener('load', () => {
    // 用微任务让资源更晚占用
    setTimeout(initBackground, 30);
  }, { once: true });
}

// ================= 滚轮滚动兑底 =================
// 背景：html/body 双重 overflow-x:hidden 曾导致「滚动条可见但滚轮无效」。
// CSS 已修正；此处再加一层兑底：若默认滚动仍被环境吞掉，直接手动驱动文档滚动。
(function setupWheelFallback() {
  // 判断事件起点是否在嵌套滚动区内（如名言工具的 <pre>），是则交给原生处理
  function findScrollable(el) {
    for (let n = el; n && n !== document.body; n = n.parentElement) {
      const cs = getComputedStyle(n);
      if (/(auto|scroll)/.test(cs.overflowY) && n.scrollHeight > n.clientHeight + 1) return n;
    }
    return null;
  }

  window.addEventListener('wheel', (e) => {
    if (e.ctrlKey) return;                 // 保留 Ctrl+滚轮 页面缩放
    if (e.defaultPrevented) return;        // 已有其他逻辑接管
    if (findScrollable(e.target)) return;  // 嵌套滚动区交给原生
    const doc = document.scrollingElement || document.documentElement;
    if (!doc || doc.scrollHeight <= window.innerHeight) return; // 页面不可滚

    e.preventDefault();
    let dy = e.deltaY, dx = e.deltaX;
    if (e.deltaMode === 1) { dy *= 33; dx *= 33; }             // 行模式 → 像素
    else if (e.deltaMode === 2) { dy *= window.innerHeight; dx *= window.innerWidth; } // 页模式
    doc.scrollTop += dy;
    doc.scrollLeft += dx;
  }, { passive: false });
})();

// ================= 原有小工具逻辑（未改动） =================
const toolArea = document.getElementById('toolArea');
const buttons = document.querySelectorAll('#toolButtons button');
const loaded = new Map();
let activeToolName = null;

function showHint(msg) {
  if (toolArea) toolArea.innerHTML = `<div class="hint">${msg}</div>`;
}
showHint('点击上方按钮加载对应小工具');

function invokeLifecycle(name, hookName) {
  const entry = loaded.get(name);
  if (entry && typeof entry[hookName] === 'function') {
    entry[hookName]();
  }
}

async function loadTool(name) {
  if (!toolArea) return;

  if (activeToolName && activeToolName !== name) {
    invokeLifecycle(activeToolName, 'onHide');
  }

  if (loaded.has(name)) {
    toolArea.innerHTML = '';
    toolArea.appendChild(loaded.get(name).wrapper);
    invokeLifecycle(name, 'onShow');
    activeToolName = name;
    return;
  }

  showHint('模块加载中…');
  try {
    const module = await import(`./tools/${name}.js`);
    const el = await module.init();
    const wrapper = document.createElement('div');
    wrapper.style.display = 'flex';
    wrapper.style.flexDirection = 'column';
    wrapper.style.alignItems = 'center';
    wrapper.style.justifyContent = 'center';
    wrapper.style.width = '100%';
    wrapper.appendChild(el);
    loaded.set(name, {
      wrapper,
      onShow: typeof el.onToolShow === 'function' ? () => el.onToolShow() : null,
      onHide: typeof el.onToolHide === 'function' ? () => el.onToolHide() : null,
    });
    toolArea.innerHTML = '';
    toolArea.appendChild(wrapper);
    invokeLifecycle(name, 'onShow');
    activeToolName = name;
  } catch (err) {
    console.error(err);
    showHint('加载失败：' + (err.message || err));
  }
}

buttons.forEach((b) => {
  b.addEventListener('click', () => loadTool(b.dataset.tool));
});
