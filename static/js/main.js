const bgCanvas = document.getElementById('bgCanvas');
let bgCtx = bgCanvas.getContext('2d', { alpha: false, desynchronized: true });

const MAX_DPR = 1.25;
function resizeBG(){
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
  bgCanvas.width = Math.floor(window.innerWidth * dpr);
  bgCanvas.height = Math.floor(window.innerHeight * dpr);
  bgCanvas.style.width = window.innerWidth + 'px';
  bgCanvas.style.height = window.innerHeight + 'px';
  bgCtx.setTransform(dpr,0,0,dpr,0,0);
  initOrbitBackground();
}
window.addEventListener('resize', resizeBG);

const STAR_DENSITY = 0.00018;
const STAR_MOVE_AMPLITUDE = 8;
const STAR_MOVE_SPEED = 0.00025;
const NEBULA_TIME_SCALE = 0.00004;
const ORBIT_SECONDS_PER_YEAR = 240;
const MOON_SECONDS_PER_MONTH = 28;
const LOW_POWER = matchMedia('(prefers-reduced-motion: reduce)').matches || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
const TARGET_FPS = LOW_POWER ? 24 : 30;
const FRAME_MIN = 1000 / TARGET_FPS;
const TWO_PI = Math.PI * 2;
const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

let stars = [];
let orbitCache = null;
function initStars(){
  stars = [];
  const area = window.innerWidth * window.innerHeight;
  const count = Math.min(520, Math.max(80, Math.floor(area * STAR_DENSITY)));
  for(let i=0;i<count;i++){
    const baseAmp = (Math.random() * 0.8 + 0.4) * STAR_MOVE_AMPLITUDE;
    stars.push({
      baseX: Math.random() * window.innerWidth,
      baseY: Math.random() * window.innerHeight,
      r: Math.random() * 1.25 + 0.1,
      baseAlpha: 0.14 + Math.random()*0.55,
      twinkleSpeed: 0.18 + Math.random()*0.9,
      phase: Math.random() * TWO_PI,
      moveAmp: baseAmp,
      moveFreq: 0.6 + Math.random()*1.8,
      movePhase: Math.random() * TWO_PI
    });
  }
}

function initOrbitBackground(){
  const w = window.innerWidth, h = window.innerHeight;
  const size = Math.max(w, h);
  orbitCache = {
    sunX: w * 0.5,
    sunY: h * 0.48,
    earthOrbitR: Math.max(130, Math.min(size * 0.32, Math.min(w, h) * 0.42)),
    moonOrbitR: Math.max(28, Math.min(size * 0.05, 52)),
    tilt: -0.18,
    scaleY: 0.62
  };
}
initStars();
resizeBG();
window.addEventListener('resize', initStars);

function drawNebula(nowMs){
  const w = window.innerWidth, h = window.innerHeight;
  const now = nowMs || performance.now();
  const t = now * NEBULA_TIME_SCALE;

  const ox1 = Math.sin(t * 0.9) * (w * 0.035);
  const oy1 = Math.cos(t * 0.85) * (h * 0.025);
  const g1 = bgCtx.createRadialGradient(w*0.75 + ox1, h*0.18 + oy1, 60, w*0.75 + ox1, h*0.18 + oy1, Math.max(w,h));
  g1.addColorStop(0, 'rgba(44,12,80,0.12)');
  g1.addColorStop(0.35, 'rgba(25,10,52,0.06)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g1;
  bgCtx.fillRect(0,0,w,h);

  const ox2 = Math.sin(t * 1.45 + 1.9) * (w * 0.03);
  const oy2 = Math.cos(t * 1.2 + 1.2) * (h * 0.018);
  const g2 = bgCtx.createRadialGradient(w*0.18 + ox2, h*0.72 + oy2, 40, w*0.18 + ox2, h*0.72 + oy2, Math.max(w,h));
  g2.addColorStop(0, 'rgba(10,30,60,0.10)');
  g2.addColorStop(0.6, 'rgba(5,10,30,0.03)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g2;
  bgCtx.fillRect(0,0,w,h);
}

function projectOrbit(cx, cy, r, angle, scaleY, tilt){
  const cosT = Math.cos(tilt), sinT = Math.sin(tilt);
  const x0 = Math.cos(angle) * r;
  const y0 = Math.sin(angle) * r * scaleY;
  return {
    x: cx + x0 * cosT - y0 * sinT,
    y: cy + x0 * sinT + y0 * cosT
  };
}

function drawEllipseOrbit(cx, cy, r, scaleY, tilt, color, width){
  bgCtx.save();
  bgCtx.translate(cx, cy);
  bgCtx.rotate(tilt);
  bgCtx.scale(1, scaleY);
  bgCtx.beginPath();
  bgCtx.arc(0, 0, r, 0, TWO_PI);
  bgCtx.restore();
  bgCtx.strokeStyle = color;
  bgCtx.lineWidth = width;
  bgCtx.stroke();
}

function drawLabel(text, x, y){
  bgCtx.font = '600 12px Inter, system-ui, sans-serif';
  bgCtx.textAlign = 'center';
  bgCtx.textBaseline = 'middle';
  bgCtx.fillStyle = 'rgba(4, 10, 18, 0.62)';
  const width = bgCtx.measureText(text).width + 14;
  bgCtx.beginPath();
  bgCtx.roundRect(x - width / 2, y - 10, width, 20, 10);
  bgCtx.fill();
  bgCtx.fillStyle = 'rgba(226, 247, 255, 0.86)';
  bgCtx.fillText(text, x, y + 0.5);
}

function drawPlanet({x, y, r, fill, glow, label}){
  const g = bgCtx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.15, x, y, r * 1.5);
  fill.forEach(stop => g.addColorStop(stop[0], stop[1]));
  bgCtx.save();
  bgCtx.shadowColor = glow;
  bgCtx.shadowBlur = r * 1.4;
  bgCtx.fillStyle = g;
  bgCtx.beginPath();
  bgCtx.arc(x, y, r, 0, TWO_PI);
  bgCtx.fill();
  bgCtx.restore();
  bgCtx.strokeStyle = 'rgba(255,255,255,0.28)';
  bgCtx.lineWidth = 1;
  bgCtx.stroke();
  drawLabel(label, x, y + r + 15);
}

function drawRealtimeOrbits(nowMs){
  const cfg = orbitCache;
  if (!cfg) return;
  const realDays = (Date.now() - J2000_MS) / 86400000;
  const simTime = nowMs / 1000;
  const earthAngle = (realDays / 365.256 * TWO_PI) + (simTime / ORBIT_SECONDS_PER_YEAR * TWO_PI) - 1.35;
  const moonAngle = (realDays / 27.321661 * TWO_PI) + (simTime / MOON_SECONDS_PER_MONTH * TWO_PI) + 0.8;
  const earth = projectOrbit(cfg.sunX, cfg.sunY, cfg.earthOrbitR, earthAngle, cfg.scaleY, cfg.tilt);
  const moon = projectOrbit(earth.x, earth.y, cfg.moonOrbitR, moonAngle, 0.72, cfg.tilt + 0.55);

  drawEllipseOrbit(cfg.sunX, cfg.sunY, cfg.earthOrbitR, cfg.scaleY, cfg.tilt, 'rgba(125, 215, 255, 0.17)', 1.25);
  drawEllipseOrbit(earth.x, earth.y, cfg.moonOrbitR, 0.72, cfg.tilt + 0.55, 'rgba(230, 238, 255, 0.20)', 1);

  bgCtx.beginPath();
  bgCtx.moveTo(earth.x, earth.y);
  bgCtx.lineTo(moon.x, moon.y);
  bgCtx.strokeStyle = 'rgba(210, 230, 255, 0.10)';
  bgCtx.lineWidth = 1;
  bgCtx.stroke();

  drawPlanet({
    x: cfg.sunX, y: cfg.sunY, r: 31,
    fill: [[0, '#fff8d0'], [0.45, '#ffd166'], [1, '#f97316']],
    glow: 'rgba(255, 174, 66, 0.68)', label: '太阳'
  });
  drawPlanet({
    x: earth.x, y: earth.y, r: 15,
    fill: [[0, '#d9fbff'], [0.42, '#2dd4bf'], [0.72, '#2563eb'], [1, '#0f172a']],
    glow: 'rgba(59, 130, 246, 0.60)', label: '地球'
  });
  drawPlanet({
    x: moon.x, y: moon.y, r: 6,
    fill: [[0, '#ffffff'], [0.48, '#cbd5e1'], [1, '#64748b']],
    glow: 'rgba(226, 232, 240, 0.46)', label: '月球'
  });
}

function drawBackground(nowMs){
  const w = window.innerWidth, h = window.innerHeight;
  bgCtx.clearRect(0,0,w,h);

  bgCtx.fillStyle = 'rgba(0,0,0,0.20)';
  bgCtx.fillRect(0,0,w,h);
  drawNebula(nowMs);

  const now = nowMs || performance.now();
  for(const s of stars){
    s.phase += 0.00055 * s.twinkleSpeed;
    const drift = Math.sin(now * STAR_MOVE_SPEED * s.moveFreq + s.movePhase);
    const drift2 = Math.cos(now * STAR_MOVE_SPEED * s.moveFreq * 0.7 + s.movePhase * 1.3);
    const x = s.baseX + drift * s.moveAmp;
    const y = s.baseY + drift2 * s.moveAmp * 0.6;
    const alpha = s.baseAlpha * (0.65 + 0.35 * Math.sin(s.phase + now * 0.00035 * s.twinkleSpeed));
    bgCtx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
    bgCtx.beginPath();
    bgCtx.fillStyle = '#ffffff';
    bgCtx.arc(x, y, s.r, 0, TWO_PI);
    bgCtx.fill();
  }
  bgCtx.globalAlpha = 1;
  drawRealtimeOrbits(now);
}

let animActive = true, lastTs = 0;
function bgLoop(ts){
  if (!animActive) { requestAnimationFrame(bgLoop); return; }
  if (!lastTs || ts - lastTs >= FRAME_MIN) {
    drawBackground(ts || performance.now());
    lastTs = ts;
  }
  requestAnimationFrame(bgLoop);
}
document.addEventListener('visibilitychange', ()=> {
  animActive = (document.visibilityState === 'visible');
  if (animActive) lastTs = 0;
});
requestAnimationFrame(bgLoop);

const toolArea = document.getElementById('toolArea');
const buttons = document.querySelectorAll('#toolButtons button');
const loaded = new Map();
let activeToolName = null;

function showHint(msg){
  if (toolArea) toolArea.innerHTML = `<div class="hint">${msg}</div>`;
}
showHint('点击上方按钮加载对应小工具');

function invokeLifecycle(name, hookName){
  const entry = loaded.get(name);
  if (entry && typeof entry[hookName] === 'function') {
    entry[hookName]();
  }
}

async function loadTool(name){
  if(!toolArea) return;

  if (activeToolName && activeToolName !== name) {
    invokeLifecycle(activeToolName, 'onHide');
  }

  if(loaded.has(name)){
    toolArea.innerHTML = '';
    toolArea.appendChild(loaded.get(name).wrapper);
    invokeLifecycle(name, 'onShow');
    activeToolName = name;
    return;
  }

  showHint('模块加载中…');
  try{
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
      onShow: typeof el.onToolShow === 'function' ? ()=> el.onToolShow() : null,
      onHide: typeof el.onToolHide === 'function' ? ()=> el.onToolHide() : null,
    });
    toolArea.innerHTML = '';
    toolArea.appendChild(wrapper);
    invokeLifecycle(name, 'onShow');
    activeToolName = name;
  }catch(err){
    console.error(err);
    showHint('加载失败：' + (err.message||err));
  }
}

buttons.forEach(b=>{ b.addEventListener('click', ()=> loadTool(b.dataset.tool)); });
