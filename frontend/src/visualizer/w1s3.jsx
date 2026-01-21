import React, { useState } from "react";

// Fragen-/Auswertungskomponente für Welt 1, Stufe 3 (5 Fragen)
export default function W1S3Questions({ sessionId, fragen, onAntwortenFertig }) {
  const [antworten, setAntworten] = useState(Array(fragen?.length || 0).fill(""));
  const [ergebnis, setErgebnis] = useState(null);
  const [step, setStep] = useState(1); // Schritt 1: Frage 0, Schritt 2: Fragen 1-4

  const handleAntwort = (frageIdx, value) => {
    const newAntworten = [...antworten];
    newAntworten[frageIdx] = value;
    setAntworten(newAntworten);
  };

  const handleWeiter = () => {
    // Prüfe nur die erste Antwort
    if ((antworten[0] ?? "") === "") {
      alert("Bitte zuerst die erste Frage beantworten.");
      return;
    }
    setStep(2);
  };

  const handleBewerten = async () => {
    // Ensure all 5 answers are provided (Schritt 2)
    if (!antworten || antworten.length < 5 || antworten.some(a => a === "" || a === null || a === undefined)) {
      alert("Bitte alle 5 Fragen beantworten.");
      return;
    }
    try {
      const res = await fetch("http://127.0.0.1:3000/evaluate-w1s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, antworten }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("evaluate-w1s3 failed:", res.status, t);
        alert("Serverfehler bei der Auswertung");
        return;
      }
      const json = await res.json();
      if (json?.status === "ok" && json.evaluation) {
        const ev = json.evaluation;
        setErgebnis({
          results: ev.results,
          correct_count: ev.correct_count,
          total: ev.total,
          score: Math.round(ev.questions_score * 100),
        });
      } else {
        console.error("unexpected evaluate-w1s3 response", json);
        alert("Ungültige Serverantwort");
      }
    } catch (e) {
      console.error(e);
      alert("Netzwerkfehler bei der Auswertung");
    }
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-lg font-bold mb-4">
        {step === 1 ? "Beantworte zuerst die ersten zwei Fragen:" : "Beantworte nun die restlichen drei Fragen:"}
      </h2>

      {/* Schritt 1: nur Frage 0 */}
      {step === 1 && (
        <div className="mb-4 w-full max-w-md">
          <div className="font-bold mb-2">{fragen[0]?.frage}</div>
          <input
            type="number"
            min={0}
            max={20}
            className="border rounded px-3 py-1 w-full text-black bg-white"
            value={antworten[0]}
            onChange={e => handleAntwort(0, e.target.value)}
            placeholder="z.B. 10"
            disabled={!!ergebnis}
          />
        </div>
      )}

      {/* Schritt 2: nur Fragen 1 bis Ende */}
      {step === 2 && (
        fragen.slice(1).map((frageObj, localIdx) => {
          const idx = localIdx + 1;
          const isComparison = idx === 2;
          const isCount = idx === 3 || idx === 4;
          return (
            <div key={idx} className="mb-4 w-full max-w-md">
              <div className="font-bold mb-2">{frageObj.frage}</div>
              {isComparison ? (
                <input
                  type="text"
                  className="border rounded px-3 py-1 w-full text-black bg-white"
                  value={antworten[idx]}
                  onChange={e => handleAntwort(idx, e.target.value)}
                  placeholder="ja / nein"
                  disabled={!!ergebnis}
                />
              ) : (
                <input
                  type="number"
                  min={0}
                  className="border rounded px-3 py-1 w-full text-black bg-white"
                  value={antworten[idx]}
                  onChange={e => handleAntwort(idx, e.target.value)}
                  placeholder={isCount ? "Anzahl" : "Antwort eingeben"}
                  disabled={!!ergebnis}
                />
              )}
            </div>
          );
        })
      )}

      <div className="mt-4">
        {!ergebnis ? (
          step === 1 ? (
            <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleWeiter}>
              Weiter
            </button>
          ) : (
            <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleBewerten}>
              Bewerten
            </button>
          )
        ) : (
          <div className="w-full max-w-md bg-gray-800 p-4 rounded">
            <div className="text-center font-bold text-lg mb-2">Ergebnis</div>
            <div className="mb-2">Punkte: <span className="font-mono">{ergebnis.correct_count}/{ergebnis.total}</span> · <span className="font-mono">{ergebnis.score}%</span></div>
            <div className="space-y-2">
              {ergebnis.results.map((r, i) => (
                <div key={i} className={`p-2 rounded ${r.is_correct ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
                  <div className="font-semibold">{r.frage}</div>
                  <div className="text-sm">Deine Antwort: <span className="font-mono">{r.selected_value ?? '—'}</span></div>
                  <div className="text-sm">Richtige Antwort: <span className="font-mono">{r.korrekt ?? '—'}</span></div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-center">
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => onAntwortenFertig(antworten)}>
                Weiter
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}