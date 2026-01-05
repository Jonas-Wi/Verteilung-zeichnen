/**
 * DistributionVisualizer
 * Klasse zur Visualisierung und Zeichnung von Verteilungen auf einem Canvas
 */
export class DistributionVisualizer {
  constructor(canvas, sessionId = null, gameMode = "color") {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvasWidth = canvas.width;
    this.canvasHeight = canvas.height;
    this.sessionId = sessionId;
    this.gameMode = gameMode; // "color" oder "number"

    // Zeichnungs-State
    this.drawing = false;
    this.points = [];
    this.isReadOnly = false; // Wenn true, nur Visualisierung ohne Zeichnen
    this.currentDistribution = null;
    this.savedMaxY = null;

    // Block-Modus
    this.blockMode = false;
    this.selectedBlockRange = null; // {start: int, end: int}
    this.isManipulating = false;

    this.initEventListeners();
  }
  /**
   * Aktiviert/Deaktiviert den Block-Modus
   */
  setBlockMode(on) {
    this.blockMode = !!on;
    this.isReadOnly = !on ? false : true; // Im Block-Modus kein Freihandzeichnen
    // TODO: UI-Feedback, Auswahl zurücksetzen
    this.selectedBlockRange = null;
    this.isManipulating = false;
  }

  /**
   * Initialisiert Mouse und Touch Event Listener
   */
  initEventListeners() {
    this.canvas.addEventListener("mousedown", (e) => {
      if (this.blockMode) {
        this.handleBlockSelect(e);
      } else {
        this.start(e);
      }
    });
    this.canvas.addEventListener("mousemove", (e) => {
      if (this.blockMode) {
        this.handleBlockMove(e);
      } else {
        this.move(e);
      }
    });
    this.canvas.addEventListener("mouseup", (e) => {
      if (this.blockMode) {
        this.handleBlockEnd(e);
      } else {
        this.end(e);
      }
    });
    this.canvas.addEventListener("mouseleave", (e) => {
      if (this.blockMode) {
        this.handleBlockEnd(e);
      } else {
        this.end(e);
      }
    });

    this.canvas.addEventListener("touchstart", (e) => {
      if (this.blockMode) {
        this.handleBlockSelect(e);
      } else {
        this.start(e);
      }
    });
    this.canvas.addEventListener("touchmove", (e) => {
      if (this.blockMode) {
        this.handleBlockMove(e);
      } else {
        this.move(e);
      }
    });
    this.canvas.addEventListener("touchend", (e) => {
      if (this.blockMode) {
        this.handleBlockEnd(e);
      } else {
        this.end(e);
      }
    });
  }
  // --- Block-Modus: Bereich auswählen und verschieben ---
  handleBlockSelect(e) {
    const pos = this.getPos(e);
    // Finde Block-Index (0-49) anhand X-Position
    const N = 50;
    const left = 50;
    const plotW = 530;
    let idx = Math.floor((pos.x - left) / (plotW / N));
    idx = Math.max(0, Math.min(N - 1, idx));
    // Wähle Bereich von idx-2 bis idx+2 (5 Blöcke)
    const start = Math.max(0, idx - 2);
    const end = Math.min(N - 1, idx + 2);
    this.selectedBlockRange = { start, end };
    this.isManipulating = true;
    this.lastY = pos.y;
    this.lastX = pos.x;
    this.drawAxes(this.currentDistribution);
    this.drawBlockSelection();
    this.drawUserStroke('black');
  }

  handleBlockMove(e) {
    if (!this.isManipulating || !this.selectedBlockRange) return;
    const pos = this.getPos(e);
    const dy = pos.y - this.lastY;
    const dx = pos.x - this.lastX;
    this.lastY = pos.y;
    this.lastX = pos.x;
    // Passe alle Punkte im Bereich an (X und Y verschieben)
    const N = 50;
    const left = 50;
    const plotW = 530;
    const blockW = plotW / N;
    const { start, end } = this.selectedBlockRange;
    for (let i = 0; i < this.points.length; i++) {
      const p = this.points[i];
      const blockIdx = Math.floor((p.x - left) / blockW);
      if (blockIdx >= start && blockIdx <= end) {
        p.y += dy;
        p.x += dx;
        // Begrenzung auf Canvas
        p.y = Math.max(20, Math.min(this.canvasHeight - 60, p.y));
        p.x = Math.max(left, Math.min(left + plotW, p.x));
      }
    }
    this.drawAxes(this.currentDistribution);
    this.drawBlockSelection();
    this.drawUserStroke('black');
  }

  handleBlockEnd(e) {
    this.isManipulating = false;
    this.selectedBlockRange = null;
    this.drawAxes(this.currentDistribution);
    this.drawUserStroke('black');
  }

  drawBlockSelection() {
    if (!this.selectedBlockRange) return;
    const N = 50;
    const left = 50;
    const plotW = 530;
    const blockW = plotW / N;
    const { start, end } = this.selectedBlockRange;
    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255, 215, 0, 0.18)';
    this.ctx.fillRect(left + start * blockW, 20, (end - start + 1) * blockW, 330);
    this.ctx.restore();
  }

  /**
   * Gibt Position des Mouse/Touch Events zurück
   */
  getPos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return {
      x: t.clientX - rect.left,
      y: t.clientY - rect.top
    };
  }

  /**
   * Start des Zeichnens
   */
  start(e) {
    if (this.isReadOnly) return;
    
    this.drawing = true;
    this.points = [];
    this.drawAxes(this.currentDistribution);

    const pos = this.getPos(e);
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
    this.points.push(pos);
  }

  /**
   * Setze die aktuelle Verteilung (wird für Achsen/Skalierung genutzt)
   */
  setDistribution(distribution) {
    this.currentDistribution = distribution;
    if (distribution && distribution.length > 0) {
      const m = Math.max(...distribution);
      this.savedMaxY = Math.max(1, m);
    }
  }

  /**
   * Während des Zeichnens
   */
  move(e) {
    if (!this.drawing || this.isReadOnly) return;

    const pos = this.getPos(e);
    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
    this.points.push(pos);
  }

  /**
   * Ende des Zeichnens
   */
  end(e) {
    this.drawing = false;
  }

  /**
   * Zeichnet die X/Y-Achsen
   */
  drawAxes(distribution = null) {
    // dynamic layout based on canvas size
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60; // leave space for labels and colorbar
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

    // Determine distribution to use for Y scaling: prefer passed-in, then currentDistribution, then drawn points
    let useDist = distribution || this.currentDistribution || null;
    let maxY = 100;
    
    if (this.gameMode === "number") {
      // Zahlenmodus: Absolute Werte, dynamisch aus Distribution berechnen
      if (useDist && useDist.length > 0) {
        // Erstelle Histogram aus den Zahlenwerten
        const histogram = new Array(21).fill(0);
        useDist.forEach(v => {
          const val = Math.max(0, Math.min(20, Math.round(v)));
          histogram[val]++;
        });
        const maxCount = Math.max(...histogram, 1);
        // Runde auf nächste 5er-Stelle auf (mindestens 10)
        maxY = Math.max(10, Math.ceil(maxCount / 5) * 5);
      } else {
        maxY = 10; // Fallback
      }
      this.numberModeMaxY = maxY; // Speichere für andere Funktionen
    } else {
      // Farbmodus: Prozent-Werte
      if (useDist && useDist.length > 0) {
        maxY = Math.max(...useDist);
        if (maxY < 1) maxY = 1;
      } else if (this.points && this.points.length > 0) {
        // derive approximate max from drawn points
        const samples = this.pointsToSamples();
        if (samples && samples.length > 0) {
          maxY = Math.max(...samples, 1);
        }
      } else if (this.savedMaxY) {
        maxY = this.savedMaxY;
      }
    }
    
    // persist last known max for future redraws
    this.savedMaxY = maxY;
    this.ctx.save();
    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "left";
    const steps = 5;
    for (let i = 0; i <= steps; i++) {
      const y = bottom - (i / steps) * plotH;
      const val = ((i / steps) * maxY).toFixed(1).replace(/\.0$/, "");
      // Im Zahlenmodus: Absolute Werte ohne %
      const unit = this.gameMode === "number" ? "" : "%";
      this.ctx.fillText(val + unit, 5, y + 4);
    }
    this.ctx.restore();

    // X-Achse-Beschriftung und Werte
    this.ctx.font = "12px Arial";
    this.ctx.fillStyle = "black";
    this.ctx.textAlign = "center";
    
    if (this.gameMode === "number") {
      // Zahlenmodus: X-Achse 0-20
      this.ctx.fillText("Zahlenwert (0-20)", left + plotW / 2, bottom + 35);
      this.ctx.textAlign = "left";
      this.ctx.fillText("0", left, bottom + 55);
      this.ctx.textAlign = "center";
      this.ctx.fillText("10", left + plotW / 2, bottom + 55);
      this.ctx.textAlign = "right";
      this.ctx.fillText("20", right, bottom + 55);
      
      // Keine Farbskala im Zahlenmodus
    } else {
      // Farbmodus: X-Achse Weiß-Schwarz
      this.ctx.fillText("Ballonwert", left + plotW / 2, bottom + 35);
      this.ctx.textAlign = "left";
      this.ctx.fillText("Weiß (0)", left, bottom + 55);
      this.ctx.textAlign = "right";
      this.ctx.fillText("Schwarz (100)", right, bottom + 55);

      // Farbskala als einzelner Farbverlauf-Balken passend zur Plotbreite
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
  }

  /**
   * Zeichnet einen Orientierungspunkt für den geschätzten Peak (nur Zahlenmodus)
   * @param {number} peakValue - Der geschätzte Peak-Wert (0-20)
   * @param {number} frequency - Die geschätzte Häufigkeit
   */
  drawPeakMarker(peakValue, frequency) {
    if (this.gameMode !== "number") return;
    
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;
    
    // X-Position basierend auf Wert (0-20)
    const xPos = left + (peakValue / 20) * plotW;
    
    // Y-Position basierend auf Häufigkeit (absoluter Wert, dynamisch)
    const maxY = this.numberModeMaxY || 10; // Verwende gespeichertes Maximum
    const yPos = bottom - (frequency / maxY) * plotH;
    
    // Zeichne einen Stern oder Marker
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(255, 100, 0, 0.9)';
    this.ctx.fillStyle = 'rgba(255, 150, 0, 0.3)';
    this.ctx.lineWidth = 3;
    
    // Kreuz-Marker
    const size = 15;
    this.ctx.beginPath();
    this.ctx.moveTo(xPos - size, yPos);
    this.ctx.lineTo(xPos + size, yPos);
    this.ctx.moveTo(xPos, yPos - size);
    this.ctx.lineTo(xPos, yPos + size);
    this.ctx.stroke();
    
    // Kreis um den Punkt
    this.ctx.beginPath();
    this.ctx.arc(xPos, yPos, 10, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.stroke();
    
    // Label mit Werten
    this.ctx.fillStyle = 'rgba(255, 100, 0, 0.95)';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(`Wert: ${peakValue}`, xPos, yPos - 25);
    this.ctx.fillText(`Häufigkeit: ${frequency}`, xPos, yPos - 12);
    
    this.ctx.restore();
  }

  /**
   * Zeichnet mehrere Peak-Marker (Spieler-Schätzungen)
   * @param {Array} peaks - Array von {value, frequency}
   */
  drawMultiplePeakMarkers(peaks) {
    if (this.gameMode !== "number" || !peaks || peaks.length === 0) return;
    
    peaks.forEach(peak => {
      this.drawPeakMarker(peak.value, peak.frequency);
    });
  }

  /**
   * Zeichnet die tatsächlichen Ground-Truth Balken für bestimmte Werte
   * @param {Array} distribution - Die Ground-Truth Distribution (50 Zahlenwerte 0-20)
   * @param {Array} values - Array von Werten (0-20) für die Balken gezeichnet werden sollen
   */
  drawTruthBarsForValues(distribution, values) {
    if (this.gameMode !== "number" || !distribution || !values) return;
    
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;
    
    // Erstelle Histogram der Distribution (Bins für 0-20)
    const histogram = new Array(21).fill(0);
    distribution.forEach(v => {
      const val = Math.max(0, Math.min(20, Math.round(v)));
      histogram[val]++;
    });
    
    // Zeichne Balken nur für die angegebenen Werte
    this.ctx.save();
    const maxY = this.numberModeMaxY || 10; // Verwende gespeichertes Maximum
    values.forEach(value => {
      const val = Math.max(0, Math.min(20, Math.round(value)));
      const count = histogram[val];
      
      // X-Position
      const barWidth = plotW / 21;
      const xPos = left + val * barWidth;
      
      // Y-Position (absoluter Wert)
      const barHeight = (count / maxY) * plotH;
      const yPos = bottom - barHeight;
      
      // Zeichne Balken (grün-transparent)
      this.ctx.fillStyle = 'rgba(0, 200, 100, 0.5)';
      this.ctx.fillRect(xPos, yPos, barWidth * 0.8, barHeight);
      
      // Rand
      this.ctx.strokeStyle = 'rgba(0, 150, 80, 0.9)';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(xPos, yPos, barWidth * 0.8, barHeight);
      
      // Label mit tatsächlicher Häufigkeit
      this.ctx.fillStyle = 'rgba(0, 100, 50, 1)';
      this.ctx.font = 'bold 11px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`✓ ${count}x`, xPos + barWidth * 0.4, yPos - 5);
    });
    this.ctx.restore();
  }

  /**
   * Prüft ob der Nutzer etwas gezeichnet hat
   */
  hasDrawing() {
    return this.points && this.points.length > 5; // Mindestens 5 Punkte
  }

  /**
   * Normalisiert Punkte von Canvas-Koordinaten in 0-1 Bereich
   */
  normalizePoints(points) {
    return points.map(p => ({
      x: (p.x - 50) / (this.canvasWidth - 100),      // 0–1
      y: 1 - (p.y - 20) / 330                         // invertierte Y-Achse
    }));
  }

  /**
   * Normalisiert eine Verteilung von 0-100 in Canvas-Koordinaten (0-1)
   */
  normalizeDistribution(distribution) {
    return distribution.map((value, index) => {
      const x = distribution.length > 1 
        ? index / (distribution.length - 1) 
        : 0; // 0-1
      const y = 1 - (value / 100); // invertiert, 0-1
      return { x, y };
    });
  }

  /**
   * Zeichnet eine Verteilung als Linie auf dem Canvas
   * @param {Array} distribution - Array von Werten (0-100)
   * @param {String} color - Farbe der Linie (default: "red")
   */
  drawDistribution(distribution, color = "red") {
    if (!distribution || distribution.length === 0) return;
    // compute layout same as drawAxes
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60; // matches drawAxes
    const plotW = right - left;
    const plotH = bottom - top;

    const N = distribution.length;
    
    // Im Zahlenmodus: Zuerst prüfen ob Distribution Zahlenwerte (0-20) sind und Histogram erstellen
    let displayValues = distribution;
    if (this.gameMode === "number" && N <= 50) {
      // Distribution sind rohe Zahlenwerte, erstelle Histogram
      const histogram = new Array(21).fill(0);
      distribution.forEach(v => {
        const val = Math.max(0, Math.min(20, Math.round(v)));
        histogram[val]++;
      });
      displayValues = histogram;
    }
    
    const M = displayValues.length;
    const maxY = this.gameMode === "number" ? (this.numberModeMaxY || 10) : Math.max(...displayValues, 1);
    
    for (let i = 0; i < M; i++) {
      const bw = plotW / M;
      const xCenter = left + (i + 0.5) / M * plotW;
      const x = Math.round(xCenter - bw / 2);
      const h = (displayValues[i] / maxY) * plotH;
      this.ctx.fillStyle = color === "red" ? "rgba(255,0,0,0.7)" : color;
      this.ctx.fillRect(x, Math.round(bottom - h), Math.max(1, Math.floor(bw) - 1), Math.round(h));
    }
    // Stil zurücksetzen
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 3;
  }

  /**
   * Zeichnet nur den höchsten und den niedrigsten Balken hervor
   * @param {Array} distribution - Array von Werten (0-100)
   * @param {number} highIdx - Index des höchsten Balkens
   * @param {number} lowIdx - Index des niedrigsten Balkens
   * @param {String} highColor - Farbe für höchsten Balken
   * @param {String} lowColor - Farbe für niedrigsten Balken
   */
  drawHighlight(distribution, highIdx = -1, lowIdx = -1, highColor = "rgba(0,200,0,0.95)", lowColor = "rgba(0,100,200,0.95)") {
    if (!distribution || distribution.length === 0) return;
    // compute layout same as drawAxes
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;

    const N = distribution.length;
    const maxY = Math.max(...distribution, 1);

    // Draw only the high and low bar (no other bars visible)
    const paintBarOnly = (idx, color) => {
      if (idx < 0 || idx >= N) return;
      const bw = plotW / N;
      const xCenter = left + (idx + 0.5) / N * plotW;
      const x = Math.round(xCenter - bw / 2);
      const h = (distribution[idx] / maxY) * plotH;
      this.ctx.save();
      // slightly thicker so it's clearly visible when isolated
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, Math.round(bottom - h), Math.max(3, Math.floor(bw) - 1), Math.round(h));
      // outline for better contrast
      this.ctx.strokeStyle = 'rgba(0,0,0,0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x, Math.round(bottom - h), Math.max(3, Math.floor(bw) - 1), Math.round(h));
      this.ctx.restore();
    };

    paintBarOnly(highIdx, highColor);
    paintBarOnly(lowIdx, lowColor);
  }

  /**
   * Zeichnet die gezeichnete Nutzer-Linie erneut (ohne sie zu löschen)
   */
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

  /**
   * Zeichnet eine kontinuierliche Linie, die die Mittelpunkte der Balken verbindet
   */
  drawContinuous(distribution, color = "blue") {
    if (!distribution || distribution.length === 0) return;
    const left = 50;
    const right = this.canvasWidth - 50;
    const top = 20;
    const bottom = this.canvasHeight - 60;
    const plotW = right - left;
    const plotH = bottom - top;

    // Im Zahlenmodus: Distribution sind Zahlenwerte, erstelle Histogram
    let displayValues = distribution;
    const N = distribution.length;
    if (this.gameMode === "number" && N <= 50) {
      const histogram = new Array(21).fill(0);
      distribution.forEach(v => {
        const val = Math.max(0, Math.min(20, Math.round(v)));
        histogram[val]++;
      });
      displayValues = histogram;
    }

    const M = displayValues.length;
    const maxY = this.gameMode === "number" ? (this.numberModeMaxY || 10) : Math.max(...displayValues, 1);

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

  /**
   * Zeichnet Achsen, die kontinuierliche Verteilungs-Linie und die Nutzer-Linie darauf
   */
  drawCombined(distribution) {
    this.drawAxes(distribution);
    // draw bars first (light gray)
    this.drawDistribution(distribution, 'rgba(200,200,200,0.95)');
    // draw continuous line over the bar midpoints in red
    this.drawContinuous(distribution, 'red');
    // draw the user's stroke on top for comparison
    this.drawUserStroke('black');
  }

  /**
   * Zeichnet eine Referenz-Verteilung (z.B. Ground-Truth als rote Linie)
   */
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

    // Stil wieder zurücksetzen
    this.ctx.strokeStyle = "black";
    this.ctx.lineWidth = 3;
  }

  /**
   * Zeichnet Achsen und eine Verteilung zusammen
   */
  visualize(distribution, color = "red") {
    this.drawAxes(distribution);
    this.drawDistribution(distribution, color);
  }

  /**
   * Löscht den Canvas (nur Achsen)
   */
  clear() {
    this.points = [];
    this.drawAxes(this.currentDistribution);
  }

  /**
   * Gibt normalisierte Punkte zurück (für Backend-Vergleich)
   */
  getNormalizedPoints() {
    return this.normalizePoints(this.points);
  }

  /**
   * Speichert die Zeichnung auf dem Backend
   */
  async save() {
    const normalized = this.getNormalizedPoints();

    await fetch("http://localhost:8000/submit-player-distribution", {
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

  /**
   * Konvertiert gezeichnete Canvas-Punkte zu Samples (0-100 Werte)
  * Erstellt 50 Samples aus den X-Y Koordinaten der Zeichnung
   */
  pointsToSamples() {
    if (this.points.length === 0) {
      return [];
    }

    // Erstelle 50 Bins (wie die 50 Blöcke im Spiel)
    const N = 50;
    const samples = [];

    // Dynamische Y-Achsen-Skalierung wie in drawAxes
    let maxY = 100;
    if (this.currentDistribution && this.currentDistribution.length > 0) {
      maxY = Math.max(...this.currentDistribution);
      if (maxY < 1) maxY = 1;
    } else if (this.savedMaxY) {
      maxY = this.savedMaxY;
    }
    const plotTop = 20;
    const plotHeight = 330; // wie in drawAxes

    // Teile X-Achse in N Abschnitte
    for (let i = 0; i < N; i++) {
      // Bereich für diesen Bin (X-Koordinaten)
      const xStart = 50 + (i / N) * 530;
      const xEnd = 50 + ((i + 1) / N) * 530;

      // Finde alle Punkte in diesem X-Bereich
      const pointsInBin = this.points.filter(p => p.x >= xStart && p.x < xEnd);

      if (pointsInBin.length > 0) {
        // Durchschnitt der Y-Werte in diesem Bin
        const avgY = pointsInBin.reduce((sum, p) => sum + p.y, 0) / pointsInBin.length;

        // Y in Plot-Koordinaten (0 = oben, plotHeight = unten)
        const yInPlot = Math.max(0, Math.min(plotHeight, avgY - plotTop));
        // Normiere auf 0–1 (invertiert)
        const yNorm = 1 - (yInPlot / plotHeight);
        // Skaliere auf aktuelle Y-Achsenhöhe
        const val = Math.round(yNorm * maxY);
        samples.push(Math.max(0, Math.min(100, val)));
      } else {
        // Leerer Bin = niedriger Wert
        samples.push(0);
      }
    }
    return samples;
  }

  /**
   * Setzt Pre-Reveal-Antworten für die Evaluation (nur Zahlenmodus)
   */
  setPreRevealAnswers(answers) {
    this.preRevealAnswers = answers;
  }

  /**
   * Evaluiert die Zeichnung gegen das Backend
   */
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
      console.log('Sending evaluation request with', samples.length, 'samples');
      
      const payload = {
        session_id: this.sessionId,
        samples: samples
      };
      
      // Im Zahlenmodus: Pre-Reveal-Antworten hinzufügen
      if (this.gameMode === "number" && this.preRevealAnswers) {
        payload.pre_reveal_answers = this.preRevealAnswers;
        console.log('Including pre-reveal answers:', this.preRevealAnswers);
      }
      
      const res = await fetch("http://localhost:3000/submit-player-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log('Backend response:', data);

      if (data.status === "ok") {
        // Unterschiedliche Felder für Farbmodus vs. Zahlenmodus
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
        
        // Message abhängig vom Modus
        if (this.gameMode === "number") {
          result.message = `Score: ${data.score}% | MAE: ${data.mae?.toFixed(4) || 'N/A'}`;
        } else {
          result.message = `Score: ${data.score}% | MAE: ${data.mae?.toFixed(4) || 'N/A'} | MSE: ${data.mse?.toFixed(4) || 'N/A'}`;
        }
        
        return result;
      } else {
        console.error('Evaluation error:', data);
        alert('Fehler bei der Evaluierung: ' + (data.message || data.error || 'Unbekannter Fehler'));
        return null;
      }
    } catch (e) {
      console.error('Evaluation fetch failed:', e);
      alert('Fehler beim Kontakt mit dem Server: ' + e.message);
      return null;
    }
  }

  /**
   * Setzt den Visualizer in Read-Only Mode (nur Anzeige)
   */
  setReadOnly(isReadOnly = true) {
    this.isReadOnly = isReadOnly;
    this.canvas.style.cursor = isReadOnly ? "default" : "crosshair";
  }

  /**
   * Setzt den Visualizer in Zeichnungs-Mode (interaktiv)
   */
  setDrawMode(isDrawMode = true) {
    this.setReadOnly(!isDrawMode);
  }
}

