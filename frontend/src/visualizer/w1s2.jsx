import React, { useState } from "react";

// Freitext-Komponente für Welt 1, Stufe 2
export default function W1S2Freitext({ sessionId, fragen, onAntwortenFertig }) {
    const [antworten, setAntworten] = useState(Array(fragen.length).fill(""));
    const [step1Ergebnis, setStep1Ergebnis] = useState(null);
    const [step2Ergebnis, setStep2Ergebnis] = useState(null);
    const [gesamtErgebnis, setGesamtErgebnis] = useState(null);
    const [step, setStep] = useState(1); // Schritt 1: Fragen 0-1, Schritt 2: Auswertung 1, Schritt 3: Fragen 2-4, Schritt 4: Auswertung 2, Schritt 5: Gesamtscore

    const handleAntwort = (frageIdx, value) => {
        const newAntworten = [...antworten];
        newAntworten[frageIdx] = value;
        setAntworten(newAntworten);
    };

    const handleWeiter = async () => {
        // Prüfe nur die ersten zwei Antworten
        if ((antworten[0] ?? "") === "" || (antworten[1] ?? "") === "") {
            alert("Bitte zuerst die ersten zwei Fragen beantworten.");
            return;
        }
        
        // Evaluiere die ersten 2 Fragen
        const url = "http://127.0.0.1:3000/evaluate-w1s2";
        try {
            const res = await fetch(url, {
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
                console.error("evaluate-w1s2 failed:", res.status, t);
                alert("Serverfehler bei der Auswertung");
                return;
            }
            const json = await res.json();
            if (json.status === "ok" && json.evaluation) {
                const ev = json.evaluation;
                setStep1Ergebnis({ 
                    results: ev.results, 
                    correct_count: ev.correct_count, 
                    total: ev.total, 
                    score: Math.round(ev.score * 100) 
                });
                setStep(2); // Zeige Auswertung der ersten 2 Fragen
            }
        } catch (e) {
            console.error(e);
            alert("Netzwerkfehler bei der Auswertung");
        }
    };

    const handleStep2Weiter = () => {
        setStep(3); // Gehe zu Fragen 3-5
    };

    const handleFertig = async () => {
        // In Schritt 3 müssen alle restlichen Fragen beantwortet sein
        if (!antworten.slice(2).every((a) => a !== "")) {
            alert("Bitte alle Fragen beantworten.");
            return;
        }

        // Evaluiere die restlichen 3 Fragen
        const url = "http://127.0.0.1:3000/evaluate-w1s2";
        try {
            const res = await fetch(url, {
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
                console.error("evaluate-w1s2 failed:", res.status, t);
                alert("Serverfehler bei der Auswertung");
                return;
            }
            const json = await res.json();
            if (json.status === "ok" && json.evaluation) {
                const ev = json.evaluation;
                setStep2Ergebnis({ 
                    results: ev.results, 
                    correct_count: ev.correct_count, 
                    total: ev.total, 
                    score: Math.round(ev.score * 100) 
                });
                setStep(4); // Zeige Auswertung der restlichen Fragen
            }
        } catch (e) {
            console.error(e);
            alert("Netzwerkfehler bei der Auswertung");
        }
    };

    const handleZeigeGesamtscore = () => {
        // Berechne Gesamtscore
        const totalCorrect = (step1Ergebnis?.correct_count || 0) + (step2Ergebnis?.correct_count || 0);
        const totalQuestions = (step1Ergebnis?.total || 0) + (step2Ergebnis?.total || 0);
        const gesamtScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
        
        setGesamtErgebnis({
            correct_count: totalCorrect,
            total: totalQuestions,
            score: gesamtScore
        });
        setStep(5); // Zeige Gesamtscore
    };

    return (
        <div className="flex flex-col items-center">
            {/* Schritt 1: Fragen 0 und 1 */}
            {step === 1 && (
                <>
                    <h2 className="text-lg font-bold mb-4">Beantworte zuerst die ersten zwei Fragen:</h2>
                    {[0,1].map((idx) => (
                        <div key={idx} className="mb-4 w-full max-w-md">
                            <div className="font-bold mb-2">{fragen[idx]?.frage}</div>
                            <input
                                type="text"
                                className="border rounded px-3 py-1 w-full text-black bg-white"
                                value={antworten[idx]}
                                onChange={e => handleAntwort(idx, e.target.value)}
                                placeholder="Antwort eingeben"
                            />
                        </div>
                    ))}
                    <div className="mt-4">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleWeiter}>
                            Auswerten
                        </button>
                    </div>
                </>
            )}

            {/* Schritt 2: Auswertung der ersten 2 Fragen */}
            {step === 2 && step1Ergebnis && (
                <div className="w-full max-w-md">
                    <h2 className="text-lg font-bold mb-4 text-center">Auswertung - Teil 1</h2>
                    <div className="bg-gray-100 p-4 rounded mb-4">
                        <div className="mb-2 text-gray-800">Punkte: <span className="font-mono">{step1Ergebnis.correct_count}/{step1Ergebnis.total}</span> ({step1Ergebnis.score}%)</div>
                        <div className="space-y-2">
                            {step1Ergebnis.results.map((r, idx) => (
                                <div key={idx} className={`p-2 rounded ${r.is_correct ? 'bg-green-200 text-gray-800' : 'bg-red-200 text-gray-800'}`}>
                                    <div className="font-semibold">{fragen[r.frage_idx]?.frage}</div>
                                    <div className="text-sm">Deine Antwort: <span className="font-mono">{r.selected_value ?? '—'}</span></div>
                                    <div className="text-sm">Richtige Antwort: <span className="font-mono">{r.korrekt ?? '—'}</span></div>
                                    <div className="text-sm font-bold">{r.is_correct ? '✓ Richtig' : '✗ Falsch'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="text-center">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleStep2Weiter}>
                            Weiter zu den nächsten Fragen
                        </button>
                    </div>
                </div>
            )}

            {/* Schritt 3: Fragen 2-4 */}
            {step === 3 && (
                <>
                    <h2 className="text-lg font-bold mb-4">Beantworte nun die restlichen drei Fragen:</h2>
                    {fragen.slice(2).map((frageObj, localIdx) => {
                        const idx = localIdx + 2;
                        return (
                            <div key={idx} className="mb-4 w-full max-w-md">
                                <div className="font-bold mb-2">{frageObj.frage}</div>
                                <input
                                    type="text"
                                    className="border rounded px-3 py-1 w-full text-black bg-white"
                                    value={antworten[idx]}
                                    onChange={e => handleAntwort(idx, e.target.value)}
                                    placeholder="Antwort eingeben"
                                />
                            </div>
                        );
                    })}
                    <div className="mt-4">
                        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={handleFertig}>
                            Auswerten
                        </button>
                    </div>
                </>
            )}

            {/* Schritt 4: Auswertung der restlichen 3 Fragen */}
            {step === 4 && step2Ergebnis && (
                <div className="w-full max-w-md">
                    <h2 className="text-lg font-bold mb-4 text-center">Auswertung - Teil 2</h2>
                    <div className="bg-gray-100 p-4 rounded mb-4">
                        <div className="mb-2 text-gray-800">Punkte: <span className="font-mono">{step2Ergebnis.correct_count}/{step2Ergebnis.total}</span> ({step2Ergebnis.score}%)</div>
                        <div className="space-y-2">
                            {step2Ergebnis.results.map((r, idx) => (
                                <div key={idx} className={`p-2 rounded ${r.is_correct ? 'bg-green-200 text-gray-800' : 'bg-red-200 text-gray-800'}`}>
                                    <div className="font-semibold">{fragen[r.frage_idx]?.frage}</div>
                                    <div className="text-sm">Deine Antwort: <span className="font-mono">{r.selected_value ?? '—'}</span></div>
                                    <div className="text-sm">Richtige Antwort: <span className="font-mono">{r.korrekt ?? '—'}</span></div>
                                    <div className="text-sm font-bold">{r.is_correct ? '✓ Richtig' : '✗ Falsch'}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="text-center">
                        <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleZeigeGesamtscore}>
                            Zeige Gesamtergebnis
                        </button>
                    </div>
                </div>
            )}

            {/* Schritt 5: Gesamtscore */}
            {step === 5 && gesamtErgebnis && (
                <div className="w-full max-w-md">
                    <h2 className="text-2xl font-bold mb-4 text-center">Gesamtergebnis</h2>
                    <div className="bg-blue-100 p-6 rounded-lg text-center">
                        <div className="text-4xl font-bold text-blue-800 mb-2">{gesamtErgebnis.score}%</div>
                        <div className="text-xl text-gray-800 mb-4">
                            {gesamtErgebnis.correct_count} von {gesamtErgebnis.total} Fragen richtig
                        </div>
                        <div className={`text-lg font-bold ${gesamtErgebnis.score >= 60 ? 'text-green-700' : 'text-red-700'}`}>
                            {gesamtErgebnis.score >= 60 ? '✓ Bestanden' : '✗ Nicht bestanden'}
                        </div>
                    </div>
                    <div className="mt-6 text-center">
                        <button className="px-4 py-2 bg-green-600 text-white rounded" onClick={() => onAntwortenFertig(antworten)}>
                            Weiter
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
