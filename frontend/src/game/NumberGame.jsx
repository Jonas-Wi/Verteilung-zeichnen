import React, { useState, useRef, useEffect } from "react";
import GameCommon from "./GameCommon";
import { NumberDistributionVisualizer } from "../visualizer/NumberDistributionVisualizer";
import W1S1MultipleChoice from "../visualizer/w1s1.jsx";
import W1S2Freitext from "../visualizer/w1s2.jsx";
import W1S3Questions from "../visualizer/w1s3.jsx";

export default function NumberGame(props) {
	const { sessionId, level, onRestartGame } = props;
	const [showIntroduction, setShowIntroduction] = useState(level && level.welt === 1 && level.stufe === 1);
	const [gameActive, setGameActive] = useState(!(level && level.welt === 1 && level.stufe === 1));
	const [evaluationResult, setEvaluationResult] = useState(null);
	const [blockMode, setBlockMode] = useState(false);
	const [preRevealStage, setPreRevealStage] = useState(null);
	const [guessPeakValue, setGuessPeakValue] = useState(null);
	const [guessPeakFrequency, setGuessPeakFrequency] = useState(null);
	const [peakValueInput, setPeakValueInput] = useState("");
	const [peakFrequencyInput, setPeakFrequencyInput] = useState("");
	const [additionalPeaks, setAdditionalPeaks] = useState([]);
	const [additionalValueInput, setAdditionalValueInput] = useState("");
	const [additionalFreqInput, setAdditionalFreqInput] = useState("");
	const [comparisonInput, setComparisonInput] = useState("");
	const [neighborLeftCountInput, setNeighborLeftCountInput] = useState("");
	const [neighborRightCountInput, setNeighborRightCountInput] = useState("");
	const [unseenNumberInput, setUnseenNumberInput] = useState("");
	const [averageComparisonInput, setAverageComparisonInput] = useState("");
	const canvasRef = useRef(null);
	const visualizerRef = useRef(null);
		const distributionRef = useRef(null);
	const [stufe1Fragen, setStufe1Fragen] = useState([]);
	const [stufe1Antworten, setStufe1Antworten] = useState([]);
	const [stufe2Fragen, setStufe2Fragen] = useState([]);
	const [stufe2Antworten, setStufe2Antworten] = useState([]);
	const [stufe3Fragen, setStufe3Fragen] = useState([]);
	const [stufe4Fragen, setStufe4Fragen] = useState([]);
	const [stufe5Fragen, setStufe5Fragen] = useState([]);
	const [referenceShown, setReferenceShown] = useState(false);
	const [stufe3Ergebnisse, setStufe3Ergebnisse] = useState(null);
	// Level 5: Tabelleneingabe statt Zeichnen (Array für Werte 0-20)
	const [histogramInputs, setHistogramInputs] = useState(Array(21).fill(0));

	// Callback für Spielende: Zeige Visualizer/Fragen
	const handleGameEnd = (payload) => {
		distributionRef.current = payload.distribution;
		setGameActive(false);
		
		// Stufe 5: Direkt zum Zeichnen ohne Fragen
		if (level && level.welt === 1 && level.stufe === 5) {
			setPreRevealStage('ready');
			setGuessPeakValue(null);
			setGuessPeakFrequency(null);
			setAdditionalPeaks([]);
		} else {
			setPreRevealStage('askPeakValue');
			setGuessPeakValue(null);
			setGuessPeakFrequency(null);
		}
		
		setPeakValueInput('');
		setPeakFrequencyInput('');
		setAdditionalPeaks([]);
		setAdditionalValueInput('');
		setAdditionalFreqInput('');
		setComparisonInput('');
		setNeighborLeftCountInput('');
		setNeighborRightCountInput('');
		setUnseenNumberInput('');
		setAverageComparisonInput('');
		setEvaluationResult(null);
	};

	// Pre-Reveal-Fragen
	function handleSubmitPeakValue() {
		const val = Number(peakValueInput);
		if (!Number.isFinite(val) || val < 0 || val > 20) {
			alert('Bitte gib einen gültigen Wert zwischen 0 und 20 an.');
			return;
		}
		setGuessPeakValue(val);
		setPreRevealStage('askPeakFrequency');
	}
	function handleSubmitPeakFrequency() {
		const freq = Number(peakFrequencyInput);
		if (!Number.isFinite(freq) || freq < 0) {
			alert('Bitte gib eine gültige Häufigkeit an (mindestens 0).');
			return;
		}
		setGuessPeakFrequency(freq);
		setPreRevealStage('askAdditionalPeaks');
	}
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
	async function handleFinishAdditionalPeaks() {
		// Sonderfall: Welt 1, Stufe 1 -> keine Zeichnung, direkt Auswertung
		if (level && level.welt === 1 && level.stufe === 1) {
			if (visualizerRef.current) {
				visualizerRef.current.setPreRevealAnswers({
					peak_value: guessPeakValue,
					peak_frequency: guessPeakFrequency,
					additional_peaks: additionalPeaks
				});
				// Automatisch auswerten
				const result = await visualizerRef.current.evaluateDrawing();
				if (result) {
					setEvaluationResult(result);
					setPreRevealStage('revealDone');
				}
			}
			return;
		}

		// Welt 1, Stufe 3/4: Vergleichsfrage statt zusätzlicher Peaks
		const isStufe3 = level && level.welt === 1 && level.stufe === 3;
		const isStufe4 = level && level.welt === 1 && level.stufe === 4;
		if ((isStufe3 || isStufe4) && comparisonInput.trim() === '') {
			alert('Bitte beantworte die Vergleichsfrage (ja/nein).');
			return;
		}
		
		// Stufe 4: Prüfe ob die beiden zusätzlichen Fragen beantwortet wurden
		if (isStufe4) {
			if (unseenNumberInput.trim() === '') {
				alert('Bitte wähle eine Zahl aus, die du nicht gesehen hast.');
				return;
			}
			if (averageComparisonInput.trim() === '') {
				alert('Bitte beantworte die Durchschnittsfrage (ja/nein).');
				return;
			}
		}
		// Stufe 3: Zusätzlich zwei Zählfragen (peak-1, peak+1) müssen beantwortet werden
		if (isStufe3) {
			const leftVal = Number(neighborLeftCountInput);
			const rightVal = Number(neighborRightCountInput);
			if (!Number.isFinite(leftVal) || leftVal < 0) {
				alert('Bitte gib eine gültige Anzahl für Hochpunkt−1 an (≥ 0).');
				return;
			}
			if (!Number.isFinite(rightVal) || rightVal < 0) {
				alert('Bitte gib eine gültige Anzahl für Hochpunkt+1 an (≥ 0).');
				return;
			}
		}

		if (visualizerRef.current && distributionRef.current) {
			visualizerRef.current.drawAxes(distributionRef.current);
			
			// Für Stufe 3: Berechne den echten Hochpunkt aus der ground_truth
			if (isStufe3) {
				const histogram = new Array(21).fill(0);
				distributionRef.current.forEach(v => {
					const val = Math.max(0, Math.min(20, Math.round(v)));
					histogram[val]++;
				});
				const truePeakIdx = histogram.indexOf(Math.max(...histogram));
				const truePeakCount = histogram[truePeakIdx];
				// Zeige Hochpunkt sowie links/rechts daneben
				const leftIdx = Math.max(0, truePeakIdx - 1);
				const rightIdx = Math.min(20, truePeakIdx + 1);
				const markers = [{ value: truePeakIdx, frequency: truePeakCount }];
				if (leftIdx !== truePeakIdx) markers.push({ value: leftIdx, frequency: histogram[leftIdx] });
				if (rightIdx !== truePeakIdx) markers.push({ value: rightIdx, frequency: histogram[rightIdx] });
				visualizerRef.current.drawMultiplePeakMarkers(markers);
			} else {
				// Für andere Level: Zeige alle geratenen Peaks
				const allPeakValues = [guessPeakValue, ...additionalPeaks.map(p => p.value)];
				const allPeaks = [
					{ value: guessPeakValue, frequency: guessPeakFrequency },
					...additionalPeaks
				];
				// In Stufe 4 keine echten Hinweis-Balken/Marker zeigen
				if (!isStufe4) {
					visualizerRef.current.drawTruthBarsForValues(distributionRef.current, allPeakValues);
					visualizerRef.current.drawMultiplePeakMarkers(allPeaks);
				}
			}
			
			visualizerRef.current.setPreRevealAnswers({
				peak_value: guessPeakValue,
				peak_frequency: guessPeakFrequency,
				additional_peaks: additionalPeaks,
				comparison_answer: comparisonInput || null,
				neighbor_left_count: (isStufe3 ? Number(neighborLeftCountInput) : null),
				neighbor_right_count: (isStufe3 ? Number(neighborRightCountInput) : null)
			});
		}
		setPreRevealStage('ready');
		visualizerRef.current?.setDrawMode(true);
	}

	// Initialisiere Visualizer, wenn Spiel endet
	useEffect(() => {
		if (!gameActive && distributionRef.current && canvasRef.current) {
			if (!visualizerRef.current) {
				visualizerRef.current = new NumberDistributionVisualizer(canvasRef.current, sessionId, level);
			} else {
				visualizerRef.current.setLevel(level);
			}
			// DrawMode nur aktivieren wenn preRevealStage 'ready' ist
			const shouldEnableDrawing = preRevealStage === 'ready';
			visualizerRef.current.setDrawMode(shouldEnableDrawing);
			visualizerRef.current.setBlockMode?.(blockMode);
			// drawAxes nur aufrufen wenn noch nicht revealDone (sonst überschreibt es die Referenzkurve!)
			if (preRevealStage !== 'revealDone') {
				visualizerRef.current.drawAxes(distributionRef.current);
			}
		}
	}, [gameActive, sessionId, blockMode, level, preRevealStage]);

	// Level 5: Zeichne User-Eingaben als Balken
	useEffect(() => {
		if (level && level.stufe === 5 && visualizerRef.current && distributionRef.current && !evaluationResult) {
			// Zeichne Achsen neu
			visualizerRef.current.drawAxes(distributionRef.current);
			// Zeichne graue Balken für die User-Eingaben
			const userBars = histogramInputs.map((freq, value) => ({
				value,
				frequency: Number(freq) || 0
			})).filter(bar => bar.frequency > 0);
			
			if (userBars.length > 0) {
				visualizerRef.current.drawGuessBars(userBars);
			}
		}
	}, [histogramInputs, level, evaluationResult]);


	// Fragen für Stufe 1 und 2 aus level_info laden, wenn vorhanden
	useEffect(() => {
		if (!gameActive && level && level.welt === 1) {
			if (level.stufe === 1 && props.stufe1_fragen) {
				setStufe1Fragen(props.stufe1_fragen);
			}
			if (level.stufe === 2 && props.stufe2_fragen) {
				setStufe2Fragen(props.stufe2_fragen);
			}
			if (level.stufe === 3 && props.stufe3_fragen) {
				setStufe3Fragen(props.stufe3_fragen);
			}
			if (level.stufe === 4 && props.stufe4_fragen) {
				setStufe4Fragen(props.stufe4_fragen);
			}
			if (level.stufe === 5 && props.stufe5_fragen) {
				setStufe5Fragen(props.stufe5_fragen);
			}
		}
	}, [gameActive, level, props.stufe1_fragen, props.stufe2_fragen, props.stufe3_fragen, props.stufe4_fragen, props.stufe5_fragen]);


	function handleStufe1Fertig(antworten) {
		setStufe1Antworten(antworten);
		setPreRevealStage('revealDone');
	}

	function handleStufe3Fertig(antworten, ergebnisse) {
		// Speichere die Ergebnisse für Gesamtscore
		if (ergebnisse) {
			setStufe3Ergebnisse(ergebnisse);
		}
		
		// Antworten: [peak_value, peak_frequency, comparison(ja/nein), left_count, right_count]
		const peakVal = Number(antworten?.[0]);
		const peakFreq = Number(antworten?.[1]);
		const comparison = (antworten?.[2] || '').toString();
		const leftCount = Number(antworten?.[3]);
		const rightCount = Number(antworten?.[4]);
		
		if (visualizerRef.current && distributionRef.current) {
			visualizerRef.current.drawAxes(distributionRef.current);
			// Echten Hochpunkt berechnen
			const histogram = new Array(21).fill(0);
			distributionRef.current.forEach(v => {
				const val = Math.max(0, Math.min(20, Math.round(v)));
				histogram[val]++;
			});
			const truePeakIdx = histogram.indexOf(Math.max(...histogram));
			const truePeakCount = histogram[truePeakIdx];
			const leftIdxSt3 = Math.max(0, truePeakIdx - 1);
			const rightIdxSt3 = Math.min(20, truePeakIdx + 1);
			
			// Wenn nur 2 Antworten vorhanden (nach erster Auswertung): Zeige nur Hochpunkt-Marker
			if (antworten.length === 2 || (!comparison && peakVal && peakFreq)) {
				const markersSt3 = [{ value: truePeakIdx, frequency: truePeakCount }];
				visualizerRef.current.drawMultiplePeakMarkers(markersSt3);
				// Zeichne grauen Balken für User-Schätzung
				visualizerRef.current.drawGuessBars([
					{ value: peakVal, frequency: peakFreq }
				]);
			} else if (comparison) {
				// Alle 5 Antworten vorhanden: Zeige Hochpunkt + Nachbarn
				const markersSt3 = [{ value: truePeakIdx, frequency: truePeakCount }];
				if (leftIdxSt3 !== truePeakIdx) markersSt3.push({ value: leftIdxSt3, frequency: histogram[leftIdxSt3] });
				if (rightIdxSt3 !== truePeakIdx) markersSt3.push({ value: rightIdxSt3, frequency: histogram[rightIdxSt3] });
				visualizerRef.current.drawMultiplePeakMarkers(markersSt3);
				// Zeichne graue Balken für alle User-Schätzungen
				visualizerRef.current.drawGuessBars([
					{ value: peakVal, frequency: peakFreq },
					{ value: leftCount !== undefined ? leftIdxSt3 : peakVal, frequency: leftCount || 0 },
					{ value: rightCount !== undefined ? rightIdxSt3 : peakVal, frequency: rightCount || 0 }
				]);
			}
			
			visualizerRef.current.setPreRevealAnswers({
				peak_value: peakVal,
				peak_frequency: peakFreq,
				additional_peaks: [],
				comparison_answer: comparison || null,
				neighbor_left_count: leftCount,
				neighbor_right_count: rightCount
			});
		}
		
		// Aktiviere Zeichenmodus nur, wenn alle Fragen beantwortet wurden
		if (comparison) {
			setPreRevealStage('ready');
			visualizerRef.current?.setDrawMode(true);
		}
	}
	function handleStufe2Fertig(antworten) {
		setStufe2Antworten(antworten);
		setPreRevealStage('revealDone');
	}(level && level.welt === 1 && level.stufe === 5 ? 'full-draw-no-questions' : 'full-draw')

	// Dynamische UI je nach InputMode
	const inputMode = visualizerRef.current?.getInputMode ? visualizerRef.current.getInputMode() : (level && level.welt === 1 && level.stufe === 1 ? 'multiple-choice' : (level && level.welt === 1 && level.stufe === 2 ? 'freitext' : 'full-draw'));
	// Verwende direkt die Props statt lokale States für Stufe 3/4
	const currentStufeFragen = level && level.welt === 1 && level.stufe === 3 ? (props.stufe3_fragen || stufe3Fragen) : (level && level.welt === 1 && level.stufe === 4 ? (props.stufe4_fragen || stufe4Fragen) : []);

	// Hilfsfunktion: Zurück zum Leiterspiel
	function goBackToLeiterspiel(){
		const base = window.location.origin;
		const params = new URLSearchParams();
		params.set('welt', String((level && level.welt) ? level.welt : 1));
		params.set('stufe', String((level && level.stufe) ? level.stufe : 1));
		if (evaluationResult && typeof evaluationResult.score === 'number') {
			params.set('score', String(evaluationResult.score));
			params.set('autoComplete', '1'); // Automatisch abschließen
		}
		window.location.href = base + "/leiterspiel/LEITERSPIELFINAL.html?" + params.toString();
	}

	return (
		<div>
			{showIntroduction ? (
				<div className="flex items-center justify-center min-h-screen bg-gray-100">
					<div className="max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-lg">
						<h2 className="text-2xl font-bold mb-6 text-center text-blue-600">Willkommen zu Level 1!</h2>
						<div className="space-y-4 text-lg text-gray-700 mb-8">
							<p className="flex items-start">
								<span className="text-orange-500 font-bold mr-2">•</span>
								<span>Bewege den <strong className="text-orange-500">orangenen Cursor</strong> <span className="text-sm text-gray-600">(nach ganz unten scrollen)</span> unten mit der Maus, um den <strong className="text-orange-500">orangenen Ball</strong> zu treffen.</span>
							</p>
							<p className="flex items-start">
								<span className="text-orange-500 font-bold mr-2">•</span>
								<span>Schieße damit die Blöcke ab!</span>
							</p>
							<p className="flex items-start">
								<span className="text-blue-500 font-bold mr-2">•</span>
								<span><strong>Achte auf die Zahlen in den Ballons</strong> – sie sind wichtig für die späteren Fragen!</span>
							</p>
							<p className="flex items-start">
								<span className="text-green-500 font-bold mr-2">•</span>
								<span>Du musst die Ballons <strong>nicht</strong> mit dem orangenen Cursor treffen – sie bleiben automatisch im Sichtfeld.</span>
							</p>
							<p className="flex items-start">
								<span className="text-purple-500 font-bold mr-2">•</span>
								<span>Bei den anschließenden Fragen wird von <strong>allen 10 Ballons</strong> ausgegangen, nicht nur von denen, die du getroffen hast.</span>
							</p>
						</div>
						<div className="flex justify-center">
							<button
								onClick={() => {
									setShowIntroduction(false);
									setGameActive(true);
								}}
								className="px-8 py-3 bg-green-500 text-white text-xl font-bold rounded-lg hover:bg-green-600 transition-colors shadow-md"
							>
								Verstanden – Los geht's!
							</button>
						</div>
					</div>
				</div>
			) : gameActive ? (
				<GameCommon {...props} gameMode="number" onGameEnd={handleGameEnd} />
			) : (
				<div className="mx-auto">
					{/* Headline je nach Modus */}
					{inputMode === 'multiple-choice' && (
						<h2 className="text-center text-xl font-bold mb-4">Beantworte die Multiple-Choice-Fragen</h2>
					)}
					{inputMode === 'single-question' && (
						<h2 className="text-center text-xl font-bold mb-4">Beantworte die aktuelle Frage</h2>
					)}
					{(inputMode === 'full-draw' || inputMode === 'full-draw-no-questions') && (
						<h2 className="text-center text-xl font-bold mb-4">Zeichne die Zahlenverteilung (0-20)</h2>
					)}
					<div className="flex flex-col items-center">
						{/* Fragen-Flow je nach Modus */}
						{inputMode === 'multiple-choice' && stufe1Fragen.length > 0 && preRevealStage !== 'revealDone' ? (
							<W1S1MultipleChoice sessionId={sessionId} fragen={stufe1Fragen} onAntwortenFertig={handleStufe1Fertig} />
						) : null}
						{inputMode === 'freitext' && stufe2Fragen.length > 0 && preRevealStage !== 'revealDone' ? (
							<W1S2Freitext sessionId={sessionId} fragen={stufe2Fragen} onAntwortenFertig={handleStufe2Fertig} />
						) : null}
						{/* Stufe 3: zeige Fragen+Auswertung vor dem Zeichnen */}
						{inputMode !== 'multiple-choice' && inputMode !== 'freitext' && inputMode !== 'full-draw-no-questions' && preRevealStage && preRevealStage !== 'ready' && preRevealStage !== 'revealDone' && level && level.welt === 1 && level.stufe === 3 ? (
						<W1S3Questions sessionId={sessionId} fragen={currentStufeFragen || []} onAntwortenFertig={handleStufe3Fertig} distributionLength={distributionRef.current ? distributionRef.current.length : 0} />
						) : null}
						{inputMode !== 'multiple-choice' && inputMode !== 'freitext' && inputMode !== 'full-draw-no-questions' && preRevealStage && preRevealStage !== 'ready' && preRevealStage !== 'revealDone' && !(level && level.welt === 1 && level.stufe === 3) && (
							<div className="mb-3 p-3 bg-white border-2 border-gray-300 rounded-lg max-w-md text-gray-800">
								{/* Multiple-Choice: Nur Peak-Wert und Häufigkeit */}
								{inputMode === 'multiple-choice' && (
									<>
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
												<div className="text-sm text-gray-600 mb-2">Tipp: Es gab insgesamt {distributionRef.current ? distributionRef.current.length : '?'} Ballons</div>
												<div className="flex items-center gap-2">
													<input
														type="number"
														min={0}
														max={distributionRef.current ? distributionRef.current.length : 50}
														value={peakFrequencyInput}
														onChange={(e) => setPeakFrequencyInput(e.target.value)}
														className="px-3 py-2 border rounded w-28"
														placeholder="z.B. 8"
													/>
													<button onClick={handleSubmitPeakFrequency} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Fertig</button>
												</div>
											</div>
										)}
									</>
								)}
								{/* Single-Question: Nur Peak-Wert */}
								{inputMode === 'single-question' && preRevealStage === 'askPeakValue' && (
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
											<button onClick={handleSubmitPeakValue} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Fertig</button>
										</div>
									</div>
								)}
								{/* Full-Draw: Alle Fragen */}
								{inputMode === 'full-draw' && (
									<>
										{preRevealStage === 'askPeakValue' && (
											<div>
												<div className="font-bold mb-2">{currentStufeFragen?.[0]?.frage || 'Welchen Zahlenwert hast du am häufigsten gesehen? (0-20)'}</div>
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
												<div className="font-bold mb-2">{currentStufeFragen?.[1]?.frage || `Wie oft (ungefähr) kam der Wert ${guessPeakValue} vor?`}</div>
												<div className="text-sm text-gray-600 mb-2">Tipp: Es gab insgesamt {distributionRef.current ? distributionRef.current.length : '?'} Ballons</div>
												<div className="flex items-center gap-2">
													<input
														type="number"
														min={0}
														max={distributionRef.current ? distributionRef.current.length : 50}
														value={peakFrequencyInput}
														onChange={(e) => setPeakFrequencyInput(e.target.value)}
														className="px-3 py-2 border rounded w-28"
														placeholder="z.B. 8"
													/>
													<button onClick={handleSubmitPeakFrequency} className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">Weiter</button>
												</div>
											</div>
										)}
										{preRevealStage === 'askAdditionalPeaks' && (
											<div>
												{(level && level.welt === 1 && (level.stufe === 4)) ? (
													<>
														<div className="font-bold mb-2">{currentStufeFragen?.[2]?.frage || 'War der Wert rechts vom Hochpunkt häufiger? (ja/nein)'}</div>
														<div className="flex gap-4">
															<button
																type="button"
																className={`flex-1 px-4 py-2 rounded border-2 ${comparisonInput === 'ja' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-black border-gray-300'}`}
																onClick={() => setComparisonInput('ja')}
															>
																Ja
															</button>
															<button
																type="button"
																className={`flex-1 px-4 py-2 rounded border-2 ${comparisonInput === 'nein' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-black border-gray-300'}`}
																onClick={() => setComparisonInput('nein')}
															>
																Nein
															</button>
														</div>
														{(level && level.welt === 1 && level.stufe === 3) && (
															<div className="mt-4 space-y-3">
																<div>
																	<div className="font-bold mb-1">{currentStufeFragen?.[3]?.frage || 'Wie oft hast du die Zahl (Hochpunkt−1) gesehen?'}</div>
																	<input
																		type="number"
																		min={0}
																		value={neighborLeftCountInput}
																		onChange={(e) => setNeighborLeftCountInput(e.target.value)}
																		className="px-3 py-2 border rounded w-32"
																		placeholder="Anzahl"
																	/>
																</div>
																<div>
																	<div className="font-bold mb-1">{currentStufeFragen?.[4]?.frage || 'Wie oft hast du die Zahl (Hochpunkt+1) gesehen?'}</div>
																	<input
																		type="number"
																		min={0}
																		value={neighborRightCountInput}
																		onChange={(e) => setNeighborRightCountInput(e.target.value)}
																		className="px-3 py-2 border rounded w-32"
																		placeholder="Anzahl"
																	/>
																</div>
															</div>
														)}
														{(level && level.welt === 1 && level.stufe === 4) && (
															<div className="mt-4 space-y-3">
																<div>
																	<div className="font-bold mb-2">{currentStufeFragen?.[3]?.frage || 'Welche der folgenden Zahlen hast du gar nicht gesehen?'}</div>
																	<div className="flex gap-4">
																		{(() => {
																			// Hole die Optionen aus dem Fragen-Objekt
																			let opts = currentStufeFragen?.[3]?.optionen;
																			
																			console.log('🔍 Frage 4 Debug:', {
																				frageText: currentStufeFragen?.[3]?.frage,
																				optionen: opts,
																				fullQuestion: currentStufeFragen?.[3]
																			});
																			
																			// Fallback: Extrahiere aus dem Fragetext, falls optionen nicht verfügbar
																			if (!opts || opts.length === 0) {
																				const frageText = currentStufeFragen?.[3]?.frage || '';
																				const match = frageText.match(/\((\d+),\s*(\d+),\s*(\d+)\)/);
																				if (match) {
																					opts = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
																					console.log('✅ Optionen aus Fragetext extrahiert:', opts);
																				}
																			}
																			
																			if (opts && opts.length > 0) {
																				return opts.map((opt, idx) => (
																					<button
																						key={idx}
																						type="button"
																						className={`flex-1 px-4 py-2 rounded border-2 ${
																							unseenNumberInput === String(opt)
																								? 'bg-blue-600 text-white border-blue-600'
																								: 'bg-white text-black border-gray-300'
																						}`}
																						onClick={() => setUnseenNumberInput(String(opt))}
																					>
																						{opt}
																					</button>
																				));
																			} else {
																				return <div className="text-red-500">Fehler: Optionen nicht verfügbar.</div>;
																			}
																		})()}
																	</div>
																</div>
																<div>
																	<div className="font-bold mb-2">{currentStufeFragen?.[4]?.frage || 'War der Durchschnitt größer als X?'}</div>
																	<div className="flex gap-4">
																		<button
																			type="button"
																			className={`flex-1 px-4 py-2 rounded border-2 ${
																				averageComparisonInput === 'ja'
																					? 'bg-blue-600 text-white border-blue-600'
																					: 'bg-white text-black border-gray-300'
																			}`}
																			onClick={() => setAverageComparisonInput('ja')}
																		>
																			Ja
																		</button>
																		<button
																			type="button"
																			className={`flex-1 px-4 py-2 rounded border-2 ${
																				averageComparisonInput === 'nein'
																					? 'bg-blue-600 text-white border-blue-600'
																					: 'bg-white text-black border-gray-300'
																			}`}
																			onClick={() => setAverageComparisonInput('nein')}
																		>
																			Nein
																		</button>
																	</div>
																</div>
															</div>
														)}
														<div className="flex items-center gap-2 mt-3">
															<button 
																onClick={handleFinishAdditionalPeaks} 
																className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
															>
																Weiter zum Zeichnen
															</button>
														</div>
													</>
												) : (
													<>
														<div className="font-bold mb-2">Hast du noch andere Zahlenwerte häufig gesehen?</div>
														<div className="text-sm text-gray-600 mb-3">Gib weitere markante Werte an (optional)</div>
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
																max={distributionRef.current ? distributionRef.current.length : 50}
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
													</>
												)}
											</div>
										)}
									</>
								)}
							</div>
						)}
						{/* Canvas und Visualizer - NUR anzeigen wenn alle Fragen beantwortet (preRevealStage ready/revealDone) */}
						{(inputMode === 'full-draw' || inputMode === 'full-draw-no-questions') && (preRevealStage === 'ready' || preRevealStage === 'revealDone' || inputMode === 'full-draw-no-questions') && (
							<>
								{level && level.stufe === 5 ? (
									<canvas ref={canvasRef} width={800} height={400} className="mx-auto border-2 border-gray-300 bg-white" />
								) : (
									<canvas ref={canvasRef} width={530} height={370} className="mx-auto border-2 border-gray-300 bg-white cursor-crosshair" />
								)}
								{/* Level 5: Histogramm-Tabelle für Werteeingabe */}
								{level && level.stufe === 5 && (
									<div className="mt-4 w-full max-w-[820px] mx-auto">
										<h3 className="text-lg font-bold mb-3 text-center">Gib die Häufigkeit für jeden Wert ein:</h3>
										<div className="bg-white border-2 border-gray-300 rounded p-4 overflow-x-auto">
											<div className="flex gap-2 min-w-max">
												{Array.from({ length: 21 }, (_, i) => i).map((value) => (
													<div key={value} className="flex flex-col items-center">
														<label className="text-xs font-semibold mb-1 text-gray-700 whitespace-nowrap">{value}</label>
														<input
															type="number"
															min={0}
															max={distributionRef.current ? distributionRef.current.length : 100}
															value={histogramInputs[value]}
															onChange={(e) => {
																const newInputs = [...histogramInputs];
																newInputs[value] = e.target.value;
																setHistogramInputs(newInputs);
															}}
															className="w-12 px-1 py-2 border rounded text-center text-black text-sm"
															placeholder="0"
														/>
													</div>
												))}
											</div>
											<div className="text-sm text-gray-500 mt-3 text-center">
												Tipp: Es gab insgesamt {distributionRef.current ? distributionRef.current.length : '?'} Ballons
											</div>
										</div>
									</div>
								)}
							</>
						)}
						
						{/* Gesamtscore für Level 3, 4 und 5 anzeigen */}
						{evaluationResult && level && level.welt === 1 && (level.stufe === 3 || level.stufe === 4 || level.stufe === 5) && (
							<div className="w-full max-w-md mx-auto mt-8">
								<h2 className="text-2xl font-bold mb-4 text-center">Gesamtergebnis</h2>
								<div className="bg-blue-100 p-6 rounded-lg text-center">
									<div className="text-4xl font-bold text-blue-800 mb-2">{evaluationResult.score}%</div>
									{!(level.stufe === 5) && (
										<div className="text-xl text-gray-800 mb-4">
											{evaluationResult.correct_count} von {evaluationResult.total} Fragen richtig
										</div>
									)}
									<div className={`text-lg font-bold ${evaluationResult.score >= 60 ? 'text-green-700' : 'text-red-700'}`}>
										{evaluationResult.score >= 60 ? '✓ Bestanden' : '✗ Nicht bestanden'}
									</div>

									{/* Stufe 5: Transparente, stichpunktartige Zusammensetzung des Scores */}
									{level.stufe === 5 && evaluationResult?.details && (
										<div className="mt-4 bg-white/70 border border-gray-200 rounded p-4 text-left">
											<div className="text-sm font-semibold text-gray-700 mb-2">Zusammensetzung des Scores</div>
											<ul className="list-disc pl-5 text-sm text-gray-800 space-y-1">
												<li>Fehleranteil (40%): {Math.round(((evaluationResult.details.error_score || evaluationResult.details.error) || 0) * 40)}%</li>
												<li>Formähnlichkeit (30%): {Math.round((evaluationResult.details.form_score || 0) * 30)}%</li>
												<li>Hochpunkt-Position (15%): {Math.round((evaluationResult.details.peak_pos_score || 0) * 15)}%</li>
												<li>Hochpunkt-Höhe (15%): {Math.round((evaluationResult.details.peak_height_score || 0) * 15)}%</li>
											</ul>
										</div>
									)}
								</div>

								{level.stufe === 4 && Array.isArray(evaluationResult.results) && (
									<div className="bg-gray-800 p-4 rounded mt-4">
										<div className="mb-2 text-white font-semibold">Auswertung der Fragen</div>
										<div className="space-y-2">
											{evaluationResult.results.map((r, i) => (
												<div key={i} className={`p-2 rounded ${r.is_correct ? 'bg-green-700 text-white' : 'bg-red-700 text-white'}`}>
													<div className="font-semibold">{r.frage}</div>
													<div className="text-sm">Deine Antwort: <span className="font-mono">{r.selected_value ?? '—'}</span></div>
													<div className="text-sm">Richtige Antwort: <span className="font-mono">{r.korrekt ?? '—'}</span></div>
												</div>
											))}
										</div>
									</div>
								)}
							</div>
						)}
					</div>
					<div className="text-center mt-4 flex justify-center flex-wrap gap-2">
						{/* Buttons nur anzeigen, wenn Zeichnen erlaubt ist */}
						{(inputMode === 'full-draw' || inputMode === 'full-draw-no-questions') ? (
							<>
								{preRevealStage !== 'revealDone' && !evaluationResult ? (
									<>
										<button 
											onClick={() => visualizerRef.current?.clear()}
											className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
										>
											Löschen
										</button>
										<button 
											onClick={async () => {
												// Level 5: Keine Zeichnung erforderlich
												if (level && level.stufe === 5) {
													if (preRevealStage !== 'revealDone' && distributionRef.current && visualizerRef.current) {
														visualizerRef.current.drawCombined(distributionRef.current, true);
														visualizerRef.current.setReadOnly(true);
														setPreRevealStage('revealDone');
													}
													return;
												}
												// Andere Level: Prüfe ob Zeichnung vorhanden
												if (!visualizerRef.current?.hasDrawing()) {
													alert('Bitte zeichne zuerst eine Verteilung!');
													return;
												}
												if (preRevealStage !== 'ready' && preRevealStage !== 'revealDone') {
													alert('Bitte beantworte erst alle Fragen bevor du evaluierst!');
													return;
												}
												if (preRevealStage !== 'revealDone' && distributionRef.current && visualizerRef.current) {
													// Marker + Truth Bars sind bereits sichtbar, zeige nur die volle Verteilung
													visualizerRef.current.drawCombined(distributionRef.current);
													visualizerRef.current.setReadOnly(true);
													setPreRevealStage('revealDone');
												}
											}}
											disabled={!(preRevealStage === 'ready' || (level && level.stufe === 5))}
											className={`px-4 py-2 rounded ${(preRevealStage === 'ready' || (level && level.stufe === 5)) ? 'bg-green-500 hover:bg-green-600 text-white' : 'bg-gray-300 text-gray-600 opacity-50 cursor-not-allowed'}`}
										>
											Referenzkurve anzeigen
										</button>
									</>
								) : null}
								{preRevealStage === 'revealDone' && (
									<button 
										onClick={async () => {
											// Level 3: Berechne aus den beiden Teilergebnissen
											if (level && level.stufe === 3 && stufe3Ergebnisse) {
												const { step1Ergebnis, step2Ergebnis } = stufe3Ergebnisse;
												const total = (step1Ergebnis?.total || 0) + (step2Ergebnis?.total || 0);
												const correct = (step1Ergebnis?.correct_count || 0) + (step2Ergebnis?.correct_count || 0);
												const score = total > 0 ? Math.round((correct / total) * 100) : 0;
												
												setEvaluationResult({
													score,
													total,
													correct_count: correct
												});
											}
											// Level 4: Evaluiere die Fragen via Backend
											else if (level && level.stufe === 4) {
												try {
													const antworten = [
														String(guessPeakValue),
														String(guessPeakFrequency),
														String(comparisonInput),
														String(unseenNumberInput),
														String(averageComparisonInput)
													];
													const res = await fetch('http://127.0.0.1:3000/evaluate-w1s4', {
														method: 'POST',
														headers: { 'Content-Type': 'application/json' },
														body: JSON.stringify({ session_id: sessionId, antworten })
													});
													if (!res.ok) {
														const t = await res.text();
														console.error('evaluate-w1s4 failed:', res.status, t);
														alert('Serverfehler bei der Auswertung');
														return;
													}
													const json = await res.json();
													if (json?.status === 'ok' && json.evaluation) {
														const ev = json.evaluation;
														const score = Math.round(ev.questions_score * 100);
														setEvaluationResult({
															score,
															total: ev.total,
															correct_count: ev.correct_count,
															results: ev.results
														});
													} else {
														console.error('unexpected response', json);
														alert('Ungültige Serverantwort');
													}
												} catch (e) {
													console.error(e);
													alert('Netzwerkfehler bei der Auswertung');
												}
											}
											// Level 5: Evaluiere Histogramm-Eingaben
											else if (level && level.stufe === 5) {
												try {
													const histogram_inputs = histogramInputs.map(v => Number(v) || 0);
													const res = await fetch('http://127.0.0.1:3000/evaluate-w1s5', {
														method: 'POST',
														headers: { 'Content-Type': 'application/json' },
														body: JSON.stringify({ session_id: sessionId, histogram_inputs })
													});
													if (!res.ok) {
														const t = await res.text();
														console.error('evaluate-w1s5 failed:', res.status, t);
														alert('Serverfehler bei der Auswertung');
														return;
													}
													const json = await res.json();
													if (json?.status === 'ok' && json.evaluation) {
														const ev = json.evaluation;
														setEvaluationResult({
															score: ev.score,
															// Für Stufe 5 keine "x von y richtig" Anzeige mehr
															// sondern detaillierte Komponenten aus dem Backend anzeigen
															details: ev.details || null
														});
													} else {
														console.error('unexpected response', json);
														alert('Ungültige Serverantwort');
													}
												} catch (e) {
													console.error(e);
													alert('Netzwerkfehler bei der Auswertung');
												}
											}
										}}
										className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
									>
										Gesamtscore anzeigen
									</button>
								)}

									{/* Nach der Auswertung: Zurück zum Leiterspiel */}
									{(preRevealStage === 'revealDone' || evaluationResult) && (
										<button
											onClick={goBackToLeiterspiel}
											className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-800"
										>
											Zurück zum Leiterspiel
										</button>
									)}
							</>
						) : null}
					</div>
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
