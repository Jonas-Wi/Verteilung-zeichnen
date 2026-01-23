import { BaseDistributionVisualizer } from "./BaseDistributionVisualizer";

export class ColorDistributionVisualizer extends BaseDistributionVisualizer {
  constructor(canvas, sessionId = null, level = null) {
    super(canvas, sessionId, "color", level);
  }

  drawAxes(distribution = null) {
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    this.ctx.moveTo(left, top);
    this.ctx.lineTo(left, bottom);
    this.ctx.lineTo(right, bottom);
    this.ctx.stroke();
    let useDist = distribution || this.currentDistribution || null;
    let maxY = 100;
    if (useDist && useDist.length > 0) {
      maxY = Math.max(...useDist);
      if (maxY < 1) maxY = 1;
    } else if (this.points && this.points.length > 0) {
      const samples = this.pointsToSamples();
      if (samples && samples.length > 0) {
        maxY = Math.max(...samples, 1);
      }
    } else if (this.savedMaxY) {
      maxY = this.savedMaxY;
    }
    this.savedMaxY = maxY;
    this.ctx.save();
    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "left";
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = bottom - (i / steps) * plotH;
      const val = ((i / steps) * maxY).toFixed(1).replace(/\.0$/, "");
      this.ctx.fillText(val + "%", 5, y + 4);
    }
    this.ctx.restore();
    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Ballonwert", left + plotW / 2, bottom + 35);
    
    // X-Achse: Beschriftung alle 10 Einheiten (0, 10, 20, ..., 100)
    this.ctx.textAlign = "center";
    for (let i = 0; i <= 100; i += 10) {
      const xPos = left + (i / 100) * plotW;
      this.ctx.fillText(i.toString(), xPos, bottom + 55);
    }
    
    const colorbarY = bottom + 15;
    const colorbarH = 14;
    const grad = this.ctx.createLinearGradient(left, 0, right, 0);
    grad.addColorStop(0, 'rgb(255,255,255)');
    grad.addColorStop(1, 'rgb(0,0,0)');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(left, colorbarY, plotW, colorbarH);
    this.ctx.strokeStyle = "black";
    this.ctx.strokeRect(left, colorbarY, plotW, colorbarH);
  }

  drawDistribution(distribution, color = "red") {
    if (!distribution || distribution.length === 0) return;
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;
    const N = distribution.length;
    const maxY = Math.max(...distribution, 1);
    for (let i = 0; i < N; i++) {
      const bw = plotW / N;
      const xCenter = left + (i + 0.5) / N * plotW;
      const x = Math.round(xCenter - bw / 2);
      const h = (distribution[i] / maxY) * plotH;
      this.ctx.fillStyle = color === "red" ? "rgba(255,0,0,0.7)" : color;
      this.ctx.fillRect(x, Math.round(bottom - h), Math.max(1, Math.floor(bw) - 1), Math.round(h));
    }
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 3;
  }

  drawHighlight(distribution, highIdx = -1, lowIdx = -1, highColor = "rgba(0,200,0,0.95)", lowColor = "rgba(0,100,200,0.95)") {
    if (!distribution || distribution.length === 0) return;
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;
    const N = distribution.length;
    const maxY = Math.max(...distribution, 1);
    const paintBarOnly = (idx, color) => {
      if (idx < 0 || idx >= N) return;
      const bw = plotW / N;
      const xCenter = left + (idx + 0.5) / N * plotW;
      const x = Math.round(xCenter - bw / 2);
      const h = (distribution[idx] / maxY) * plotH;
      this.ctx.save();
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, Math.round(bottom - h), Math.max(3, Math.floor(bw) - 1), Math.round(h));
      this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, Math.round(bottom - h), Math.max(3, Math.floor(bw) - 1), Math.round(h));
      this.ctx.restore();
    };
    paintBarOnly(highIdx, highColor);
    paintBarOnly(lowIdx, lowColor);
  }

  drawUserStroke(color = "black") {
    if (!this.points || this.points.length === 0) return;
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      if (i === 0) this.ctx.moveTo(p.x, p.y);
      else this.ctx.lineTo(p.x, p.y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawContinuous(distribution, color = "blue") {
    if (!distribution || distribution.length === 0) return;
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;
    const N = distribution.length;
    const maxY = Math.max(...distribution, 1);
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    for (let i = 0; i < N; i++) {
      const xCenter = left + (i + 0.5) / N * plotW;
      const y = Math.round(bottom - (distribution[i] / maxY) * plotH);
      if (i === 0) this.ctx.moveTo(xCenter, y);
      else this.ctx.lineTo(xCenter, y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  drawCombined(distribution) {
    this.drawAxes(distribution);
    this.drawDistribution(distribution, 'rgba(200,200,200,0.95)');
    this.drawContinuous(distribution, 'red');
    this.drawUserStroke('black');
  }

  drawReference(ref) {
    this.ctx.strokeStyle = "red";
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = "round";
    this.ctx.beginPath();
    ref.forEach((p, i) => {
      const x = 50 + p.x * (this.canvasWidth - 100);
      const y = 350 - p.y * 330;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    });
    this.ctx.stroke();
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 3;
  }

  visualize(distribution, color = "red") {
    this.drawAxes(distribution);
    this.drawDistribution(distribution, color);
  }
}