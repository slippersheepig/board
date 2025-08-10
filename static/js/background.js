const canvas = document.getElementById('starfield');
const ctx = canvas.getContext('2d');
let stars = [];

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function initStars() {
    stars = [];
    let numStars = Math.floor((canvas.width * canvas.height) / 2500); // 密度提高
    for (let i = 0; i < numStars; i++) {
        stars.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 1.5 + 0.5,
            speed: Math.random() * 0.2 + 0.05,
            alpha: Math.random(),
            alphaChange: Math.random() * 0.02 - 0.01
        });
    }
}

function drawStars() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 星云渐变背景
    let gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 0, canvas.width/2, canvas.height/2, canvas.width/1.2);
    gradient.addColorStop(0, '#02010a');
    gradient.addColorStop(1, '#000000');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制星星
    ctx.fillStyle = '#fff';
    for (let star of stars) {
        ctx.globalAlpha = star.alpha;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.radius, 0, 2 * Math.PI);
        ctx.fill();

        // 闪烁
        star.alpha += star.alphaChange;
        if (star.alpha <= 0 || star.alpha >= 1) {
            star.alphaChange = -star.alphaChange;
        }

        // 缓慢移动
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
    }
    ctx.globalAlpha = 1;
}

function animate() {
    drawStars();
    requestAnimationFrame(animate);
}

initStars();
animate();
