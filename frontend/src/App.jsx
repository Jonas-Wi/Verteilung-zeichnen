import React, { useState, useRef, useEffect } from "react";
import PhaserGame from "./PhraserGame";

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  const [level, setLevel] = useState(1);
  const [showOverlay, setShowOverlay] = useState(false);
  const [groundTruth, setGroundTruth] = useState(null);
  const [maeResult, setMaeResult] = useState(null);
  const [gameMode, setGameMode] = useState("color"); // "color" oder "number"

  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [playerBins, setPlayerBins] = useState(() => new Array(101).fill(0));

  const startGame = async (mode = "color") => {
    try {
      const res = await fetch("http://localhost:3000/start-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          distribution_type: "normal",
          game_mode: mode
        }),
      });
      const json = await res.json();
      if (json.session_id) {
        setSessionId(json.session_id);
        setLevel(json.current_level || 1);
        setGameMode(json.game_mode || mode);
        setShowOverlay(false);
        setGroundTruth(null);
        setMaeResult(null);
        setPlayerBins(new Array(101).fill(0));
      }
    } catch (e) {
      console.error("Failed to start session:", e);
      alert("Failed to connect to backend. Make sure it's running on http://localhost:3000");
    }
  };

  useEffect(() => {
    drawCanvas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerBins, groundTruth]);

  function drawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // draw ground truth as gray bars (nicht-kumulierte Wahrscheinlichkeiten, z.B. 50 Werte)
    if (groundTruth && groundTruth.length > 0) {
      const N = groundTruth.length;
      const maxGT = Math.max(1, ...groundTruth);
      for (let i = 0; i < N; i++) {
        const bw = w / N;
        const bh = (groundTruth[i] / 100) * h * 0.9;
        const x = i * bw;
        ctx.fillStyle = `rgba(150,150,150,0.6)`;
        ctx.fillRect(x, h - bh, bw - 1, bh);
      }
    }

    // draw player line
    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const x = (i / 100) * w;
      const v = playerBins[i];
      const maxP = Math.max(1, ...playerBins);
      const y = h - (v / maxP) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = "#ffcc00";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  function histogramFromSamples(samples) {
    const bins = new Array(101).fill(0);
    samples.forEach(v => {
      const vi = Math.max(0, Math.min(100, Math.round(v)));
      bins[vi] += 1;
    });
    return bins;
  }

  function handleCanvasDown(e) {
    drawing.current = true;
    handleCanvasMove(e);
  }
  function handleCanvasUp() {
    drawing.current = false;
  }
  function handleCanvasMove(e) {
    if (!drawing.current) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = canvas.width;
    const h = canvas.height;
    let bin = Math.floor((x / w) * 101);
    bin = Math.max(0, Math.min(100, bin));
    
    const maxCount = 20;
    const value = Math.round(((h - y) / h) * maxCount);
    setPlayerBins(prev => {
      const next = prev.slice();
      next[bin] = value;
      return next;
    });
  }

  async function onGameEnd(payload) {
    // payload.distribution is an array of samples (0..100)
    setGroundTruth(payload.distribution || []);
    setShowOverlay(true);

    
    try {
      await fetch("http://localhost:3000/save-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, distribution: payload.distribution, source: "ground_truth" }),
      });
    } catch (e) {
      console.warn("save-distribution failed", e);
    }
  }

  function expandBinsToSamples(bins) {
    const samples = [];
    for (let i = 0; i <= 100; i++) {
      const count = Math.max(0, Math.min(50, Math.round(bins[i]))); 
      for (let k = 0; k < count; k++) samples.push(i);
    }
    return samples;
  }

  async function submitPlayerDistribution() {
    const samples = expandBinsToSamples(playerBins);
    try {
      const res = await fetch("http://localhost:3000/submit-player-distribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, samples }),
      });
      const json = await res.json();
      if (json.mae !== undefined) setMaeResult(json.mae);
      else setMaeResult(null);
    } catch (e) {
      console.warn(e);
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center">
      <h1 className="text-4xl font-bold mt-6">Perception Game</h1>

      {!sessionId && (
        <div className="mt-6 max-w-2xl text-center mx-auto px-4">
          <p className="mb-6 text-gray-200 text-lg">Wähle den Spielmodus:</p>
          
          <div className="flex flex-col gap-4 items-center">
            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-2">🎨 Farbverteilung</h3>
              <p className="text-sm text-gray-300 mb-4">Achten Sie auf die Farben der Ballons. Sie müssen die Verteilung der Grautöne zeichnen.</p>
              <button
                onClick={() => startGame("color")}
                className="w-full px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-700 transition"
              >
                Farbspiel starten
              </button>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full">
              <h3 className="text-xl font-bold mb-2">🔢 Zahlenverteilung</h3>
              <p className="text-sm text-gray-300 mb-4">Achten Sie auf die Zahlenwerte (0-20) der Ballons. Sie müssen die Verteilung der Zahlen nachbilden.</p>
              <button
                onClick={() => startGame("number")}
                className="w-full px-6 py-3 bg-green-600 rounded-xl hover:bg-green-700 transition"
              >
                Zahlenspiel starten
              </button>
            </div>
          </div>
        </div>
      )}

      {sessionId && (
        <div className="w-full max-w-4xl mt-6">
          <div className="mb-4 text-center">
            <div className="text-2xl">Level: {level}</div>
            <div className="text-sm text-gray-400">Modus: {gameMode === "number" ? "Zahlenverteilung (0-20)" : "Farbverteilung (Grautöne)"}</div>
          </div>
          <PhaserGame 
            sessionId={sessionId} 
            level={level}
            gameMode={gameMode}
            onGameEnd={onGameEnd}
            onRestartGame={() => startGame(gameMode)}
          />
        </div>
      )}


    </div>
  );
}
