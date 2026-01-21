// Basisklasse für Visualizer-Logik (gemeinsame Methoden)
// Basisklasse für Visualizer-Logik (gemeinsame Methoden)
export class BaseDistributionVisualizer {
  constructor(canvas, sessionId = null, gameMode = "color", level = null) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    this.sessionId = sessionId;
    this.gameMode = gameMode;
    this.level = level;
    this.drawing = false;
    this.points = [];
    this.isReadOnly = false;
    this.currentDistribution = null;
    this.savedMaxY = null;
    this.initEventListeners();
  }

  setLevel(level) {
    this.level = level;
  }

  /**
   * Gibt den Eingabemodus abhängig vom Level zurück.
   * Mögliche Werte: 'multiple-choice', 'single-question', 'full-draw'
   */
  getInputMode() {
    if (!this.level) return 'full-draw';
    if (this.level.welt === 1 && this.level.stufe === 1) return 'multiple-choice';
    if (this.level.welt === 1 && this.level.stufe === 2) return 'single-question';
    if (this.level.welt === 1 && this.level.stufe === 5) return 'full-draw-no-questions';
    return 'full-draw';
  }

  initEventListeners() {
    this.canvas.addEventListener("mousedown", (e) => {
      this.start(e);
    });
    this.canvas.addEventListener("mousemove", (e) => {
      this.move(e);
    });
    this.canvas.addEventListener("mouseup", (e) => {
      this.end(e);
    });
    this.canvas.addEventListener("mouseleave", (e) => {
      this.end(e);
    });
    this.canvas.addEventListener("touchstart", (e) => {
      this.start(e);
    });
    this.canvas.addEventListener("touchmove", (e) => {
      this.move(e);
    });
    this.canvas.addEventListener("touchend", (e) => {
      this.end(e);
    });
  }

  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: t.clientX - rect.left,
      y: t.clientY - rect.top
    };
  }

  start(e) {
    if (this.isReadOnly) return;
    this.drawing = true;
    this.points = [];
    if (typeof this.drawAxes === 'function') this.drawAxes(this.currentDistribution);
    const pos = this.getPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
    this.points.push(pos);
  }

  setDistribution(distribution) {
    this.currentDistribution = distribution;
    if (distribution && distribution.length > 0) {
      const m = Math.max(...distribution);
      this.savedMaxY = Math.max(1, m);
    }
  }

  move(e) {
    if (!this.drawing || this.isReadOnly) return;
    const pos = this.getPos(e);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.points.push(pos);
  }

  end(e) {
    this.drawing = false;
  }

  hasDrawing() {
    return this.points && this.points.length > 5;
  }

  normalizePoints(points) {
    return points.map(p => ({
      x: (p.x - 50) / (this.canvasWidth - 100),
      y: 1 - (p.y - 20) / 330
    }));
  }

  clear() {
    this.points = [];
    if (typeof this.drawAxes === 'function') this.drawAxes(this.currentDistribution);
  }

  getNormalizedPoints() {
    return this.normalizePoints(this.points);
  }

  async save() {
    const normalized = this.getNormalizedPoints();
    await fetch("http://localhost:3000/submit-player-distribution", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        raw: this.points,
        normalized: normalized,
        timestamp: Date.now()
      })
    });
    alert("Verteilung gespeichert");
  }

  pointsToSamples() {
    if (this.points.length === 0) {
      return [];
    }
    const N = 50;
    const samples = [];
    let maxY = 100;
    if (this.currentDistribution && this.currentDistribution.length > 0) {
      maxY = Math.max(...this.currentDistribution);
      if (maxY < 1) maxY = 1;
    } else if (this.savedMaxY) {
      maxY = this.savedMaxY;
    }
    const plotTop = 20;
    const plotHeight = 330;
    for (let i = 0; i < N; i++) {
      const xStart = 50 + (i / N) * 530;
      const xEnd = 50 + ((i + 1) / N) * 530;
      const pointsInBin = this.points.filter(p => p.x >= xStart && p.x < xEnd);
      if (pointsInBin.length > 0) {
        const avgY = pointsInBin.reduce((sum, p) => sum + p.y, 0) / pointsInBin.length;
        const yInPlot = Math.max(0, Math.min(plotHeight, avgY - plotTop));
        const yNorm = 1 - (yInPlot / plotHeight);
        const val = Math.round(yNorm * maxY);
        samples.push(Math.max(0, Math.min(100, val)));
      } else {
        samples.push(0);
      }
    }
    return samples;
  }

  setReadOnly(isReadOnly = true) {
    this.isReadOnly = isReadOnly;
    this.canvas.style.cursor = isReadOnly ? "default" : "crosshair";
  }

  setDrawMode(isDrawMode = true) {
    this.setReadOnly(!isDrawMode);
  }
  async evaluateDrawing() {
    if (!this.sessionId) {
      console.error('sessionId not set, cannot evaluate');
      alert('Fehler: Session ID nicht vorhanden');
      return null;
    }
    const samples = this.pointsToSamples();
    if (samples.length === 0) {
      console.warn('No points drawn');
      alert('Fehler: Bitte zeichne zuerst etwas!');
      return null;
    }
    try {
      const payload = {
        session_id: this.sessionId,
        samples: samples
      };
      if (this.preRevealAnswers) {
        payload.pre_reveal_answers = this.preRevealAnswers;
      }
      const res = await fetch("http://localhost:3000/submit-player-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === "ok") {
        const result = {
          mse: data.mse,
          mae: data.mae,
          score: data.score,
          wasserstein: data.wasserstein,
          wasserstein_distance: data.wasserstein_distance,
          tvd: data.tvd,
          abs_mean_error: data.abs_mean_error,
          abs_std_error: data.abs_std_error,
          passed: data.passed,
          distribution_similarity: data.distribution_similarity
        };
        result.message = `Score: ${data.score}% | MAE: ${data.mae?.toFixed(4) || 'N/A'}`;
        return result;
      } else {
        alert('Fehler bei der Evaluierung: ' + (data.message || data.error || 'Unbekannter Fehler'));
        return null;
      }
    } catch (e) {
      alert('Fehler beim Kontakt mit dem Server: ' + e.message);
      return null;
    }
  }
}