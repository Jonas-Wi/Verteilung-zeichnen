import React, { useState } from "react";

// Freitext-Komponente für Welt 1, Stufe 2
export default function W1S2Freitext({ sessionId, fragen, onAntwortenFertig }) {
    const [antworten, setAntworten] = useState(Array(fragen.length).fill(""));
    const [ergebnis, setErgebnis] = useState(null);

    const handleAntwort = (frageIdx, value) => {
        const newAntworten = [...antworten];
        newAntworten[frageIdx] = value;
        setAntworten(newAntworten);
    };

    const handleFertig = () => {
        if (!antworten.every((a) => a !== "")) {
            alert("Bitte alle Fragen beantworten.");
            return;
        }

        // Sende Antworten an Backend zur Auswertung
        const url = "http://127.0.0.1:3000/evaluate-w1s2";
        fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: sessionId, antworten: antworten }),
        })
            .then(async (res) => {
                if (!res.ok) {
                    const t = await res.text();
                    console.error("evaluate-w1s2 failed:", res.status, t);
                    alert("Serverfehler bei der Auswertung");
                    return;
                }
                return res.json();
            })
            .then((json) => {
                if (!json) return;
                if (json.status === "ok" && json.evaluation) {
                    const ev = json.evaluation;
                    setErgebnis({ results: ev.results, correct_count: ev.correct_count, total: ev.total, score: Math.round(ev.score * 100) / 1 });
                } else {
                    console.error("unexpected evaluate-w1s2 response", json);
                    alert("Ungültige Serverantwort");
                }
            })
            .catch((e) => {
                console.error(e);
                alert("Netzwerkfehler bei der Auswertung");
            });
    };

    return (
        <div className="flex flex-col items-center">
            <h2 className="text-lg font-bold mb-4">Beantworte die folgenden Fragen:</h2>
            {fragen.map((frageObj, idx) => (
                <div key={idx} className="mb-4 w-full max-w-md">
                    <div className="font-bold mb-2">{frageObj.frage}</div>
                    <input
                        type="text"
                        className="border rounded px-3 py-1 w-full text-black bg-white"
                        value={antworten[idx]}
                        onChange={e => handleAntwort(idx, e.target.value)}
                        placeholder="Antwort eingeben"
                        disabled={!!ergebnis}
                    />
                </div>
            ))}
            <div className="mt-4">
                {!ergebnis ? (
                    <button
                        className="px-4 py-2 bg-green-600 text-white rounded"
                        onClick={handleFertig}
                    >
                        Bewerten
                    </button>
                ) : (
                    <div className="w-full max-w-md bg-gray-800 p-4 rounded">
                        <div className="text-center font-bold text-lg mb-2">Ergebnis</div>
                        <div className="mb-2">Punkte: <span className="font-mono">{ergebnis.correct_count}/{ergebnis.total}</span> &middot; <span className="font-mono">{ergebnis.score}%</span></div>
                        <div className="space-y-2">
                            {ergebnis.results.map((r) => (
                                <div key={r.frage_idx} className={`p-2 rounded ${r.is_correct ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
                                    <div className="font-semibold">{r.frage}</div>
                                    <div className="text-sm">Deine Antwort: <span className="font-mono">{r.selected_value ?? '—'}</span></div>
                                    <div className="text-sm">Richtige Antwort: <span className="font-mono">{r.korrekt ?? '—'}</span></div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-3 text-center">
                            <button
                                className="px-4 py-2 bg-blue-600 text-white rounded"
                                onClick={() => onAntwortenFertig(antworten)}
                            >
                                Weiter
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
