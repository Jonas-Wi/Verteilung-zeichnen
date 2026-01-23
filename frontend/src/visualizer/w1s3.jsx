import React, { useState } from "react";

// Fragen-/Auswertungskomponente für Welt 1, Stufe 3 (5 Fragen, 2-stufig)
export default function W1S3Questions({ sessionId, fragen, onAntwortenFertig, distributionLength }) {
  const [antworten, setAntworten] = useState(Array(fragen?.length || 0).fill(""));
  const [step1Ergebnis, setStep1Ergebnis] = useState(null);
  const [step2Ergebnis, setStep2Ergebnis] = useState(null);
  const [step, setStep] = useState(1); // 1: Fragen 0-1, 2: Bewertung 0-1, 3: Fragen 2-4, 4: Bewertung 2-4

  const handleAntwort = (frageIdx, value) => {
    const newAntworten = [...antworten];
    newAntworten[frageIdx] = value;
    setAntworten(newAntworten);
  };

  const handleBewertenStep1 = async () => {
    // Prüfe die ersten beiden Antworten
    if ((antworten[0] ?? "") === "" || (antworten[1] ?? "") === "") {
      alert("Bitte beide Fragen beantworten.");
      return;
    }

    // Evaluiere die ersten 2 Fragen
    try {
      const res = await fetch("http://127.0.0.1:3000/evaluate-w1s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          session_id: sessionId, 
          antworten: antworten.slice(0, 2),
          frage_indices: [0, 1]
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("evaluate-w1s3 step1 failed:", res.status, t);
        alert("Serverfehler bei der Auswertung");
        return;
      }
      const json = await res.json();
      if (json?.status === "ok" && json.evaluation) {
        const ev = json.evaluation;
        setStep1Ergebnis({
          results: ev.results,
          correct_count: ev.correct_count,
          total: ev.total,
          score: Math.round(ev.questions_score * 100),
          frage_indices: [0, 1],
        });
        setStep(2); // Zeige Auswertung
      } else {
        console.error("unexpected evaluate-w1s3 response", json);
        alert("Ungültige Serverantwort");
      }
    } catch (e) {
      console.error(e);
      alert("Netzwerkfehler bei der Auswertung");
    }
  };

  const handleStep2Weiter = () => {
    // Übergebe die ersten beiden Antworten an NumberGame, um Marker anzuzeigen
    onAntwortenFertig(antworten.slice(0, 2), { step1Ergebnis });
    setStep(3); // Gehe zu Fragen 2-4
  };

  const handleBewertenStep2 = async () => {
    // Prüfe die restlichen Antworten
    if ((antworten[2] ?? "") === "" || (antworten[3] ?? "") === "" || (antworten[4] ?? "") === "") {
      alert("Bitte alle drei Fragen beantworten.");
      return;
    }

    // Evaluiere die restlichen 3 Fragen
    try {
      const res = await fetch("http://127.0.0.1:3000/evaluate-w1s3", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          session_id: sessionId, 
          antworten: antworten.slice(2),
          frage_indices: [2, 3, 4]
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error("evaluate-w1s3 step2 failed:", res.status, t);
        alert("Serverfehler bei der Auswertung");
        return;
      }
      const json = await res.json();
      if (json?.status === "ok" && json.evaluation) {
        const ev = json.evaluation;
        setStep2Ergebnis({
          results: ev.results,
          correct_count: ev.correct_count,
          total: ev.total,
          score: Math.round(ev.questions_score * 100),
          frage_indices: [2, 3, 4],
        });
        setStep(4); // Zeige Auswertung
      } else {
        console.error("unexpected evaluate-w1s3 response", json);
        alert("Ungültige Serverantwort");
      }
    } catch (e) {
      console.error(e);
      alert("Netzwerkfehler bei der Auswertung");
    }
  };

  const handleStep4Weiter = () => {
    // Gehe direkt zum Zeichnen und übergebe die Ergebnisse
    onAntwortenFertig(antworten, { step1Ergebnis, step2Ergebnis });
  };

  return (
    <div className="flex flex-col items-center">
      {/* Schritt 1: Fragen 0-1 */}
      {step === 1 && (
        <>
          <h2 className="text-lg font-bold mb-4">Beantworte die ersten zwei Fragen:</h2>
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
            />
          </div>
          <div className="mb-4 w-full max-w-md">
            <div className="font-bold mb-2">{fragen[1]?.frage}</div>
            <div className="text-sm text-gray-400 mb-2">Tipp: Es gab insgesamt {distributionLength} Ballons</div>
            <input
              type="number"
              min={0}
              className="border rounded px-3 py-1 w-full text-black bg-white"
              value={antworten[1]}
              onChange={e => handleAntwort(1, e.target.value)}
              placeholder="Anzahl"
            />
          </div>
          <button className="px-4 py-2 bg-green-600 text-white rounded mt-4" onClick={handleBewertenStep1}>
            Bewerten
          </button>
        </>
      )}

      {/* Schritt 2: Bewertung Fragen 0-1 */}
      {step === 2 && step1Ergebnis && (
        <div className="w-full max-w-md">
          <h2 className="text-lg font-bold mb-4 text-center">Ergebnis der ersten zwei Fragen:</h2>
          <div className="bg-gray-800 p-4 rounded">
            <div className="mb-2">Punkte: <span className="font-mono">{step1Ergebnis.correct_count}/{step1Ergebnis.total}</span></div>
            <div className="space-y-2">
              {step1Ergebnis.results.map((r, i) => {
                const frageIndices = step1Ergebnis?.frage_indices || [0, 1];
                const globalIdx = frageIndices[r.frage_idx] ?? r.frage_idx;
                const questionText = fragen?.[globalIdx]?.frage ?? '';
                return (
                  <div key={i} className={`p-2 rounded ${r.is_correct ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
                    <div className="font-semibold">{questionText}</div>
                    <div className="text-sm">Deine Antwort: <span className="font-mono">{r.selected_value ?? '—'}</span></div>
                    <div className="text-sm">Richtige Antwort: <span className="font-mono">{r.korrekt ?? '—'}</span></div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-center">
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleStep2Weiter}>
                Weiter zu den nächsten Fragen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schritt 3: Fragen 2-4 */}
      {step === 3 && (
        <>
          <h2 className="text-lg font-bold mb-4">Beantworte die restlichen drei Fragen:</h2>
          {fragen.slice(2).map((frageObj, localIdx) => {
            const idx = localIdx + 2;
            const isComparison = idx === 2;
            const isCount = idx === 3 || idx === 4;
            return (
              <div key={idx} className="mb-4 w-full max-w-md">
                <div className="font-bold mb-2">{frageObj.frage}</div>
                {isComparison ? (
                  <div className="flex gap-4">
                    <button
                      type="button"
                      className={`flex-1 px-4 py-2 rounded border-2 ${antworten[idx] === 'ja' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-black border-gray-300'}`}
                      onClick={() => handleAntwort(idx, 'ja')}
                    >
                      Ja
                    </button>
                    <button
                      type="button"
                      className={`flex-1 px-4 py-2 rounded border-2 ${antworten[idx] === 'nein' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-black border-gray-300'}`}
                      onClick={() => handleAntwort(idx, 'nein')}
                    >
                      Nein
                    </button>
                  </div>
                ) : (
                  <>
                    {isCount && <div className="text-sm text-gray-400 mb-2">Tipp: Es gab insgesamt {distributionLength} Ballons</div>}
                    <input
                      type="number"
                      min={0}
                      className="border rounded px-3 py-1 w-full text-black bg-white"
                      value={antworten[idx]}
                      onChange={e => handleAntwort(idx, e.target.value)}
                      placeholder={isCount ? "Anzahl" : "Antwort eingeben"}
                    />
                  </>
                )}
              </div>
            );
          })}
          <button className="px-4 py-2 bg-green-600 text-white rounded mt-4" onClick={handleBewertenStep2}>
            Bewerten
          </button>
        </>
      )}

      {/* Schritt 4: Bewertung Fragen 2-4 */}
      {step === 4 && step2Ergebnis && (
        <div className="w-full max-w-md">
          <h2 className="text-lg font-bold mb-4 text-center">Ergebnis der restlichen Fragen:</h2>
          <div className="bg-gray-800 p-4 rounded">
            <div className="mb-2">Punkte: <span className="font-mono">{step2Ergebnis.correct_count}/{step2Ergebnis.total}</span></div>
            <div className="space-y-2">
              {step2Ergebnis.results.map((r, i) => {
                const frageIndices = step2Ergebnis?.frage_indices || [2, 3, 4];
                const globalIdx = frageIndices[r.frage_idx] ?? r.frage_idx;
                const questionText = fragen?.[globalIdx]?.frage ?? '';
                return (
                  <div key={i} className={`p-2 rounded ${r.is_correct ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
                    <div className="font-semibold">{questionText}</div>
                    <div className="text-sm">Deine Antwort: <span className="font-mono">{r.selected_value ?? '—'}</span></div>
                    <div className="text-sm">Richtige Antwort: <span className="font-mono">{r.korrekt ?? '—'}</span></div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-center">
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleStep4Weiter}>
                Weiter zum Zeichnen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}