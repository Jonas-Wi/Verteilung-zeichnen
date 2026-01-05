const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

let drawing = false;
let points = [];

ctx.lineWidth = 3;
ctx.lineCap = "round";
ctx.strokeStyle = "black";

// Achsen zeichnen
function drawAxes() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.beginPath();
  ctx.moveTo(50, 20);
  ctx.lineTo(50, 350);
  ctx.lineTo(580, 350);
  ctx.stroke();
}

drawAxes();

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const t = e.touches ? e.touches[0] : e;
  return {
    x: t.clientX - rect.left,
    y: t.clientY - rect.top
  };
}

canvas.addEventListener("mousedown", start);
canvas.addEventListener("mousemove", move);
canvas.addEventListener("mouseup", end);
canvas.addEventListener("mouseleave", end);

canvas.addEventListener("touchstart", start);
canvas.addEventListener("touchmove", move);
canvas.addEventListener("touchend", end);

function start(e) {
  drawing = true;
  points = [];
  drawAxes();

  const pos = getPos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
  points.push(pos);
}

function move(e) {
  if (!drawing) return;

  const pos = getPos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
  points.push(pos);
}

function end() {
  drawing = false;
}

// Normierung für statistischen Vergleich
function normalize(points) {
  return points.map(p => ({
    x: (p.x - 50) / (canvas.width - 100),      // 0–1
    y: 1 - (p.y - 20) / (330)                  // invertierte Y-Achse
  }));
}

function clearCanvas() {
  points = [];
  drawAxes();
}

async function save() {
  const normalized = normalize(points);

  await fetch("http://localhost:8000/submit-player-distribution", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      raw: points,
      normalized: normalized,
      timestamp: Date.now()
    })
  });

  alert("Verteilung gespeichert");
}

async function evaluateDrawing() {
  const normalized = normalize(points);

  const res = await fetch("http://localhost:3000/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ curve: normalized })
  });

  const data = await res.json();

  drawReference(data.reference);
  document.getElementById("result").innerText =
    `Übereinstimmung: ${data.score}%`;
}

function drawReference(ref) {
  ctx.strokeStyle = "red";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ref.forEach((p, i) => {
    const x = 50 + p.x * (canvas.width - 100);
    const y = 350 - p.y * 330;

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });

  ctx.stroke();

  // Stil wieder zurücksetzen
  ctx.strokeStyle = "black";
  ctx.lineWidth = 3;
}


async function evaluateDrawing() {
  const normalized = normalize(points);

  const res = await fetch("http://localhost:3000/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ curve: normalized })
  });

  const data = await res.json();

  drawReference(data.reference);

  document.getElementById("result").innerText =
    `Übereinstimmung: ${data.score}% (MSE: ${data.error.toFixed(4)})`;
}

window.evaluateDrawing = evaluateDrawing;
window.clearCanvas = clearCanvas;
