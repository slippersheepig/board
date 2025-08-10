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

// starfield parameters
const STAR_DENSITY = 0.0009;
let stars = [];
function initStars(){
  stars = [];
  const count = Math.max(120, Math.floor(window.innerWidth * window.innerHeight * STAR_DENSITY));
  for(let i=0;i<count;i++){
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.6 + 0.2,
      baseAlpha: 0.2 + Math.random()*0.8,
      twinkleSpeed: 0.5 + Math.random()*1.8,
      phase: Math.random() * Math.PI * 2
    });
  }
}
initStars();
window.addEventListener('resize', initStars);

function drawNebula(){
  // subtle nebula: layered radial gradients
  const w = window.innerWidth, h = window.innerHeight;
  const g = bgCtx.createRadialGradient(w*0.7, h*0.2, 50, w*0.7, h*0.2, Math.max(w,h));
  g.addColorStop(0, 'rgba(40, 20, 60, 0.14)');
  g.addColorStop(0.4, 'rgba(30, 10, 50, 0.06)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g;
  bgCtx.fillRect(0,0,w,h);

  const g2 = bgCtx.createRadialGradient(w*0.2, h*0.7, 30, w*0.2, h*0.7, Math.max(w,h));
  g2.addColorStop(0, 'rgba(10, 30, 60, 0.10)');
  g2.addColorStop(0.6, 'rgba(5,10,30,0.03)');
  g2.addColorStop(1, 'rgba(0,0,0,0)');
  bgCtx.fillStyle = g2;
  bgCtx.fillRect(0,0,w,h);
}

function drawStars(now){
  bgCtx.clearRect(0,0,window.innerWidth, window.innerHeight);
  // faint overall vignette
  bgCtx.fillStyle = 'rgba(0,0,0,0.25)';
  bgCtx.fillRect(0,0,window.innerWidth,window.innerHeight);

  drawNebula();

  for(const s of stars){
    const a = s.baseAlpha * (0.6 + 0.4 * Math.sin(s.phase + now * 0.001 * s.twinkleSpeed));
    bgCtx.globalAlpha = a;
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

/* ---------- 懒加载工具框架（不变） ---------- */
const toolArea = document.getElementById('toolArea');
const buttons = document.querySelectorAll('#toolButtons button');
const loaded = new Map();

function showHint(msg){
  toolArea.innerHTML = `<div class="hint">${msg}</div>`;
}
showHint('点击上方按钮加载对应小工具（按需加载）');

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
    loaded.set(name, el);
    toolArea.innerHTML = '';
    toolArea.appendChild(el);
  }catch(err){
    console.error(err);
    showHint('加载失败：' + (err.message||err));
  }
}

buttons.forEach(b=>{ b.addEventListener('click', ()=> loadTool(b.dataset.tool)); });

/* ---------- 快捷：复制时间 & 便签（localStorage） ---------- */
document.getElementById('copyTime').addEventListener('click', async ()=>{
  const now = new Date().toLocaleString();
  try{
    await navigator.clipboard.writeText(now);
    document.getElementById('copyResult').textContent = '已复制: ' + now;
  }catch(e){
    document.getElementById('copyResult').textContent = '复制失败';
  }
});

const NOTE_KEY = 'cool_dashboard_note_quick';
const noteArea = document.getElementById('noteArea');
noteArea.value = localStorage.getItem(NOTE_KEY) || '';
document.getElementById('noteSave').addEventListener('click', ()=>{
  localStorage.setItem(NOTE_KEY, noteArea.value || '');
  alert('已保存到本地浏览器（仅此浏览器可见）');
});
document.getElementById('noteClear').addEventListener('click', ()=>{
  if(confirm('清空便签？')){ noteArea.value=''; localStorage.removeItem(NOTE_KEY); }
});
