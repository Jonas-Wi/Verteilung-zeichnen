import { BaseDistributionVisualizer } from "./BaseDistributionVisualizer";

export class NumberDistributionVisualizer extends BaseDistributionVisualizer {
  constructor(canvas, sessionId = null, level = null) {
    super(canvas, sessionId, "number", level);
    this.overlayMarkers = [];
    this.overlayGuessBars = [];
  }


  setDrawMode(isDrawMode = true) {
    // Eingabemodus dynamisch je nach Level
    const mode = this.getInputMode();
    if (mode === 'multiple-choice' || mode === 'single-question') {
      this.setReadOnly(true);
    } else {
      super.setDrawMode(isDrawMode);
    }
  }

  getInputMode() {
    // Hole aus Basisklasse
    if (typeof super.getInputMode === 'function') {
      return super.getInputMode();
    }
    // Fallback
    if (!this.level) return 'full-draw';
    if (this.level.welt === 1 && this.level.stufe === 1) return 'multiple-choice';
    if (this.level.welt === 1 && this.level.stufe === 2) return 'single-question';
    return 'full-draw';
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
      const histogram = new Array(21).fill(0);
      useDist.forEach(v => {
        const val = Math.max(0, Math.min(20, Math.round(v)));
        histogram[val]++;
      });
      const maxCount = Math.max(...histogram, 1);
      maxY = Math.max(10, Math.ceil(maxCount / 5) * 5);
    } else {
      maxY = 10;
    }
    this.numberModeMaxY = maxY;
    this.savedMaxY = maxY;
    this.ctx.save();
    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "left";
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = bottom - (i / steps) * plotH;
      const val = ((i / steps) * maxY).toFixed(1).replace(/\.0$/, "");
      this.ctx.fillText(val, 5, y + 4);
    }
    this.ctx.restore();
    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "center";
    this.ctx.fillText("Zahlenwert (0-20)", left + plotW / 2, bottom + 35);
    this.ctx.textAlign = "left";
    this.ctx.fillText("0", left, bottom + 55);
    this.ctx.textAlign = "center";
    this.ctx.fillText("10", left + plotW / 2, bottom + 55);
    this.ctx.textAlign = "right";
    this.ctx.fillText("20", right, bottom + 55);

    // Re-draw overlays (guess bars and peak markers) after axes
    if (this.overlayGuessBars && this.overlayGuessBars.length > 0) {
      this.drawGuessBars(this.overlayGuessBars);
    }
    if (this.overlayMarkers && this.overlayMarkers.length > 0) {
      this.drawMultiplePeakMarkers(this.overlayMarkers);
    }
  }

  drawPeakMarker(peakValue, frequency) {
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;
    const xPos = left + (peakValue / 20) * plotW;
    const maxY = this.numberModeMaxY || 10;
    const yPos = bottom - (frequency / maxY) * plotH;
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 100, 0, 0.9)';
    this.ctx.fillStyle = 'rgba(255, 150, 0, 0.3)';
    this.ctx.lineWidth = 3;
    const size = 15;
    this.ctx.beginPath();
    this.ctx.moveTo(xPos - size, yPos);
    this.ctx.lineTo(xPos + size, yPos);
    this.ctx.moveTo(xPos, yPos - size);
    this.ctx.lineTo(xPos, yPos + size);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(xPos, yPos, 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    this.ctx.fillStyle = 'rgba(255, 100, 0, 0.95)';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Wert: ${peakValue}`, xPos, yPos - 25);
    this.ctx.fillText(`Häufigkeit: ${frequency}`, xPos, yPos - 12);
    this.ctx.restore();
  }

  drawMultiplePeakMarkers(peaks) {
    if (!peaks || peaks.length === 0) return;
    // Persist markers so they remain visible when axes redraw
    this.overlayMarkers = peaks.slice();
    peaks.forEach(peak => {
      this.drawPeakMarker(peak.value, peak.frequency);
    });
  }

  drawTruthBarsForValues(distribution, values) {
    if (!distribution || !values) return;
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;
    const histogram = new Array(21).fill(0);
    distribution.forEach(v => {
      const val = Math.max(0, Math.min(20, Math.round(v)));
      histogram[val]++;
    });
    this.ctx.save();
    const maxY = this.numberModeMaxY || 10;
    values.forEach(value => {
      const val = Math.max(0, Math.min(20, Math.round(value)));
      const count = histogram[val];
      const barWidth = plotW / 21;
      const xPos = left + val * barWidth;
      const barHeight = (count / maxY) * plotH;
      const yPos = bottom - barHeight;
      this.ctx.fillStyle = 'rgba(0, 200, 100, 0.5)';
      this.ctx.fillRect(xPos, yPos, barWidth * 0.8, barHeight);
      this.ctx.strokeStyle = 'rgba(0, 150, 80, 0.9)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(xPos, yPos, barWidth * 0.8, barHeight);
      this.ctx.fillStyle = 'rgba(0, 100, 50, 1)';
      this.ctx.font = 'bold 11px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`✓ ${count}x`, xPos + barWidth * 0.4, yPos - 5);
    });
    this.ctx.restore();
  }

  // Zeichnet graue Balken für vom Spieler eingegebene Schätzungen
  // guesses: Array von { value: number (0-20), frequency: number }
  drawGuessBars(guesses, colorFill = 'rgba(150,150,150,0.5)', colorStroke = 'rgba(120,120,120,0.9)') {
    if (!guesses || guesses.length === 0) return;
    // Persist guess bars for redraws
    this.overlayGuessBars = guesses.slice();
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;
    const maxY = this.numberModeMaxY || 10;
    this.ctx.save();
    guesses.forEach(g => {
      if (!g || typeof g.value !== 'number' || typeof g.frequency !== 'number') return;
      const val = Math.max(0, Math.min(20, Math.round(g.value)));
      const freq = Math.max(0, g.frequency);
      const barWidth = plotW / 21;
      const xPos = left + val * barWidth;
      const barHeight = (freq / maxY) * plotH;
      const yPos = bottom - barHeight;
      this.ctx.fillStyle = colorFill;
      this.ctx.fillRect(xPos, yPos, barWidth * 0.8, barHeight);
      this.ctx.strokeStyle = colorStroke;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(xPos, yPos, barWidth * 0.8, barHeight);
    });
    this.ctx.restore();
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
    let displayValues = distribution;
    if (N <= 50) {
      const histogram = new Array(21).fill(0);
      distribution.forEach(v => {
        const val = Math.max(0, Math.min(20, Math.round(v)));
        histogram[val]++;
      });
      displayValues = histogram;
    }
    const M = displayValues.length;
    const maxY = this.numberModeMaxY || 10;
    for (let i = 0; i < M; i++) {
      const bw = plotW / M;
      const xCenter = left + (i + 0.5) / M * plotW;
      const x = Math.round(xCenter - bw / 2);
      const h = (displayValues[i] / maxY) * plotH;
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
    let displayValues = distribution;
    const N = distribution.length;
    if (N <= 50) {
      const histogram = new Array(21).fill(0);
      distribution.forEach(v => {
        const val = Math.max(0, Math.min(20, Math.round(v)));
        histogram[val]++;
      });
      displayValues = histogram;
    }
    const M = displayValues.length;
    const maxY = this.numberModeMaxY || 10;
    this.ctx.save();
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    for (let i = 0; i < M; i++) {
      const xCenter = left + (i + 0.5) / M * plotW;
      const y = Math.round(bottom - (displayValues[i] / maxY) * plotH);
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

  setPreRevealAnswers(answers) {
    this.preRevealAnswers = answers;
  }

}