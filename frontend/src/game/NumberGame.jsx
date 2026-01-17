import React, { useState, useRef, useEffect } from "react";
import GameCommon from "./GameCommon";
import { NumberDistributionVisualizer } from "../visualizer/NumberDistributionVisualizer";
import W1S1MultipleChoice from "../visualizer/w1s1.jsx";

export default function NumberGame(props) {
	const { sessionId, level, onRestartGame } = props;
	const [gameActive, setGameActive] = useState(true);
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
	const canvasRef = useRef(null);
	const visualizerRef = useRef(null);
		const distributionRef = useRef(null);
	const [stufe1Fragen, setStufe1Fragen] = useState([]);
	const [stufe1Antworten, setStufe1Antworten] = useState([]);

	// Callback für Spielende: Zeige Visualizer/Fragen
	const handleGameEnd = (payload) => {
		distributionRef.current = payload.distribution;
		setGameActive(false);
		setPreRevealStage('askPeakValue');
		setGuessPeakValue(null);
		setGuessPeakFrequency(null);
		setPeakValueInput('');
		setPeakFrequencyInput('');
		setAdditionalPeaks([]);
		setAdditionalValueInput('');
		setAdditionalFreqInput('');
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
		// Standardfall: Zeichnen wie gehabt
		if (visualizerRef.current && distributionRef.current) {
			visualizerRef.current.drawAxes(distributionRef.current);
			const allPeakValues = [guessPeakValue, ...additionalPeaks.map(p => p.value)];
			const allPeaks = [
				{ value: guessPeakValue, frequency: guessPeakFrequency },
				...additionalPeaks
			];
			visualizerRef.current.setPreRevealAnswers({
				peak_value: guessPeakValue,
				peak_frequency: guessPeakFrequency,
				additional_peaks: additionalPeaks
			});
			visualizerRef.current.drawTruthBarsForValues(distributionRef.current, allPeakValues);
			visualizerRef.current.drawMultiplePeakMarkers(allPeaks);
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
			visualizerRef.current.setDrawMode(false);
			visualizerRef.current.setBlockMode?.(blockMode);
			visualizerRef.current.drawAxes(distributionRef.current);
		}
	}, [gameActive, sessionId, blockMode, level]);

	// Fragen für Stufe 1 aus level_info laden, wenn vorhanden
	useEffect(() => {
		if (!gameActive && level && level.welt === 1 && level.stufe === 1 && props.stufe1_fragen) {
			setStufe1Fragen(props.stufe1_fragen);
		}
	}, [gameActive, level, props.stufe1_fragen]);

	function handleStufe1Fertig(antworten) {
		setStufe1Antworten(antworten);
		setPreRevealStage('revealDone');
	}

	// Dynamische UI je nach InputMode
	const inputMode = visualizerRef.current?.getInputMode ? visualizerRef.current.getInputMode() : (level && level.welt === 1 && level.stufe === 1 ? 'multiple-choice' : (level && level.welt === 1 && level.stufe === 2 ? 'single-question' : 'full-draw'));

	return (
		<div>
			{gameActive ? (
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
					{inputMode === 'full-draw' && (
						<h2 className="text-center text-xl font-bold mb-4">Zeichne die Zahlenverteilung (0-20)</h2>
					)}
					<div className="flex flex-col items-center">
						{/* Fragen-Flow je nach Modus */}
						{inputMode === 'multiple-choice' && stufe1Fragen.length > 0 && preRevealStage !== 'revealDone' ? (
							<W1S1MultipleChoice sessionId={sessionId} fragen={stufe1Fragen} onAntwortenFertig={handleStufe1Fertig} />
						) : null}
						{inputMode !== 'multiple-choice' && preRevealStage && preRevealStage !== 'ready' && preRevealStage !== 'revealDone' && (
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
										{preRevealStage === 'askAdditionalPeaks' && (
											<div>
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
									</>
								)}
							</div>
						)}
						{/* Canvas und Visualizer nur bei full-draw anzeigen */}
						{inputMode === 'full-draw' && (
							<canvas ref={canvasRef} width={530} height={370} className="mx-auto border-2 border-gray-300 bg-white cursor-crosshair" />
						)}
					</div>
					<div className="text-center mt-4 flex justify-center flex-wrap gap-2">
						{/* Buttons nur anzeigen, wenn Zeichnen erlaubt ist */}
						{inputMode === 'full-draw' && !evaluationResult ? (
							<>
								<button 
									onClick={() => visualizerRef.current?.clear()}
									className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
								>
									Löschen
								</button>
								<button 
									onClick={async () => {
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
										const result = await visualizerRef.current?.evaluateDrawing();
										if (result) {
											setEvaluationResult(result);
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
						) : inputMode === 'full-draw' ? (
							<>
								<button 
									onClick={() => {
										visualizerRef.current?.drawCombined(distributionRef.current);
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
										setPreRevealStage(null);
										setGuessPeakValue(null);
										setGuessPeakFrequency(null);
										setPeakValueInput('');
										setPeakFrequencyInput('');
										setAdditionalPeaks([]);
										setAdditionalValueInput('');
										setAdditionalFreqInput('');
										if (onRestartGame) {
											onRestartGame();
										}
									}}
									className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
								>
									Spiel neu starten
								</button>
							</>
						) : null}
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
