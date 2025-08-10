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

const STAR_DENSITY = 0.0011;
let stars = [];
function initStars(){
  stars = [];
  const count = Math.max(80, Math.floor(window.innerWidth * window.innerHeight * STAR_DENSITY));
  for(let i=0;i<count;i++){
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.15,
      baseAlpha: 0.18 + Math.random()*0.6,
      twinkleSpeed: 0.3 + Math.random()*1.1,
      phase: Math.random() * Math.PI * 2
    });
  }
}
initStars();
window.addEventListener('resize', initStars);

let nebulaOffset = {x:0, y:0};
function drawNebula(now){
  const w = window.innerWidth, h = window.innerHeight;
  const t = (now || performance.now()) * 0.00007;
  nebulaOffset.x = Math.sin(t) * (w * 0.05);
  nebulaOffset.y = Math.cos(t * 0.9) * (h * 0.03);

  const g = bgCtx.createRadialGradient(w*0.72 + nebulaOffset.x, h*0.22 + nebulaOffset.y, 50, w*0.72 + nebulaOffset.x, h*0.22 + nebulaOffset.y, Math.max(w,h));
  g.addColorStop(0, 'rgba(40, 20, 60, 0.12)');
  g.addColorStop(0.35, 'rgba(25, 12, 50, 0.06)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g;
  bgCtx.fillRect(0,0,w,h);

  const g2 = bgCtx.createRadialGradient(w*0.18 - nebulaOffset.x*0.6, h*0.68 + nebulaOffset.y*0.6, 30, w*0.18 - nebulaOffset.x*0.6, h*0.68 + nebulaOffset.y*0.6, Math.max(w,h));
  g2.addColorStop(0, 'rgba(10,30,60,0.10)');
  g2.addColorStop(0.6, 'rgba(5,10,30,0.03)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g2;
  bgCtx.fillRect(0,0,w,h);
}

function drawStars(now){
  bgCtx.clearRect(0,0,window.innerWidth, window.innerHeight);
  // light vignette
  bgCtx.fillStyle = 'rgba(0,0,0,0.22)';
  bgCtx.fillRect(0,0,window.innerWidth,window.innerHeight);

  // nebula (moving)
  drawNebula(now);

  for(const s of stars){
    s.phase += 0.0009 * s.twinkleSpeed;
    const a = s.baseAlpha * (0.65 + 0.35 * Math.sin(s.phase + now * 0.0006 * s.twinkleSpeed));
    bgCtx.globalAlpha = Math.max(0.06, Math.min(1, a));
    bgCtx.beginPath();
    bgCtx.fillStyle = '#ffffff';
    bgCtx.arc(s.x, s.y, s.r, 0, Math.PI*2);
    bgCtx.fill();
  }
  bgCtx.globalAlpha = 1;
}

function bgLoop(now){
  drawStars(now || performance.now());
  requestAnimationFrame(bgLoop);
}
requestAnimationFrame(bgLoop);

const toolArea = document.getElementById('toolArea');
const buttons = document.querySelectorAll('#toolButtons button');
const loaded = new Map();

function showHint(msg){
  toolArea.innerHTML = `<div class="hint">${msg}</div>`;
}
showHint('点击上方按钮加载对应小工具');

async function loadTool(name){
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
