document.addEventListener('DOMContentLoaded', ()=>{
  const svgNS = "http://www.w3.org/2000/svg";
  const marksGroup = document.getElementById('marks');
  const hourHand = document.getElementById('hourHand');
  const minuteHand = document.getElementById('minuteHand');
  const secondHand = document.getElementById('secondHand');
  const pendulumGroup = document.getElementById('pendulumGroup');
  const dateText = document.getElementById('dateText');

  // 罗马数字（从 12 顺时针）
  const ROMAN = ["XII","I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];

  function ensureMarks(){
    if(!marksGroup) return;
    if(marksGroup.childElementCount > 0) return;
    const radius = 140;
    // 分刻度
    for(let i=0;i<60;i++){
      const line = document.createElementNS(svgNS, 'line');
      const ang = i * Math.PI/30;
      const inner = (i%5===0) ? radius*0.78 : radius*0.86;
      const outer = radius*0.95;
      line.setAttribute('x1', (Math.cos(ang) * inner).toString());
      line.setAttribute('y1', (Math.sin(ang) * inner).toString());
      line.setAttribute('x2', (Math.cos(ang) * outer).toString());
      line.setAttribute('y2', (Math.sin(ang) * outer).toString());
      line.setAttribute('stroke', (i%5===0) ? '#cfeeff' : 'rgba(255,255,255,0.12)');
      line.setAttribute('stroke-width', (i%5===0) ? '2' : '1');
      marksGroup.appendChild(line);
    }
    // 罗马数字
    for(let i=0;i<12;i++){
      const ang = (i/12) * Math.PI * 2 - Math.PI/2;
      const tx = Math.cos(ang) * radius * 0.62;
      const ty = Math.sin(ang) * radius * 0.62 + 6;
      const t = document.createElementNS(svgNS, 'text');
      t.setAttribute('x', tx.toString());
      t.setAttribute('y', ty.toString());
      t.setAttribute('text-anchor', 'middle');
      // 使用古典衬线字体并上色
      t.setAttribute('font-family', "Georgia, 'Times New Roman', serif");
      t.setAttribute('font-size', '18');
      t.setAttribute('fill', '#ffdca7'); // 古典金色
      t.setAttribute('font-weight', '700');
      t.setAttribute('style', 'filter: drop-shadow(0 2px 6px rgba(0,0,0,0.6));');
      t.textContent = ROMAN[i];
      marksGroup.appendChild(t);
    }
  }

  ensureMarks();

  function updateSVGClock(){
    const now = new Date();
    const ms = now.getMilliseconds();
    const s = now.getSeconds() + ms/1000;
    const m = now.getMinutes() + s/60;
    const h = (now.getHours() % 12) + m/60;

    const hourDeg = (h / 12) * 360;
    const minuteDeg = (m / 60) * 360;
    const secondDeg = (s / 60) * 360;

    // 旋转 transform：围绕 (0,0) 即表盘中心
    hourHand.setAttribute('transform', `rotate(${hourDeg})`);
    minuteHand.setAttribute('transform', `rotate(${minuteDeg})`);
    secondHand.setAttribute('transform', `rotate(${secondDeg})`);

    // pendulum：更自然的摆动
    const phase = performance.now() / 700;
    const angle = Math.sin(phase) * 10; // ±10deg
    pendulumGroup.setAttribute('transform', `translate(0,40) rotate(${angle})`);

    // 美化日期：用本地格式（例如 yyyy/mm/dd）
    dateText.textContent = now.toLocaleDateString();
  }

  let last=0, active=true;
  const TARGET_FPS = matchMedia('(prefers-reduced-motion: reduce)').matches ? 30 : 60;
  const FRAME_MIN = 1000 / TARGET_FPS;
  function loop(ts){
    if (active && (!last || ts - last >= FRAME_MIN)) {
      updateSVGClock();
      last = ts;
    }
    requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', ()=> active = (document.visibilityState === 'visible'));
  window.addEventListener('blur',  ()=> active = false);
  window.addEventListener('focus', ()=> { last = 0; active = true; });
  requestAnimationFrame(loop);
});
