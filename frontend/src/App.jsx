import React, { useState, useRef, useEffect } from "react";
import ColorGame from "./game/ColorGame";
import NumberGame from "./game/NumberGame";

export default function App() {
  const [sessionId, setSessionId] = useState(null);
  // Level als Objekt {welt, stufe}
  const [level, setLevel] = useState({ welt: 1, stufe: 1 });
  const [showOverlay, setShowOverlay] = useState(false);
  const [groundTruth, setGroundTruth] = useState(null);
  const [maeResult, setMaeResult] = useState(null);
  const [gameMode, setGameMode] = useState("color"); // "color" oder "number"
  const [stufe1Fragen, setStufe1Fragen] = useState(null);
  const [stufe2Fragen, setStufe2Fragen] = useState(null);
  const [stufe3Fragen, setStufe3Fragen] = useState(null);
  const [stufe4Fragen, setStufe4Fragen] = useState(null);
  const [stufe5Fragen, setStufe5Fragen] = useState(null);

  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [playerBins, setPlayerBins] = useState(() => new Array(101).fill(0));

  const startGame = async (mode = "color", opts = {}) => {
    console.log("startGame called", mode);
    try {
      const body = { 
        distribution_type: "normal",
        game_mode: mode
      };
      if (mode === "number") {
        if (opts && typeof opts.welt === "number") body.welt = opts.welt;
        if (opts && typeof opts.stufe === "number") body.stufe = opts.stufe;
        if (opts && typeof opts.n === "number") body.n = opts.n;
      }
      const url = "http://127.0.0.1:3000/start-session";
      console.log("fetch ->", url, body);
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("start-session returned non-OK:", res.status, t);
        alert(`Backend returned ${res.status}`);
        return;
      }
      const json = await res.json();
      if (json.session_id) {
        setSessionId(json.session_id);
        // Debug: Logge die Level-Infos aus dem Backend
        console.log("LEVEL-INFO aus Backend:", json.level_info, "current_level:", json.current_level);
        console.log("🔍 FULL RESPONSE JSON:", json);
        // Level-Objekt aus Backend (level_info) oder fallback
        if (json.level_info && typeof json.level_info === 'object') {
          console.log("✅ Level aus level_info gesetzt:", json.level_info.welt, json.level_info.stufe);
          setLevel(json.level_info);
        } else if (json.current_level && typeof json.current_level === 'object') {
          setLevel(json.current_level);
        } else if (typeof json.current_level === 'number') {
          setLevel({ welt: 1, stufe: json.current_level });
        } else {
          // Fallback: Setze Default-Level (sollte vom Backend kommen)
          setLevel({ welt: 1, stufe: 1 });
        }
        setGameMode(json.game_mode || mode);
        setShowOverlay(false);
        setGroundTruth(null);
        setMaeResult(null);
        setPlayerBins(new Array(101).fill(0));
        setStufe1Fragen(json.stufe1_fragen || null);
        setStufe2Fragen(json.stufe2_fragen || null);
        setStufe3Fragen(json.stufe3_fragen || null);
        setStufe4Fragen(json.stufe4_fragen || null);
        setStufe5Fragen(json.stufe5_fragen || null);
      }
    } catch (e) {
      console.error("Failed to start session:", e);
      alert("Failed to connect to backend. Make sure it's running on http://localhost:3000");
    }
  };

  // Auto-start from URL params for integration with Leiterspiel
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get("mode");
      const welt = params.get("welt");
      const stufe = params.get("stufe");
      const auto = params.get("auto");
      const weltNum = welt != null ? parseInt(welt, 10) : undefined;
      const stufeNum = stufe != null ? parseInt(stufe, 10) : undefined;
      if (mode === "number" || mode === "color") {
        setGameMode(mode);
        if (auto !== null || weltNum !== undefined || stufeNum !== undefined) {
          startGame(mode, { welt: weltNum, stufe: stufeNum });
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

    // draw ground truth as gray bars (nicht-kumulierte Wahrscheinlichkeiten, z.B. n Werte)
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

  function expandBinsToSamples(bins, maxCount = null) {
    const samples = [];
    const limit = maxCount !== null ? maxCount : Math.max(...bins);
    for (let i = 0; i < bins.length; i++) {
      const count = Math.max(0, Math.min(limit, Math.round(bins[i])));
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
    <div 
      className="min-h-screen text-white flex flex-col items-center relative"
      style={{
        background: sessionId 
          ? `linear-gradient(rgba(17, 24, 39, 0.85), rgba(17, 24, 39, 0.92)), url('/leiterspiel/minispiel/DüstererWald.jpg.webp')`
          : '#111827',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      <h1 className="text-4xl font-bold mt-6 relative z-10">Perception Game</h1>

      {!sessionId && (
        <div className="mt-6 max-w-2xl text-center mx-auto px-4 relative z-10">
          <p className="mb-6 text-gray-200 text-lg">Wähle den Spielmodus:</p>
          
          <div className="flex flex-col gap-4 items-center">
            <div className="bg-gray-800/90 backdrop-blur-sm p-6 rounded-lg max-w-md w-full border border-gray-700">
              <h3 className="text-xl font-bold mb-2">🎨 Farbverteilung</h3>
              <p className="text-sm text-gray-300 mb-4">Achten Sie auf die Farben der Ballons. Sie müssen die Verteilung der Grautöne zeichnen.</p>
              <button
                onClick={() => startGame("color")}
                className="w-full px-6 py-3 bg-blue-600 rounded-xl hover:bg-blue-700 transition"
              >
                Farbspiel starten
              </button>
            </div>

            <div className="bg-gray-800/90 backdrop-blur-sm p-6 rounded-lg max-w-md w-full border border-gray-700">
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
        <div className="w-full max-w-4xl mt-6 relative z-10">
          <div className="mb-4 text-center bg-gray-900/70 backdrop-blur-sm rounded-lg p-3 border border-gray-700">
            <div className="text-2xl">Level: Welt {level.welt}, Stufe {level.stufe}</div>
            <div className="text-sm text-gray-400">Modus: {gameMode === "number" ? "Zahlenverteilung (0-20)" : "Farbverteilung (Grautöne)"}</div>
          </div>
          {gameMode === "color" ? (
            <ColorGame 
              sessionId={sessionId} 
              level={level}
              gameMode={gameMode}
              onGameEnd={onGameEnd}
              onRestartGame={() => startGame(gameMode)}
            />
          ) : (
            <NumberGame 
              sessionId={sessionId} 
              level={level}
              gameMode={gameMode}
              onGameEnd={onGameEnd}
              onRestartGame={() => startGame(gameMode)}
              stufe1_fragen={stufe1Fragen}
              stufe2_fragen={stufe2Fragen}
              stufe3_fragen={stufe3Fragen}
              stufe5_fragen={stufe5Fragen}
              stufe4_fragen={stufe4Fragen}
            />
          )}
        </div>
      )}


    </div>
  );
}
