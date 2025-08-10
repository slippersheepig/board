const hourHand = document.getElementById('hourHand');
const minuteHand = document.getElementById('minuteHand');
const secondHand = document.getElementById('secondHand');
const pendulumGroup = document.getElementById('pendulumGroup');
const dateText = document.getElementById('dateText');

function updateSVGClock(time) {
  const now = time ? new Date(time) : new Date();
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

  // pendulum: use time-based smooth oscillation
  const phase = performance.now() / 600; // 控制摆速
  const angle = Math.sin(phase) * 10; // ±10deg
  pendulumGroup.setAttribute('transform', `translate(0,40) rotate(${angle})`);

  dateText.textContent = now.toLocaleDateString();
}

function tickLoop(){
  updateSVGClock();
  requestAnimationFrame(tickLoop);
}
requestAnimationFrame(tickLoop);
