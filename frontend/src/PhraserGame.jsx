import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import { DistributionVisualizer } from "./DistributionVisualizer";
import { BalloonSpawner } from "./BalloonSpawner";

export default function PhaserGame({ sessionId, level, onGameEnd, onRestartGame, showNumbers = false, gameMode = "color" }) {
  const gameRef = useRef(null);
  const gameInstanceRef = useRef(null);
  const canvasRef = useRef(null);
  const visualizerRef = useRef(null);
  const distributionRef = useRef(null); // Speichere Distribution stabil
  
  const [gameActive, setGameActive] = useState(true);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [blockMode, setBlockMode] = useState(false);

  // New states for pre-reveal questioning and flow control
  const [preRevealStage, setPreRevealStage] = useState(null); // null | 'askColor' | 'askPercent' | 'askPeakValue' | 'askPeakFrequency' | 'askAdditionalPeaks' | 'showHighlight' | 'ready'
  const [guessColor, setGuessColor] = useState(null); // 'white' or 'black'
  const [guessPercent, setGuessPercent] = useState(null);
  const [percentInput, setPercentInput] = useState('');
  
  // States for number mode questions
  const [guessPeakValue, setGuessPeakValue] = useState(null); // 0-20
  const [guessPeakFrequency, setGuessPeakFrequency] = useState(null);
  const [peakValueInput, setPeakValueInput] = useState('');
  const [peakFrequencyInput, setPeakFrequencyInput] = useState('');
  
  // Zusätzliche Peaks
  const [additionalPeaks, setAdditionalPeaks] = useState([]); // Array von {value, frequency}
  const [additionalValueInput, setAdditionalValueInput] = useState('');
  const [additionalFreqInput, setAdditionalFreqInput] = useState('');

  // Use ref to make gameMode accessible in Phaser Scene
  const gameModeRef = useRef(gameMode);
  
  useEffect(() => {
    gameModeRef.current = gameMode;
  }, [gameMode]);

  useEffect(() => {
    const WIDTH = 800;
    const HEIGHT = 600;

    async function ensureDistribution() {
      if (!sessionId) return;
      try {
        const res = await fetch(`http://localhost:3000/get-distribution/${sessionId}?source=generated`);
        const js = await res.json();
        if (js && js.distribution && js.distribution.samples) {
          distributionRef.current = js.distribution.samples;
        }
      } catch (e) {
        console.warn('Failed to fetch generated distribution', e);
      }
    }

    class MainScene extends Phaser.Scene {
      constructor() {
        super({ key: "MainScene" });
        this.timer = 5; // Sekunden
        this.distribution = null; // Ground-Truth Verteilung
        this.blockValues = []; // pro-Block Werte
        this.balloonSpawner = null; // BalloonSpawner basierend auf Distribution
        this.blockIndexMap = new Map(); // Map Block -> Block Index (0-39)
        this.gameMode = null; // wird in create() gesetzt
      }

      preload() {}

      create() {
        this.cameras.main.setBackgroundColor(0xf0f0f0);
        
        // gameMode von React Component übernehmen
        this.gameMode = gameModeRef.current;

        // Physik-Welt
        this.physics.world.setBounds(0, 0, WIDTH, HEIGHT);

        // Schieber (Paddle) - knallrot, damit er hervorsteht
        this.paddle = this.add.rectangle(WIDTH / 2, HEIGHT - 40, 120, 16, 0xFF0000);
        this.physics.add.existing(this.paddle, false);
        this.paddle.body.setImmovable(true);
        this.paddle.body.setCollideWorldBounds(true);

        // Ball (knallrot, passend zum Paddle)
        this.ball = this.add.circle(WIDTH / 2, HEIGHT - 80, 8, 0xFF0000);
        this.physics.add.existing(this.ball);
        this.ball.body.setBounce(1.05, 1.05);
        this.ball.body.setCollideWorldBounds(false); // Keine Weltgrenzen, verwenden eigene Wände
        this.ball.body.setVelocity(300, -500);

        // Wände für oben, links, rechts (NICHT unten) erstellen
        const wallGroup = this.physics.add.staticGroup();
        // obere Wand
        const topWall = this.add.rectangle(WIDTH / 2, -10, WIDTH + 20, 20);
        this.physics.add.existing(topWall, true);
        wallGroup.add(topWall);
        // linke Wand
        const leftWall = this.add.rectangle(-10, HEIGHT / 2, 20, HEIGHT + 20);
        this.physics.add.existing(leftWall, true);
        wallGroup.add(leftWall);
        // rechte Wand
        const rightWall = this.add.rectangle(WIDTH + 10, HEIGHT / 2, 20, HEIGHT + 20);
        this.physics.add.existing(rightWall, true);
        wallGroup.add(rightWall);
        // Ball mit Wänden kollidieren lassen
        this.physics.add.collider(this.ball, wallGroup);

        // Separater Boden: nur für Ballons, damit der Ball weiterhin durchfallen kann
        const bottomWall = this.add.rectangle(WIDTH / 2, HEIGHT + 10, WIDTH + 20, 20);
        this.physics.add.existing(bottomWall, true);
        const bottomGroup = this.physics.add.staticGroup();
        bottomGroup.add(bottomWall);

        // Kästchen-Gruppe VOR Generierung erstellen
        this.blocksGroup = this.physics.add.staticGroup();

        // Kollisionen
        this.physics.add.collider(this.ball, this.paddle, this.handlePaddleBounce, null, this);

        // Verteilung von Backend übernehmen und Kästchen generieren
        this.distribution = distributionRef.current || [];
        // Initialisiere BalloonSpawner mit der Distribution (prepare after blocks created)
        this.balloonSpawner = new BalloonSpawner(this.distribution);
        this.createBlocks();

        // Gruppe / Liste für Ballons, damit wir Anzahl begrenzen und Labels verfolgen können
        this.balloonsList = [];
        this.balloonsGroup = this.physics.add.group();

        // Ballons mit Boden kollidieren lassen (verhindert Herausfallen)
        // Callback sorgt dafür, dass Ballons beim Aufprall wieder nach oben geschossen werden
        this.physics.add.collider(this.balloonsGroup, bottomGroup, (balloon, bottom) => {
          try {
              // moderate Rückstöße (zwischen vorher und aktuell)
              const base = Phaser.Math.Between(360, 480);
              const mod = Math.round((balloon.__value !== undefined ? (100 - balloon.__value) : 50) * 0.35);
              // setze Y-Geschwindigkeit nach oben, damit Ballon hochspringt (etwa Mitte zwischen vorher und vorheriger Erhöhung)
              balloon.body.setVelocityY(-Math.max(300, base - mod));
              // leichte Drehung / horizontalen Impuls zufügen
              balloon.body.setVelocityX(Phaser.Math.Between(-80, 80));
              // etwas geringerer Bounce als zuletzt gesetzt
              balloon.body.setBounce(0.94);
          } catch (e) {
            // ignore
          }
        });

        // Ballons sollen auch an den Seitenwänden abprallen
        this.physics.add.collider(this.balloonsGroup, wallGroup);

        // Kästchen-Kollision hinzufügen
        this.physics.add.collider(this.ball, this.blocksGroup, this.handleBlockCollision, null, this);

        // Timer-HUD
        this.timerText = this.add.text(10, 10, `Zeit: ${this.timer}`, { font: "18px Arial", fill: "#000" }).setDepth(10);
        this.timeEvent = this.time.addEvent({ delay: 1000, callback: this.onTick, callbackScope: this, loop: true });

        // Endspiel-Flag
        this.ended = false;

        // Maussteuerung
        this.input.on('pointermove', pointer => {
          this.paddle.x = Phaser.Math.Clamp(pointer.x, 60, WIDTH - 60);
          this.paddle.body.x = this.paddle.x - this.paddle.width/2;
        });

        // Tastatursteuerung
        this.cursors = this.input.keyboard.createCursorKeys();
      }

      update() {
        if (this.ended) return;

        // Tastatur-Schieber-Bewegung
        if (this.cursors.left.isDown) {
          this.paddle.x -= 6;
          this.paddle.body.x = this.paddle.x - this.paddle.width/2;
        } else if (this.cursors.right.isDown) {
          this.paddle.x += 6;
          this.paddle.body.x = this.paddle.x - this.paddle.width/2;
        }
        // Wenn Ball unter dem Bildschirm: nach 1 Sekunde zurücksetzen
        if (this.ball.y > this.scale.height - 20 && !this.ball.__resetting) {
          this.ball.__resetting = true;
          this.time.delayedCall(1000, () => {
            if (!this.ended) {
              this.ball.x = this.paddle.x;
              this.ball.y = this.paddle.y - 30;
              this.ball.body.setVelocity(0, -500);
              this.ball.__resetting = false;
            }
          });
        }

        // Labels (Zahlen) folgen ihren Ballons, falls vorhanden
        if (this.balloonsList && this.balloonsList.length) {
          for (let b of this.balloonsList) {
            if (!b || !b.body) continue;
            if (b.__label) {
              b.__label.x = b.x - 10;
              b.__label.y = b.y - 8;
            }
          }
        }
      }

      handlePaddleBounce(ball, paddle) {
        const diff = ball.x - paddle.x;
        ball.body.setVelocityX(8 * diff);
      }

      handleBlockCollision(ball, block) {
        const blockIndex = this.blockIndexMap.get(block) || 0;
        const spawnX = block.x;
        const spawnY = block.y;

        // Kästchen zerstören
        block.destroy();

        // Nutze BalloonSpawner um den Ballonwert zu bestimmen
        // Jeder Block spawnt GENAU einen Ballon mit seinem Verteilungswert
        const balloonValue = this.balloonSpawner.getBalloonsForBlock(blockIndex);
        this.spawnBalloon(spawnX, spawnY, balloonValue);
      }


      createBlocks() {
        // Gitter 5 Reihen x 10 Spalten => 50 Kästchen
        const rows = 5;
        const cols = 10;
        // Kästchen-Bereich kleiner machen, damit Ball außen vorbei kann
        const blockW = Math.floor((800 - 2 * 80 - (cols - 1) * 6) / cols); // 80px Rand links/rechts, 8px Abstand
        const blockH = Math.floor((180 - 2 * 20 - (rows - 1) * 6) / rows); // 180px Höhe für Blöcke
        const startX = 80 + blockW / 2;
        const startY = 40 + blockH / 2;

        this.blocks = [];
        let sampleIndex = 0;

        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            const x = startX + c * (blockW + 6);
            const y = startY + r * (blockH + 6);

            const color = 0x888888;
            const rect = this.add.rectangle(x, y, blockW, blockH, color).setOrigin(0.5, 0.5);
            this.physics.add.existing(rect, true);
            this.blocksGroup.add(rect);

            // Wert aus Verteilung zu Kästchen zuordnen
            const value = this.distribution[sampleIndex % this.distribution.length];
            rect.__balloonValue = value;

            this.blocks.push(rect);
            this.blockIndexMap.set(rect, sampleIndex);
            sampleIndex++;
          }
        }
        // Prepare balloon spawner now that we know exact block count
        const total = rows * cols;
        if (this.balloonSpawner && typeof this.balloonSpawner.prepare === 'function') {
          this.balloonSpawner.prepare(total);
        }
      }

      spawnBalloon(x, y, value) {
        // Im Zahlenmodus: value ist bereits 0-20
        // Im Farbmodus: value ist 0-100, repräsentiert Grauton
        let colorHex, displayValue;
        
        if (this.gameMode === "number") {
          // Zahlenmodus: Alle Ballons gleiche Farbe (z.B. gelb), zeige Zahl
          colorHex = 0xFFD700; // Gold/Gelb
          displayValue = Math.round(value); // Wert 0-20
        } else {
          // Farbmodus: Grauton-Zuordnung: 0 -> weiß (255), 100 -> schwarz (0)
          const shade = 255 - Math.round((value / 100) * 255);
          colorHex = (shade << 16) | (shade << 8) | shade;
          displayValue = Math.round(value); // Wert 0-100
        }

        const radius = 12 + Math.random() * 8;
        const balloon = this.add.ellipse(x, y, radius * 2, radius * 2, colorHex).setStrokeStyle(2, 0x222222);
        this.physics.add.existing(balloon);

        // moderater Anfangsimpuls (Mittelwert zwischen vorher und vorheriger Erhöhung)
        balloon.body.setVelocity(Phaser.Math.Between(-50, 50), Phaser.Math.Between(-220, -120));
        // moderater Rückprall
        balloon.body.setBounce(0.92);
        // Am Welt-Rand (inkl. Boden) abprallen
        balloon.body.setCollideWorldBounds(true);

        balloon.__value = value;

        // Label: im Zahlenmodus IMMER anzeigen, im Farbmodus nur wenn showNumbers=true
        if (this.gameMode === "number" || showNumbers) {
          const lbl = this.add.text(x - 10, y - 8, String(displayValue), { 
            font: this.gameMode === "number" ? '14px Arial bold' : '12px Arial', 
            fill: this.gameMode === "number" ? '#000' : '#000'
          }).setDepth(9);
          balloon.__label = lbl;
        }

        // Zur Gruppe / Liste hinzufügen
        this.balloonsGroup.add(balloon);
        this.balloonsList.push(balloon);

        // Begrenze Ballonanzahl: lösche älteste, wenn > 50
        const MAX_BALLOONS = 50;
        while (this.balloonsList.length > MAX_BALLOONS) {
          const old = this.balloonsList.shift();
          try {
            if (old.__label) old.__label.destroy();
          } catch (e) {}
          try { old.destroy(); } catch (e) {}
        }
      }

      onTick() {
        this.timer -= 1;
        this.timerText.setText(`Time: ${this.timer}`);
        if (this.timer <= 0 && !this.ended) {
          this.endGame();
        }
      }

      endGame() {
        this.ended = true;
        this.physics.pause();
        this.timeEvent.remove(false);

        // Verteilung speichern (ref bleibt stabil)
        distributionRef.current = this.distribution;
        setGameActive(false);

        // Ground-Truth-Verteilung an Parent übergeben
        if (onGameEnd && typeof onGameEnd === 'function') {
          onGameEnd({ distribution: this.distribution });
        }
      }
    }

    (async () => {
      await ensureDistribution();

      const config = {
        type: Phaser.AUTO,
        width: WIDTH,
        height: HEIGHT,
        parent: gameRef.current,
        backgroundColor: '#f0f0f0',
        physics: { default: 'arcade', arcade: { gravity: { y: 300 }, debug: false } },
        scene: [MainScene],
      };

      // Altes Spiel zerstören, falls vorhanden
      if (gameInstanceRef.current) {
        try { gameInstanceRef.current.destroy(true); } catch (e) {}
      }

      const game = new Phaser.Game(config);
      gameInstanceRef.current = game;
    })();

    return () => {
      try { gameInstanceRef.current?.destroy(true); } catch (e) {}
      gameInstanceRef.current = null;
    };
  }, [sessionId, level, onGameEnd, showNumbers, gameMode]);

  // Effect zum Initialisieren des Visualizers, wenn Spiel endet
  useEffect(() => {
    if (!gameActive && distributionRef.current && canvasRef.current) {
      if (!visualizerRef.current) {
        visualizerRef.current = new DistributionVisualizer(canvasRef.current, sessionId, gameMode);
        visualizerRef.current.setDrawMode(false); // initially locked until questioning done
        visualizerRef.current.setBlockMode?.(blockMode);
        visualizerRef.current.drawAxes(distributionRef.current);
      } else {
        visualizerRef.current.gameMode = gameMode;
        visualizerRef.current.setDrawMode?.(false);
        visualizerRef.current.setBlockMode?.(blockMode);
        visualizerRef.current.drawAxes(distributionRef.current);
      }
      // Start the pre-reveal question flow
      if (gameMode === "color") {
        setPreRevealStage('askColor');
      } else if (gameMode === "number") {
        // Im Zahlenmodus: Frage nach Peak-Wert und Häufigkeit
        setPreRevealStage('askPeakValue');
      } else {
        setPreRevealStage('ready');
        visualizerRef.current.setDrawMode(true);
      }
      setGuessColor(null);
      setGuessPercent(null);
      setPercentInput('');
      setGuessPeakValue(null);
      setGuessPeakFrequency(null);
      setPeakValueInput('');
      setPeakFrequencyInput('');
      setAdditionalPeaks([]);
      setAdditionalValueInput('');
      setAdditionalFreqInput('');
    }
  }, [gameActive, sessionId, blockMode, gameMode]);

  // --- Handlers für Vorab-Fragen & Highlight-Folge ---
  function handleSubmitColor(choice) {
    setGuessColor(choice);
    setPreRevealStage('askPercent');
  }

  // Handler für Zahlenmodus: Peak-Wert Eingabe
  function handleSubmitPeakValue() {
    const val = Number(peakValueInput);
    if (!Number.isFinite(val) || val < 0 || val > 20) {
      alert('Bitte gib einen gültigen Wert zwischen 0 und 20 an.');
      return;
    }
    setGuessPeakValue(val);
    setPreRevealStage('askPeakFrequency');
  }

  // Handler für Zahlenmodus: Peak-Häufigkeit Eingabe
  function handleSubmitPeakFrequency() {
    const freq = Number(peakFrequencyInput);
    if (!Number.isFinite(freq) || freq < 0) {
      alert('Bitte gib eine gültige Häufigkeit an (mindestens 0).');
      return;
    }
    setGuessPeakFrequency(freq);
    
    // Gehe zur Frage nach zusätzlichen Peaks
    setPreRevealStage('askAdditionalPeaks');
  }

  // Handler: Zusätzlichen Peak hinzufügen
  function handleAddAdditionalPeak() {
    const val = Number(additionalValueInput);
    const freq = Number(additionalFreqInput);
    
    if (!Number.isFinite(val) || val < 0 || val > 20) {
      alert('Bitte gib einen gültigen Wert zwischen 0 und 20 an.');
      return;
    }
    if (!Number.isFinite(freq) || freq < 0) {
      alert('Bitte gib eine gültige Häufigkeit an.');
      return;
    }
    
    setAdditionalPeaks([...additionalPeaks, { value: val, frequency: freq }]);
    setAdditionalValueInput('');
    setAdditionalFreqInput('');
  }

  // Handler: Fertig mit zusätzlichen Peaks
  function handleFinishAdditionalPeaks() {
    // Zeige alle Orientierungspunkte UND die tatsächlichen Werte im Diagramm
    if (visualizerRef.current && distributionRef.current) {
      visualizerRef.current.drawAxes(distributionRef.current);
      
      // Sammle alle Peak-Werte
      const allPeakValues = [guessPeakValue, ...additionalPeaks.map(p => p.value)];
      
      // Sammle alle Peaks mit Häufigkeiten
      const allPeaks = [
        { value: guessPeakValue, frequency: guessPeakFrequency },
        ...additionalPeaks
      ];
      
      // Speichere Pre-Reveal-Antworten für die Evaluation
      visualizerRef.current.setPreRevealAnswers({
        peak_value: guessPeakValue,
        peak_frequency: guessPeakFrequency,
        additional_peaks: additionalPeaks
      });
      
      // Zeichne ZUERST die tatsächlichen Balken für die angegebenen Werte (Ground Truth)
      visualizerRef.current.drawTruthBarsForValues(distributionRef.current, allPeakValues);
      
      // Zeichne DANACH die Spieler-Orientierungspunkte (Schätzungen) - damit sie oben sind
      visualizerRef.current.drawMultiplePeakMarkers(allPeaks);
    }
    
    // Erlaube Zeichnen
    setPreRevealStage('ready');
    visualizerRef.current?.setDrawMode(true);
  }

  // Helper: compute highest index and the lowest index among bars >= minLowPercent
  function computeHighLowIndices(dist, minLowPercent = 3) {
    if (!dist || dist.length === 0) return { highIdx: -1, lowIdx: -1 };
    let highIdx = 0;
    for (let i = 0; i < dist.length; i++) {
      if (dist[i] > dist[highIdx]) highIdx = i;
    }
    // candidates with at least minLowPercent
    const candidates = [];
    for (let i = 0; i < dist.length; i++) {
      if (Number(dist[i]) >= minLowPercent) candidates.push(i);
    }
    let lowIdx = -1;
    if (candidates.length > 0) {
      lowIdx = candidates[0];
      for (let idx of candidates) {
        if (dist[idx] < dist[lowIdx]) lowIdx = idx;
      }
    } else {
      // fallback to global minimum if no candidate
      lowIdx = 0;
      for (let i = 0; i < dist.length; i++) {
        if (dist[i] < dist[lowIdx]) lowIdx = i;
      }
    }
    return { highIdx, lowIdx };
  }

  function handleSubmitPercent() {
    const p = Number(percentInput);
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      alert('Bitte gib eine gültige Prozentzahl zwischen 0 und 100 an.');
      return;
    }
    setGuessPercent(p);

    // Show only the highest and the lowest (with at least 3%) bars immediately, then allow the player to draw
    const dist = distributionRef.current;
    if (dist && visualizerRef.current) {
      const { highIdx, lowIdx } = computeHighLowIndices(dist, 3);
      visualizerRef.current.drawAxes(dist);
      visualizerRef.current.drawHighlight(dist, highIdx, lowIdx, 'rgba(0,200,0,0.95)', 'rgba(0,100,200,0.95)');
    }

    // Now let the player draw; do NOT reveal the full distribution yet
    setPreRevealStage('ready');
    visualizerRef.current?.setDrawMode(true);
  }

  function runHighlightSequence() {
    const dist = distributionRef.current;
    if (!dist || !visualizerRef.current) return;

    // compute indices for highest and lowest bar (low requires >= 3%)
    const { highIdx, lowIdx } = computeHighLowIndices(dist, 3);

    // Draw axes and highlight bars
    visualizerRef.current.drawAxes(dist);
    visualizerRef.current.drawHighlight(dist, highIdx, lowIdx, 'rgba(0,200,0,0.95)', 'rgba(0,100,200,0.95)');

    // After a short delay, reveal the full distribution and enable drawing
    setTimeout(() => {
      // Show full distribution as in combined view (bars + continuous line)
      visualizerRef.current.drawCombined(dist);
      // Enable drawing after reveal
      visualizerRef.current.setDrawMode(true);
      setPreRevealStage('ready');
    }, 1500);
  }

  return (
    <div>
      {gameActive ? (
        <div ref={gameRef} className="mx-auto" style={{ width: 800, height: 600 }} />
      ) : (
        <div className="mx-auto">
          <h2 className="text-center text-xl font-bold mb-4">
            {gameMode === "number" ? "Zeichne die Zahlenverteilung (0-20)" : "Zeichne die Verteilung"}
          </h2>
          <div className="flex flex-col items-center">
            <div className="mb-2">
              <button
                onClick={() => setBlockMode((b) => !b)}
                className={`px-4 py-2 rounded ${blockMode ? 'bg-yellow-500 text-white' : 'bg-gray-300 text-gray-800'} mr-2`}
              >
                {blockMode ? 'Block-Modus: AN' : 'Block-Modus: AUS'}
              </button>
              <span className="text-sm text-gray-600">{blockMode ? 'Bereich verschieben/strecken' : 'Frei zeichnen'}</span>
            </div>

            {/* Pre-reveal questions and highlight flow */}
            {preRevealStage && preRevealStage !== 'ready' && preRevealStage !== 'revealDone' && (
              <div className="mb-3 p-3 bg-white border-2 border-gray-300 rounded-lg max-w-md text-gray-800">
                {/* Farbmodus-Fragen */}
                {preRevealStage === 'askColor' && (
                  <div>
                    <div className="font-bold mb-2">Was denkst du: Mehr weiße oder mehr schwarze Ballons?</div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSubmitColor('white')} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">Mehr weiße</button>
                      <button onClick={() => handleSubmitColor('black')} className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900">Mehr schwarze</button>
                    </div>
                  </div>
                )}

                {preRevealStage === 'askPercent' && (
                  <div>
                    <div className="font-bold mb-2">Wie viel Prozent denkst du hat der Ballon, dessen Färbung am häufigsten auftrat (0-100)?</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={percentInput}
                        onChange={(e) => setPercentInput(e.target.value)}
                        className="px-3 py-2 border rounded w-28"
                      />
                      <button onClick={handleSubmitPercent} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Bestätigen</button>
                    </div>
                  </div>
                )}

                {/* Zahlenmodus-Fragen */}
                {preRevealStage === 'askPeakValue' && (
                  <div>
                    <div className="font-bold mb-2">Welchen Zahlenwert hast du am häufigsten gesehen? (0-20)</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={peakValueInput}
                        onChange={(e) => setPeakValueInput(e.target.value)}
                        className="px-3 py-2 border rounded w-28"
                        placeholder="z.B. 12"
                      />
                      <button onClick={handleSubmitPeakValue} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Weiter</button>
                    </div>
                  </div>
                )}

                {preRevealStage === 'askPeakFrequency' && (
                  <div>
                    <div className="font-bold mb-2">Wie oft (ungefähr) kam der Wert {guessPeakValue} vor?</div>
                    <div className="text-sm text-gray-600 mb-2">Tipp: Es gab insgesamt 50 Ballons</div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={peakFrequencyInput}
                        onChange={(e) => setPeakFrequencyInput(e.target.value)}
                        className="px-3 py-2 border rounded w-28"
                        placeholder="z.B. 8"
                      />
                      <button onClick={handleSubmitPeakFrequency} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Weiter</button>
                    </div>
                  </div>
                )}

                {/* Zusätzliche Peaks */}
                {preRevealStage === 'askAdditionalPeaks' && (
                  <div>
                    <div className="font-bold mb-2">Hast du noch andere Zahlenwerte häufig gesehen?</div>
                    <div className="text-sm text-gray-600 mb-3">Gib weitere markante Werte an (optional)</div>
                    
                    {/* Liste der bereits hinzugefügten Peaks */}
                    {additionalPeaks.length > 0 && (
                      <div className="mb-3 p-2 bg-gray-100 rounded">
                        <div className="text-sm font-semibold mb-1">Hinzugefügt:</div>
                        {additionalPeaks.map((peak, idx) => (
                          <div key={idx} className="text-sm">
                            • Wert {peak.value}: {peak.frequency}x
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Eingabe für weiteren Peak */}
                    <div className="flex items-center gap-2 mb-2">
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={additionalValueInput}
                        onChange={(e) => setAdditionalValueInput(e.target.value)}
                        className="px-3 py-2 border rounded w-20"
                        placeholder="Wert"
                      />
                      <input
                        type="number"
                        min={0}
                        max={50}
                        value={additionalFreqInput}
                        onChange={(e) => setAdditionalFreqInput(e.target.value)}
                        className="px-3 py-2 border rounded w-20"
                        placeholder="Anzahl"
                      />
                      <button 
                        onClick={handleAddAdditionalPeak} 
                        className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                      >
                        + Hinzufügen
                      </button>
                    </div>
                    
                    <button 
                      onClick={handleFinishAdditionalPeaks} 
                      className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 mt-2"
                    >
                      Fertig - Zum Zeichnen
                    </button>
                  </div>
                )}
              </div>
            )}

            <canvas 
              ref={canvasRef}
              width={530}
              height={370}
              className="mx-auto border-2 border-gray-300 bg-white cursor-crosshair"
            />
          </div>
          <div className="text-center mt-4 flex justify-center flex-wrap gap-2">
            {!evaluationResult ? (
              // Initial: show only Löschen and Evaluieren
              <>
                <button 
                  onClick={() => visualizerRef.current?.clear()}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Löschen
                </button>
                <button 
                  onClick={async () => {
                    // Prüfe ob etwas gezeichnet wurde
                    if (!visualizerRef.current?.hasDrawing()) {
                      alert('Bitte zeichne zuerst eine Verteilung!');
                      return;
                    }
                    
                    // Im Zahlenmodus: Prüfe ob Pre-Reveal-Fragen beantwortet wurden
                    if (gameMode === 'number' && preRevealStage !== 'ready' && preRevealStage !== 'revealDone') {
                      alert('Bitte beantworte erst alle Fragen bevor du evaluierst!');
                      return;
                    }

                    // First: reveal highest/lowest and then the true distribution if not already revealed
                    if (preRevealStage !== 'revealDone' && distributionRef.current && visualizerRef.current) {
                      const dist = distributionRef.current;
                      
                      // Im Farbmodus: Zeige Highlight-Balken
                      if (gameMode === 'color') {
                        const { highIdx, lowIdx } = computeHighLowIndices(dist, 3);
                        visualizerRef.current.drawAxes(dist);
                        visualizerRef.current.drawHighlight(dist, highIdx, lowIdx, 'rgba(0,200,0,0.95)', 'rgba(0,100,200,0.95)');
                        await new Promise((res) => setTimeout(res, 1500));
                      }
                      // Im Zahlenmodus: Marker + Truth Bars sind bereits sichtbar, zeige nur die volle Verteilung
                      
                      visualizerRef.current.drawCombined(dist);
                      visualizerRef.current.setReadOnly(true);
                      setPreRevealStage('revealDone');
                    }

                    // Then evaluate the player's drawing
                    const result = await visualizerRef.current?.evaluateDrawing();
                    if (result) {
                      console.log('📊 Evaluation result received:', result);
                      console.log('🎮 Current gameMode:', gameMode);
                      console.log('🎯 Has peak_value_score?', result.peak_value_score);
                      setEvaluationResult(result);
                      // ensure combined is shown and locked
                      visualizerRef.current?.drawCombined(distributionRef.current);
                      visualizerRef.current?.setReadOnly(true);
                    }
                  }}
                  disabled={!(preRevealStage === 'ready' || preRevealStage === 'revealDone')}
                  className={`px-4 py-2 rounded ${preRevealStage === 'ready' || preRevealStage === 'revealDone' ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 text-gray-600 opacity-50 cursor-not-allowed'}`}
                >
                  Evaluieren
                </button>
              </>
            ) : (
              // After evaluation: show only Referenz anzeigen and Spiel neu starten
              <>
                <button 
                  onClick={() => {
                    visualizerRef.current?.drawCombined(distributionRef.current);
                    // lock drawing when showing the reference
                    visualizerRef.current?.setReadOnly(true);
                  }}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
                >
                  Referenz anzeigen
                </button>
                <button 
                  onClick={() => {
                    distributionRef.current = null;
                    visualizerRef.current = null;
                    setGameActive(true);
                    setEvaluationResult(null);
                    if (onRestartGame) {
                      onRestartGame();
                    }
                  }}
                  className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
                >
                  Spiel neu starten
                </button>
              </>
            )}
          </div>
          {evaluationResult && (
            <div className="mt-6 p-4 bg-white border-2 border-gray-300 rounded-lg max-w-lg mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800">Auswertung</h3>
                <div className={`px-3 py-1 rounded-full text-sm font-semibold ${evaluationResult.passed ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                  {evaluationResult.passed ? 'Bestanden' : 'Nicht bestanden'}
                </div>
              </div>

              <div className="mb-3">
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold text-gray-800">{evaluationResult.score}%</div>
                  <div className="text-sm text-gray-600">Score</div>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded mt-2">
                  <div className="bg-blue-500 h-2 rounded" style={{ width: `${Math.max(0, Math.min(100, evaluationResult.score))}%` }} />
                </div>
              </div>

              <div className="space-y-2">
                {gameMode === "number" ? (
                  // Zahlenmodus: Pre-Reveal Scores + Verteilungsmetriken
                  <>
                    <div className="text-xs font-semibold text-gray-600 mt-3 mb-2">Pre-Reveal Antworten (30%)</div>
                    <MetricRow label="Peak-Wert Score" value={evaluationResult.peak_value_score} max={1} precision={3} color="bg-cyan-400" />
                    <MetricRow label="Peak-Häufigkeit Score" value={evaluationResult.peak_frequency_score} max={1} precision={3} color="bg-cyan-400" />
                    <MetricRow label="Zusätzliche Peaks Score" value={evaluationResult.additional_peaks_score} max={1} precision={3} color="bg-cyan-400" />
                    
                    <div className="text-xs font-semibold text-gray-600 mt-3 mb-2">Verteilungsmetriken (70%)</div>
                    <MetricRow label="MAE Score (30%)" value={evaluationResult.mae_score} max={1} precision={3} color="bg-yellow-400" />
                    <MetricRow label="Wasserstein Score (25%)" value={evaluationResult.wasserstein_score} max={1} precision={3} color="bg-red-400" />
                    <MetricRow label="Mean Error Score (15%)" value={evaluationResult.mean_error_score} max={1} precision={3} color="bg-green-400" />
                    
                    <div className="text-xs font-semibold text-gray-600 mt-3 mb-2">Rohe Metriken</div>
                    <MetricRow label="MAE" value={evaluationResult.mae} max={1} precision={4} color="bg-yellow-300" />
                    <MetricRow label="Wasserstein Distance" value={evaluationResult.wasserstein_distance} max={1} precision={4} color="bg-red-300" />
                    <MetricRow label="Abs. Mittelwertfehler" value={evaluationResult.abs_mean_error} max={20} precision={2} color="bg-green-300" suffix=" units" />
                  </>
                ) : (
                  // Farbmodus: Original Metriken
                  <>
                    <MetricRow label="MAE" value={evaluationResult.mae} max={1} precision={4} color="bg-yellow-400" />
                    <MetricRow label="MSE" value={evaluationResult.mse} max={1} precision={6} color="bg-orange-400" />
                    <MetricRow label="Wasserstein" value={evaluationResult.wasserstein} max={1} precision={4} color="bg-red-400" />
                    <MetricRow label="TVD" value={evaluationResult.tvd} max={1} precision={4} color="bg-purple-400" />
                    <MetricRow label="Abs. Mittelwertfehler" value={evaluationResult.abs_mean_error} max={100} precision={2} color="bg-green-400" suffix=" units" />
                    <MetricRow label="Abs. Std-Abweichung" value={evaluationResult.abs_std_error} max={100} precision={2} color="bg-indigo-400" suffix=" units" />
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Small presentational helper for metric rows
function MetricRow({ label, value, max = 1, precision = 3, color = 'bg-blue-400', suffix = '' }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) * 100 : 0;
  const display = Number.isFinite(value) ? value.toFixed(precision) : String(value);
  return (
    <div className="">
      <div className="flex justify-between text-sm text-gray-700 mb-1">
        <div>{label}</div>
        <div className="font-mono">{display}{suffix}</div>
      </div>
      <div className="w-full bg-gray-200 h-2 rounded">
        <div className={`${color} h-2 rounded`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
