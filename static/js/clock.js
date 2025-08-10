const svgNS = "http://www.w3.org/2000/svg";
const clockGroup = document.getElementById('clockGroup');
const marksGroup = document.getElementById('marks');
const hourHand = document.getElementById('hourHand');
const minuteHand = document.getElementById('minuteHand');
const secondHand = document.getElementById('secondHand');
const pendulumGroup = document.getElementById('pendulumGroup');
const dateText = document.getElementById('dateText');

// 罗马数字数组（从 12 开始顺时针）
const ROMAN = ["XII","I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];

function ensureMarks(){
  if(marksGroup.childElementCount > 0) return;
  const radius = 140;
  // minute ticks (subtle)
  for(let i=0;i<60;i++){
    const line = document.createElementNS(svgNS, 'line');
    const ang = i * Math.PI/30;
    const inner = (i%5===0) ? radius*0.78 : radius*0.86;
    const outer = radius*0.95;
    line.setAttribute('x1', Math.cos(ang) * inner);
    line.setAttribute('y1', Math.sin(ang) * inner);
    line.setAttribute('x2', Math.cos(ang) * outer);
    line.setAttribute('y2', Math.sin(ang) * outer);
    line.setAttribute('stroke', (i%5===0) ? '#cfeeff' : 'rgba(255,255,255,0.12)');
    line.setAttribute('stroke-width', (i%5===0) ? '2' : '1');
    marksGroup.appendChild(line);
  }
  // roman numerals
  for(let i=0;i<12;i++){
    const ang = (i/12) * Math.PI * 2 - Math.PI/2;
    const tx = Math.cos(ang) * radius * 0.62;
    const ty = Math.sin(ang) * radius * 0.62 + 6; // adjust baseline
    const t = document.createElementNS(svgNS, 'text');
    t.setAttribute('x', tx);
    t.setAttribute('y', ty);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('font-family', 'Inter, Arial, sans-serif');
    t.setAttribute('font-size', '18');
    t.setAttribute('fill', '#cfeeff');
    t.setAttribute('style', 'filter: drop-shadow(0 2px 6px rgba(80,200,255,0.08)); font-weight:700;');
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

  hourHand.setAttribute('transform', `rotate(${hourDeg},0,0)`);
  minuteHand.setAttribute('transform', `rotate(${minuteDeg},0,0)`);
  secondHand.setAttribute('transform', `rotate(${secondDeg},0,0)`);

  // pendulum: smooth oscillation
  const phase = performance.now() / 700; // slower smoother
  const angle = Math.sin(phase) * 10; // ±10deg
  pendulumGroup.setAttribute('transform', `translate(0,40) rotate(${angle})`);

  // stylized date (neon + small glow)
  dateText.textContent = now.toLocaleDateString();
}

function loop(){
  updateSVGClock();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
