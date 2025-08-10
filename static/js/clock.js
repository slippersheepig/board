function drawClock() {
    const canvas = document.getElementById("clock");
    const ctx = canvas.getContext("2d");
    const radius = canvas.height / 2;
    ctx.translate(radius, radius);
    const actualRadius = radius * 0.9;
    setInterval(() => {
        drawFace(ctx, actualRadius);
        drawNumbers(ctx, actualRadius);
        drawTime(ctx, actualRadius);
    }, 1000);
}

function drawFace(ctx, radius) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, 2 * Math.PI);
    ctx.fillStyle = "#111";
    ctx.fill();

    let grad = ctx.createRadialGradient(0, 0, radius * 0.95, 0, 0, radius * 1.05);
    grad.addColorStop(0, "#fff");
    grad.addColorStop(0.5, "#333");
    grad.addColorStop(1, "#fff");
    ctx.strokeStyle = grad;
    ctx.lineWidth = radius * 0.05;
    ctx.stroke();
}

function drawNumbers(ctx, radius) {
    ctx.font = radius * 0.15 + "px serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    const roman = ["XII","I","II","III","IV","V","VI","VII","VIII","IX","X","XI"];
    for (let num = 1; num <= 12; num++) {
        let ang = num * Math.PI / 6;
        ctx.rotate(ang);
        ctx.translate(0, -radius * 0.85);
        ctx.rotate(-ang);
        ctx.fillStyle = "#fff";
        ctx.fillText(roman[num-1], 0, 0);
        ctx.rotate(ang);
        ctx.translate(0, radius * 0.85);
        ctx.rotate(-ang);
    }
}

function drawTime(ctx, radius) {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const second = now.getSeconds();

    // 时针
    let hourPos = ((hour % 12) * Math.PI / 6) + (minute * Math.PI / (6 * 60));
    drawHand(ctx, hourPos, radius * 0.5, radius * 0.07);

    // 分针
    let minutePos = (minute * Math.PI / 30) + (second * Math.PI / (30 * 60));
    drawHand(ctx, minutePos, radius * 0.8, radius * 0.07);

    // 秒针
    let secondPos = second * Math.PI / 30;
    drawHand(ctx, secondPos, radius * 0.9, radius * 0.02, "red");

    // 日期
    ctx.font = radius * 0.15 + "px monospace";
    ctx.fillStyle = "#0ff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "#0ff";
    ctx.shadowBlur = 20;
    ctx.fillText(now.toDateString(), 0, radius * 0.6);
    ctx.shadowBlur = 0;
}

function drawHand(ctx, pos, length, width, color="#fff") {
    ctx.beginPath();
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
    ctx.moveTo(0,0);
    ctx.rotate(pos);
    ctx.lineTo(0, -length);
    ctx.stroke();
    ctx.rotate(-pos);
}

drawClock();
