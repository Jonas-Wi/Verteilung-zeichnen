/**
 * BalloonSpawner
 * Verwaltet das Spawnen von Ballons basierend auf der Verteilung vom Backend.
 * Jeder Block (Index 0-49) hat eine zugehörige Häufigkeit in der Verteilung.
 */
export class BalloonSpawner {
  /**
   * Constructor
   * @param {Array<number>} distribution - Array von n Werten (0-100 für Farbmodus, 0-20 für Zahlenmodus)
   */
  constructor(distribution) {
    this.distribution = distribution || [];
    this.blockCount = 0;
    this.blockColors = null; // expanded per-block color values
    this.blockSpawned = new Set(); // Track welche Blöcke bereits gespawnt haben
  }

  /**
   * Gibt den Ballonwert zurück, der für einen Block spawnen soll
   * Jeder Block spawnt GENAU einen Ballon mit seinem Verteilungswert
  * @param {number} blockIndex - Index des Blocks (0 bis n-1)
  * @returns {number} Der Wert für diesen Block
   */
  getBalloonsForBlock(blockIndex) {
    if (blockIndex < 0) {
      console.warn('Invalid block index:', blockIndex);
      return this.distribution.length > 0 ? this.distribution[0] : 0;
    }

    // If we have prepared per-block colors, use them
    if (this.blockColors && blockIndex < this.blockColors.length) {
      return this.blockColors[blockIndex];
    }

    // Fallback: Direkter Wert aus Distribution
    if (this.distribution && blockIndex < this.distribution.length) {
      return this.distribution[blockIndex];
    }

    // Fallback: Mittelwert der Verteilung oder 0
    if (this.distribution && this.distribution.length > 0) {
      return this.distribution.reduce((a, b) => a + b, 0) / this.distribution.length;
    }
    return 0; // default
  }

  /**
   * Prepare per-block colors from distribution when blockCount known
   * Unterscheidet zwischen Farbmodus (Histogram) und Zahlenmodus (direkte Werte)
   */
  prepare(blockCount) {
    this.blockCount = blockCount || this.blockCount;
    if (!this.blockCount || this.blockCount <= 0) return;

    const dist = this.distribution || [];
    
    // Wenn Distribution bereits die richtige Länge hat, nutze sie direkt
    if (dist.length === this.blockCount) {
      this.blockColors = dist.slice(); // Direkte Kopie der Werte
      return;
    }

    const sum = dist.reduce((s, v) => s + (Number(v) || 0), 0);
    // if distribution looks like percentages (sums to ~100)
    if (Math.abs(sum - 100) < 1e-6 || (sum > 0 && Math.abs(sum - 100) < 5)) {
      // compute counts per bin
      const counts = dist.map(v => Math.round((v / 100) * this.blockCount));
      // adjust rounding errors
      let total = counts.reduce((a, b) => a + b, 0);
      let i = 0;
      while (total < this.blockCount) {
        counts[i % counts.length]++;
        total++;
        i++;
      }
      while (total > this.blockCount) {
        const j = i % counts.length;
        if (counts[j] > 0) { counts[j]--; total--; }
        i++;
      }
      // expand to blockColors: map bin index to grayscale value
      const vals = [];
      for (let b = 0; b < dist.length; b++) {
        vals.push(Math.round((b / Math.max(1, dist.length - 1)) * 100));
      }
      // distribute colors deterministically (round-robin) to avoid clustering
      const colors = [];
      const remaining = counts.slice();
      while (colors.length < this.blockCount) {
        let filledOne = false;
        for (let b = 0; b < dist.length && colors.length < this.blockCount; b++) {
          if (remaining[b] > 0) {
            colors.push(vals[b]);
            remaining[b]--;
            filledOne = true;
          }
        }
        if (!filledOne) break;
      }
      // if colors length less/more, adjust
      if (colors.length < this.blockCount) {
        // Fülle mit Mittelwert
        const mean = dist.length > 0 ? dist.reduce((a, b) => a + b, 0) / dist.length : 0;
        while (colors.length < this.blockCount) colors.push(mean);
      } else if (colors.length > this.blockCount) {
        colors.length = this.blockCount;
      }
      // Shuffle colors so colored boxes are randomly distributed across the grid
      for (let i = colors.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = colors[i];
        colors[i] = colors[j];
        colors[j] = tmp;
      }
      this.blockColors = colors;
      return;
    }

    // Fallback: create uniform mid-gray
    // Fallback: Fülle mit Mittelwert
    const mean = dist.length > 0 ? dist.reduce((a, b) => a + b, 0) / dist.length : 0;
    this.blockColors = new Array(this.blockCount).fill(mean);
  }

  /**
   * Alternative: Normalisierte Interpretation
   * Nutzt den Wert direkt als Wahrscheinlichkeit
  * @param {number} blockIndex - Index des Blocks (0-49)
  * @returns {Array<number>} Array von Ballonwerten
   */
  getBalloonsForBlockNormalized(blockIndex) {
    if (blockIndex < 0 || blockIndex >= this.distribution.length) {
      return [];
    }

    const value = this.distribution[blockIndex]; // 0-100
    const normalized = value / 100; // 0-1

    // Schwellenwerte für Ballons
    // 0.0-0.3: 0 Ballons
    // 0.3-0.7: 1 Ballon
    // 0.7-1.0: 2 Ballons
    
    if (normalized < 0.3) {
      return [];
    } else if (normalized < 0.7) {
      return [value];
    } else {
      return [value, Math.max(0, value - 20)];
    }
  }

  /**
   * Berechnet Ballons basierend auf Wahrscheinlichkeit
   * @param {number} blockIndex - Index des Blocks
   * @returns {Array<number>} Array von Ballonwerten
   */
  getBalloonsForBlockProbabilistic(blockIndex) {
    if (blockIndex < 0 || blockIndex >= this.distribution.length) {
      return [];
    }

    const value = this.distribution[blockIndex]; // 0-100
    const random = Math.random() * 100; // 0-100

    // Je höher der Wert, desto wahrscheinlicher mehr Ballons
    if (random < value * 0.5) {
      return [value, Math.max(0, value - 20)]; // 2 Ballons
    } else if (random < value) {
      return [value]; // 1 Ballon
    } else {
      return []; // Keine Ballons
    }
  }

  /**
   * Setzt einen Block auf "gespawnt" um zu tracken
   */
  markBlockSpawned(blockIndex) {
    this.blockSpawned.add(blockIndex);
  }

  /**
   * Gibt an, ob ein Block bereits gespawnt hat
   */
  hasBlockSpawned(blockIndex) {
    return this.blockSpawned.has(blockIndex);
  }

  /**
   * Resetet den Spawned-Tracker
   */
  reset() {
    this.blockSpawned.clear();
  }
}
