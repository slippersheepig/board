const bgCanvas = document.getElementById('bgCanvas');
const bgCtx = bgCanvas.getContext('2d');

function resizeBG(){
  bgCanvas.width = window.innerWidth;
  bgCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeBG);
resizeBG();

const particles = [];
const PARTICLE_COUNT = Math.max(24, Math.floor((window.innerWidth*window.innerHeight)/160000));
for(let i=0;i<PARTICLE_COUNT;i++){
  particles.push({
    x: Math.random()*bgCanvas.width,
    y: Math.random()*bgCanvas.height,
    r: Math.random()*1.6 + 0.4,
    dx: (Math.random()-0.5)*0.22,
    dy: (Math.random()-0.5)*0.22,
    alpha: 0.12 + Math.random()*0.5
  });
}

function drawBackground(){
  bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
  const g = bgCtx.createLinearGradient(0,0,bgCanvas.width,bgCanvas.height);
  g.addColorStop(0, 'rgba(2,6,23,0.95)');
  g.addColorStop(1, 'rgba(3,18,36,0.95)');
  bgCtx.fillStyle = g;
  bgCtx.fillRect(0,0,bgCanvas.width,bgCanvas.height);

  bgCtx.fillStyle = '#66d9ff';
  for(const p of particles){
    bgCtx.globalAlpha = p.alpha;
    bgCtx.beginPath();
    bgCtx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    bgCtx.fill();
    p.x += p.dx; p.y += p.dy;
    if(p.x < -20) p.x = bgCanvas.width + 20;
    if(p.x > bgCanvas.width + 20) p.x = -20;
    if(p.y < -20) p.y = bgCanvas.height + 20;
    if(p.y > bgCanvas.height + 20) p.y = -20;
  }
  bgCtx.globalAlpha = 1;
}
function bgLoop(){ drawBackground(); requestAnimationFrame(bgLoop); }
requestAnimationFrame(bgLoop);

/* Lazy load tools */
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

buttons.forEach(b=>{
  b.addEventListener('click', ()=> loadTool(b.dataset.tool));
});

/* Theme toggle */
const themeToggle = document.getElementById('themeToggle');
themeToggle.addEventListener('click', ()=>{
  document.body.classList.toggle('light');
  localStorage.setItem('cool_dashboard_theme', document.body.classList.contains('light') ? 'light' : 'dark');
});
const savedTheme = localStorage.getItem('cool_dashboard_theme');
if(savedTheme === 'light') document.body.classList.add('light');

/* Quick actions: copy time */
document.getElementById('copyTime').addEventListener('click', async ()=>{
  const now = new Date().toLocaleString();
  try{
    await navigator.clipboard.writeText(now);
    document.getElementById('copyResult').textContent = '已复制: ' + now;
  }catch(e){
    document.getElementById('copyResult').textContent = '复制失败';
  }
});

/* Notes in right panel (quick) - localStorage */
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
