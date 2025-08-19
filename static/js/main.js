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
}
window.addEventListener('resize', resizeBG);
resizeBG();

const STAR_DENSITY = 0.0003;
const STAR_MOVE_AMPLITUDE = 20;
const STAR_MOVE_SPEED = 0.00035;
const NEBULA_TIME_SCALE = 0.00006;

let stars = [];
function initStars(){
  stars = [];
  const area = window.innerWidth * window.innerHeight;
  const count = Math.min(900, Math.max(120, Math.floor(area * STAR_DENSITY)));
  for(let i=0;i<count;i++){
    const baseAmp = (Math.random() * 0.8 + 0.4) * STAR_MOVE_AMPLITUDE;
    stars.push({
      baseX: Math.random() * window.innerWidth,
      baseY: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.12,
      baseAlpha: 0.14 + Math.random()*0.6,
      twinkleSpeed: 0.18 + Math.random()*0.9,
      phase: Math.random() * Math.PI * 2,
      moveAmp: baseAmp,
      moveFreq: 0.6 + Math.random()*1.8,
      movePhase: Math.random() * Math.PI * 2
    });
  }
}
initStars();
window.addEventListener('resize', initStars);

function drawNebula(nowMs){
  const w = window.innerWidth, h = window.innerHeight;
  const now = nowMs || performance.now();
  const t = now * NEBULA_TIME_SCALE;

  const ox1 = Math.sin(t * 0.9) * (w * 0.06);
  const oy1 = Math.cos(t * 0.85) * (h * 0.035);
  const g1 = bgCtx.createRadialGradient(w*0.75 + ox1, h*0.18 + oy1, 60, w*0.75 + ox1, h*0.18 + oy1, Math.max(w,h));
  g1.addColorStop(0, 'rgba(44,12,80,0.12)');
  g1.addColorStop(0.35, 'rgba(25,10,52,0.06)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g1;
  bgCtx.fillRect(0,0,w,h);

  const ox2 = Math.sin(t * 1.45 + 1.9) * (w * 0.04);
  const oy2 = Math.cos(t * 1.2 + 1.2) * (h * 0.02);
  const g2 = bgCtx.createRadialGradient(w*0.18 + ox2, h*0.72 + oy2, 40, w*0.18 + ox2, h*0.72 + oy2, Math.max(w,h));
  g2.addColorStop(0, 'rgba(10,30,60,0.10)');
  g2.addColorStop(0.6, 'rgba(5,10,30,0.03)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g2;
  bgCtx.fillRect(0,0,w,h);
}

function drawStars(nowMs){
  const w = window.innerWidth, h = window.innerHeight;
  bgCtx.clearRect(0,0,w,h);

  bgCtx.fillStyle = 'rgba(0,0,0,0.20)';
  bgCtx.fillRect(0,0,w,h);

  drawNebula(nowMs);

  const now = nowMs || performance.now();

  for(const s of stars){
    s.phase += 0.0007 * s.twinkleSpeed;

    const drift = Math.sin(now * STAR_MOVE_SPEED * s.moveFreq + s.movePhase);
    const drift2 = Math.cos(now * STAR_MOVE_SPEED * s.moveFreq * 0.7 + s.movePhase * 1.3);
    const dx = drift * s.moveAmp;
    const dy = drift2 * s.moveAmp * 0.6;

    const x = s.baseX + dx;
    const y = s.baseY + dy;

    const alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(s.phase + now * 0.00045 * s.twinkleSpeed));
    bgCtx.globalAlpha = Math.max(0.05, Math.min(1, alpha));
    bgCtx.beginPath();
    bgCtx.fillStyle = '#ffffff';
    bgCtx.arc(x, y, s.r, 0, Math.PI*2);
    bgCtx.fill();
  }

  bgCtx.globalAlpha = 1;
}

let animActive = true, lastTs = 0;
const TARGET_FPS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : 60;
const FRAME_MIN = 1000 / TARGET_FPS;
function bgLoop(ts){
  if (!animActive) { requestAnimationFrame(bgLoop); return; }
  if (!lastTs || ts - lastTs >= FRAME_MIN) {
    drawStars(ts || performance.now());
    lastTs = ts;
  }
  requestAnimationFrame(bgLoop);
}
document.addEventListener('visibilitychange', ()=> animActive = (document.visibilityState === 'visible'));
window.addEventListener('blur',  ()=> animActive = false);
window.addEventListener('focus', ()=> { lastTs = 0; animActive = true; });
requestAnimationFrame(bgLoop);

const toolArea = document.getElementById('toolArea');
const buttons = document.querySelectorAll('#toolButtons button');
const loaded = new Map();

function showHint(msg){
  if (toolArea) toolArea.innerHTML = `<div class="hint">${msg}</div>`;
}
showHint('点击上方按钮加载对应小工具');

async function loadTool(name){
  if(!toolArea) return;
  if(loaded.has(name)){
    toolArea.innerHTML = '';
    toolArea.appendChild(loaded.get(name));
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
    loaded.set(name, wrapper);
    toolArea.innerHTML = '';
    toolArea.appendChild(wrapper);
  }catch(err){
    console.error(err);
    showHint('加载失败：' + (err.message||err));
  }
}

buttons.forEach(b=>{ b.addEventListener('click', ()=> loadTool(b.dataset.tool)); });
