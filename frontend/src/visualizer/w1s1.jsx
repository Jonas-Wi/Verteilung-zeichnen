
import React, { useState } from "react";

// Multiple-choice component for Welt 1, Stufe 1
export default function W1S1MultipleChoice({ sessionId, fragen, onAntwortenFertig }) {
	const [antworten, setAntworten] = useState(Array(fragen.length).fill(null));
	const [ergebnis, setErgebnis] = useState(null);

	const handleAntwort = (frageIdx, optionIdx) => {
		const newAntworten = [...antworten];
		newAntworten[frageIdx] = optionIdx;
		setAntworten(newAntworten);
	};

	const handleFertig = () => {
		if (!antworten.every((a) => a !== null)) {
			alert("Bitte alle Fragen beantworten.");
			return;
		}

		// Send answers to backend for evaluation
		const url = "http://127.0.0.1:3000/evaluate-w1s1";
		fetch(url, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ session_id: sessionId, antworten: antworten }),
		})
			.then(async (res) => {
				if (!res.ok) {
					const t = await res.text();
					console.error("evaluate-w1s1 failed:", res.status, t);
					alert("Serverfehler bei der Auswertung");
					return;
				}
				return res.json();
			})
			.then((json) => {
				if (!json) return;
				if (json.status === "ok" && json.evaluation) {
					// convert server evaluation to same shape used by UI
					const ev = json.evaluation;
					setErgebnis({ results: ev.results, correct_count: ev.correct_count, total: ev.total, score: Math.round(ev.score * 100) / 1 });
				} else {
					console.error("unexpected evaluate-w1s1 response", json);
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
					<div className="flex gap-2 flex-wrap">
						{frageObj.optionen.map((opt, oidx) => (
							<button
								key={oidx}
								className={`px-3 py-1 rounded border ${antworten[idx] === oidx ? "bg-blue-500 text-white" : "bg-white text-black"}`}
								onClick={() => handleAntwort(idx, oidx)}
							>
								{opt}
							</button>
						))}
					</div>
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
