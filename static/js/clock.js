import { getSyncedNow, loadTimeOffset } from './timeSync.js';

document.addEventListener('DOMContentLoaded', () => {
  const svgNS = 'http://www.w3.org/2000/svg';
  const marksGroup = document.getElementById('marks');
  const hourHand = document.getElementById('hourHand');
  const minuteHand = document.getElementById('minuteHand');
  const secondHand = document.getElementById('secondHand');
  const pendulumGroup = document.getElementById('pendulumGroup');
  const dateText = document.getElementById('dateText');

  if (!hourHand || !minuteHand || !secondHand || !pendulumGroup) return;

  // 罗马数字（从 12 点起顺时针）
  const ROMAN = ['XII', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TARGET_FPS = reducedMotion ? 30 : 60;
  const FRAME_MIN = 1000 / TARGET_FPS;
  const PENDULUM_AMP = reducedMotion ? 4 : 10;

  function ensureMarks() {
    if (!marksGroup || marksGroup.childElementCount > 0) return;
    const radius = 140;

    for (let i = 0; i < 60; i++) {
      const line = document.createElementNS(svgNS, 'line');
      const ang = (i * Math.PI) / 30;
      const isHour = i % 5 === 0;
      const inner = isHour ? radius * 0.78 : radius * 0.86;
      const outer = radius * 0.95;
      line.setAttribute('x1', String(Math.cos(ang) * inner));
      line.setAttribute('y1', String(Math.sin(ang) * inner));
      line.setAttribute('x2', String(Math.cos(ang) * outer));
      line.setAttribute('y2', String(Math.sin(ang) * outer));
      line.setAttribute('stroke', isHour ? '#cfeeff' : 'rgba(255,255,255,0.12)');
      line.setAttribute('stroke-width', isHour ? '2' : '1');
      marksGroup.appendChild(line);
    }

    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI * 2 - Math.PI / 2;
      const tx = Math.cos(ang) * radius * 0.62;
      const ty = Math.sin(ang) * radius * 0.62 + 6;
      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', String(tx));
      t.setAttribute('y', String(ty));
      t.setAttribute('text-anchor', 'middle');
      t.setAttribute('font-family', "Georgia, 'Times New Roman', serif");
      t.setAttribute('font-size', '18');
      t.setAttribute('fill', '#ffdca7');
      t.setAttribute('font-weight', '700');
      t.setAttribute('style', 'filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));');
      t.textContent = ROMAN[i];
      marksGroup.appendChild(t);
    }
  }

  function updateSVGClock() {
    const now = getSyncedNow();
    const s = now.getSeconds() + now.getMilliseconds() / 1000;
    const m = now.getMinutes() + s / 60;
    const h = (now.getHours() % 12) + m / 60;

    hourHand.setAttribute('transform', `rotate(${(h / 12) * 360})`);
    minuteHand.setAttribute('transform', `rotate(${(m / 60) * 360})`);
    secondHand.setAttribute('transform', `rotate(${(s / 60) * 360})`);

    const angle = Math.sin(performance.now() / 700) * PENDULUM_AMP;
    pendulumGroup.setAttribute('transform', `translate(0,34) rotate(${angle})`);

    // 仅在日期变化时写入 DOM，避免每帧重复触发布局
    const dateStr = now.toLocaleDateString();
    if (dateText && dateText.textContent !== dateStr) {
      dateText.textContent = dateStr;
    }
  }

  let last = 0;
  let active = document.visibilityState === 'visible';
  let rafId = 0;

  function loop(ts) {
    if (!active) {
      rafId = 0;
      return;
    }
    if (!last || ts - last >= FRAME_MIN) {
      updateSVGClock();
      last = ts;
    }
    rafId = requestAnimationFrame(loop);
  }

  document.addEventListener('visibilitychange', () => {
    active = document.visibilityState === 'visible';
    if (active) {
      last = 0;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(loop);
    } else if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  });

  ensureMarks();
  // 先用本地时间立即渲染首帧，再后台校准 NTP 偏移，避免网络慢时指针僵死在 12 点
  updateSVGClock();
  loadTimeOffset().then(() => {
    if (active) updateSVGClock();
  });
  if (active) {
    rafId = requestAnimationFrame(loop);
  }
});
