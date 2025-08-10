const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');

function resizeBG(){
  const dpr = window.devicePixelRatio || 1;
  bgCanvas.width = Math.floor(window.innerWidth * dpr);
  bgCanvas.height = Math.floor(window.innerHeight * dpr);
  bgCanvas.style.width = window.innerWidth + 'px';
  bgCanvas.style.height = window.innerHeight + 'px';
  bgCtx.setTransform(dpr,0,0,dpr,0,0);
}
window.addEventListener('resize', resizeBG);
resizeBG();

const STAR_DENSITY = 0.0003;
let stars = [];
function initStars(){
  stars = [];
  const count = Math.max(60, Math.floor(window.innerWidth * window.innerHeight * STAR_DENSITY));
  for(let i=0;i<count;i++){
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.12,
      baseAlpha: 0.16 + Math.random()*0.6,
      twinkleSpeed: 0.2 + Math.random()*0.9,
      phase: Math.random() * Math.PI * 2
    });
  }
}
initStars();
window.addEventListener('resize', initStars);

let nebulaOffset = {x:0, y:0};

function drawNebula(nowMs){
  const w = window.innerWidth, h = window.innerHeight;
  const now = nowMs || performance.now();

  const t = now * 0.00006;

  const ox1 = Math.sin(t * 0.9) * (w * 0.06);
  const oy1 = Math.cos(t * 0.85) * (h * 0.035);

  const g1 = bgCtx.createRadialGradient(w*0.75 + ox1, h*0.18 + oy1, 60, w*0.75 + ox1, h*0.18 + oy1, Math.max(w,h));
  g1.addColorStop(0, 'rgba(44,12,80,0.12)');
  g1.addColorStop(0.35, 'rgba(25,10,52,0.06)');
  g1.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g1;
  bgCtx.fillRect(0,0,w,h);

  const ox2 = Math.sin(t * 1.45 + 2.1) * (w * 0.04);
  const oy2 = Math.cos(t * 1.2 + 1.3) * (h * 0.02);

  const g2 = bgCtx.createRadialGradient(w*0.18 + ox2, h*0.72 + oy2, 40, w*0.18 + ox2, h*0.72 + oy2, Math.max(w,h));
  g2.addColorStop(0, 'rgba(10,30,60,0.10)');
  g2.addColorStop(0.6, 'rgba(5,10,30,0.03)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g2;
  bgCtx.fillRect(0,0,w,h);

  nebulaOffset.x = (ox1 + ox2) * 0.5;
  nebulaOffset.y = (oy1 + oy2) * 0.5;
}

function drawStars(now){
  bgCtx.clearRect(0,0,window.innerWidth, window.innerHeight);

  bgCtx.fillStyle = 'rgba(0,0,0,0.20)';
  bgCtx.fillRect(0,0,window.innerWidth,window.innerHeight);

  drawNebula(now);

  for(const s of stars){
    s.phase += 0.0008 * s.twinkleSpeed;
    const a = s.baseAlpha * (0.6 + 0.4 * Math.sin(s.phase + now * 0.0005 * s.twinkleSpeed));
    bgCtx.globalAlpha = Math.max(0.06, Math.min(1, a));
    bgCtx.beginPath();
    bgCtx.fillStyle = '#ffffff';
    bgCtx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    bgCtx.fill();
  }
  bgCtx.globalAlpha = 1;
}

function bgLoop(ts){
  drawStars(ts || performance.now());
  requestAnimationFrame(bgLoop);
}
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
