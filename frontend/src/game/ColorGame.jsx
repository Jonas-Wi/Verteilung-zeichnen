import React, { useState, useRef, useEffect } from "react";
import GameCommon from "./GameCommon";
import { ColorDistributionVisualizer } from "../visualizer/ColorDistributionVisualizer";

export default function ColorGame(props) {
	const { sessionId, level, onRestartGame } = props;
	const [gameActive, setGameActive] = useState(true);
	const [evaluationResult, setEvaluationResult] = useState(null);
	const [blockMode, setBlockMode] = useState(false);
	const [preRevealStage, setPreRevealStage] = useState(null);
	const [guessColor, setGuessColor] = useState(null);
	const [guessPercent, setGuessPercent] = useState(null);
	const [percentInput, setPercentInput] = useState("");
	const canvasRef = useRef(null);
	const visualizerRef = useRef(null);
	const distributionRef = useRef(null);

	// Callback für Spielende: Zeige Visualizer/Fragen
	const handleGameEnd = (payload) => {
		distributionRef.current = payload.distribution;
		setGameActive(false);
		setPreRevealStage('askColor');
		setGuessColor(null);
		setGuessPercent(null);
		setPercentInput('');
		setEvaluationResult(null);
	};

	// Pre-Reveal-Fragen
	function handleSubmitColor(choice) {
		setGuessColor(choice);
		setPreRevealStage('askPercent');
	}
	function handleSubmitPercent() {
		const p = Number(percentInput);
		if (!Number.isFinite(p) || p < 0 || p > 100) {
			alert('Bitte gib eine gültige Prozentzahl zwischen 0 und 100 an.');
			return;
		}
		setGuessPercent(p);
		setPreRevealStage('ready');
		if (distributionRef.current && visualizerRef.current) {
			const dist = distributionRef.current;
			// Highlight-Balken
			const { highIdx, lowIdx } = computeHighLowIndices(dist, 3);
			visualizerRef.current.drawAxes(dist);
			visualizerRef.current.drawHighlight(dist, highIdx, lowIdx, 'rgba(0,200,0,0.95)', 'rgba(0,100,200,0.95)');
		}
		visualizerRef.current?.setDrawMode(true);
	}

	// Helper: compute highest index and the lowest index among bars >= minLowPercent
	function computeHighLowIndices(dist, minLowPercent = 3) {
		if (!dist || dist.length === 0) return { highIdx: -1, lowIdx: -1 };
		let highIdx = 0;
		for (let i = 0; i < dist.length; i++) {
			if (dist[i] > dist[highIdx]) highIdx = i;
		}
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
			lowIdx = 0;
			for (let i = 0; i < dist.length; i++) {
				if (dist[i] < dist[lowIdx]) lowIdx = i;
			}
		}
		return { highIdx, lowIdx };
	}

	// Initialisiere Visualizer, wenn Spiel endet
	useEffect(() => {
		if (!gameActive && distributionRef.current && canvasRef.current) {
			if (!visualizerRef.current) {
				visualizerRef.current = new ColorDistributionVisualizer(canvasRef.current, sessionId, level);
			}
			visualizerRef.current.setDrawMode(false);
			visualizerRef.current.setBlockMode?.(blockMode);
			visualizerRef.current.drawAxes(distributionRef.current);
		}
	}, [gameActive, sessionId, blockMode]);

	return (
		<div>
			{gameActive ? (
				<GameCommon {...props} gameMode="color" onGameEnd={handleGameEnd} />
			) : (
				<div className="mx-auto">
					<h2 className="text-center text-xl font-bold mb-4">Zeichne die Verteilung</h2>
					<div className="flex flex-col items-center">

						{/* Pre-reveal questions and highlight flow */}
						{preRevealStage && preRevealStage !== 'ready' && preRevealStage !== 'revealDone' && (
							<div className="mb-3 p-3 bg-white border-2 border-gray-300 rounded-lg max-w-md text-gray-800">
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
							</div>
						)}
						<canvas ref={canvasRef} width={530} height={370} className="mx-auto border-2 border-gray-300 bg-white cursor-crosshair" />
					</div>
					<div className="text-center mt-4 flex justify-center flex-wrap gap-2">
						{!evaluationResult ? (
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
											const dist = distributionRef.current;
											const { highIdx, lowIdx } = computeHighLowIndices(dist, 3);
											visualizerRef.current.drawAxes(dist);
											visualizerRef.current.drawHighlight(dist, highIdx, lowIdx, 'rgba(0,200,0,0.95)', 'rgba(0,100,200,0.95)');
											await new Promise((res) => setTimeout(res, 1500));
											visualizerRef.current.drawCombined(dist);
											visualizerRef.current.setReadOnly(true);
											setPreRevealStage('revealDone');
										}
										const result = await visualizerRef.current?.evaluateDrawing();
										if (result) {
											setEvaluationResult(result);
											setPreRevealStage('revealDone');
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
										setGuessColor(null);
										setGuessPercent(null);
										setPercentInput('');
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
								<MetricRow label="MAE" value={evaluationResult.mae} max={1} precision={4} color="bg-yellow-400" />
								<MetricRow label="MSE" value={evaluationResult.mse} max={1} precision={6} color="bg-orange-400" />
								<MetricRow label="Wasserstein" value={evaluationResult.wasserstein} max={1} precision={4} color="bg-red-400" />
								<MetricRow label="TVD" value={evaluationResult.tvd} max={1} precision={4} color="bg-purple-400" />
								<MetricRow label="Abs. Mittelwertfehler" value={evaluationResult.abs_mean_error} max={100} precision={2} color="bg-green-400" suffix=" units" />
								<MetricRow label="Abs. Std-Abweichung" value={evaluationResult.abs_std_error} max={100} precision={2} color="bg-indigo-400" suffix=" units" />
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

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
