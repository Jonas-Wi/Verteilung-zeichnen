"""W1S3Evaluation

Evaluiert die Freitext-Antworten der Welt 1, Stufe 3 Fragen sowie die gezeichnete Verteilung.
- Fragen: 70% Gewichtung
- Zeichnung: 30% Gewichtung (primär über ZahlenEvaluator; Fallback RMSE)
"""
from typing import List, Dict, Any
from zahlenevaluation.zahlen_evaluator import ZahlenEvaluator
try:
    from . import HistogrammEvaluator as _he
except ImportError:
    import zahlenevaluation.HistogrammEvaluator as _he
import math

class W1S3Evaluation:
    """
    Prüft Antworten für Stufe 3 Freitext-Fragen und bewertet die gezeichnete Verteilung.
    
    Usage:
        ev = W1S3Evaluation(fragen, antworten, ground_truth_histogram, player_drawn_histogram)
        result = ev.evaluate()
    
    - `fragen` ist eine Liste von Dicts mit Schlüsseln: 'frage', 'korrekt'
    - `antworten` ist eine Liste von Strings (User-Eingaben), parallele Reihenfolge
    - `ground_truth_histogram` ist die wahrhafte Häufigkeitsverteilung (Liste von Counts)
    - `player_drawn_histogram` ist die vom Spieler gezeichnete Verteilung (Liste von Counts)
    """
    def __init__(self, fragen: List[Dict[str, Any]], antworten: List[str], 
                 ground_truth_histogram: List[int], player_drawn_histogram: List[int]):
        self.fragen = fragen or []
        self.antworten = antworten or []
        self.ground_truth_histogram = ground_truth_histogram or []
        self.player_drawn_histogram = player_drawn_histogram or []

    def _normalize_hist(self, counts: List[int]) -> List[float]:
        s = sum(counts)
        if s <= 0:
            return [0.0] * len(counts)
        return [c / s for c in counts]

    def _expand_hist_to_samples(self, counts: List[int]) -> List[int]:
        """Erzeugt eine Sample-Liste aus Histogramm-Counts (Index i wiederholt count[i] Mal)."""
        samples: List[int] = []
        if not counts:
            return samples
        for i, c in enumerate(counts):
            if c and c > 0:
                samples.extend([i] * int(c))
        return samples

    def _calculate_rmse(self) -> float:
        """
        Berechnet den RMSE zwischen wahrer und gezeichneter Verteilung.
        RMSE = sqrt(mean((true - predicted)^2))
        """
        if not self.ground_truth_histogram or not self.player_drawn_histogram:
            return float('inf')
        
        # Beide Arrays sollten die gleiche Länge haben
        min_len = min(len(self.ground_truth_histogram), len(self.player_drawn_histogram))
        
        sum_squared_errors = 0.0
        for i in range(min_len):
            error = self.ground_truth_histogram[i] - self.player_drawn_histogram[i]
            sum_squared_errors += error ** 2
        
        mse = sum_squared_errors / min_len if min_len > 0 else 0
        rmse = math.sqrt(mse)
        return rmse

    def _normalize_rmse_to_score(self, rmse: float) -> float:
        """
        Normalisiert RMSE zu einem Score zwischen 0 und 1.
        Verwendet einen Normalisierungsfaktor für strengere Bewertung.
        Score = max(0, 1 - RMSE / (max_count * 2))
        """
        if not self.ground_truth_histogram:
            return 0.0

        max_count = max(self.ground_truth_histogram) if any(self.ground_truth_histogram) else 1.0
        if max_count <= 0:
            max_count = 1.0

        # Strengere Normalisierung: Faktor 2.0 statt 1.0
        normalization_factor = max_count * 2.0
        score = max(0.0, 1.0 - (rmse / normalization_factor))
        return min(1.0, score)

    def evaluate(self) -> Dict[str, Any]:
        """
        Evaluiert die 5 Fragen (70%) und die gezeichnete Verteilung (30%).
        
        Returns a dict with:
        - results: list of {frage_idx, selected_value, korrekt, is_correct}
        - questions_score (0..1)
        - rmse: Root Mean Squared Error der Zeichnung
        - drawing_score (0..1)
        - peak_value_score, peak_frequency_score, additional_peaks_score (0..1)
        - mae, wasserstein_distance, abs_mean_error (Rohmetriken)
        - mae_score, wasserstein_score, mean_error_score (0..1)
        - score: Final Score (0..100) für UI-Anzeige
        - passed (bool)
        """
        # --- Bewertung der 3 Fragen ---
        results = []
        correct_count = 0
        total = len(self.fragen)
        
        for idx, frage in enumerate(self.fragen):
            korrekt = frage.get("korrekt")
            selected_value = self.antworten[idx].strip() if idx < len(self.antworten) and self.antworten[idx] is not None else None
            is_correct = False
            
            if korrekt is not None and selected_value is not None:
                # Für die 3. Frage: Ja/Nein Vergleich
                if idx == 2:
                    sv = str(selected_value).strip().lower()
                    kv = str(korrekt).strip().lower()
                    yes = {'ja', 'yes', 'y', 'true', '1'}
                    no = {'nein', 'no', 'n', 'false', '0'}
                    if kv in yes:
                        is_correct = sv in yes
                    elif kv in no:
                        is_correct = sv in no
                    else:
                        is_correct = str(selected_value) == str(korrekt)
                else:
                    is_correct = str(selected_value) == str(korrekt)
            
            if is_correct:
                correct_count += 1
            
            results.append({
                "frage_idx": idx,
                "selected_value": selected_value,
                "korrekt": korrekt,
                "is_correct": is_correct
            })
        
        questions_score = correct_count / total if total > 0 else 0.0
        
        # --- Bewertung der gezeichneten Verteilung ---
        # Primär über ZahlenEvaluator (wie im Zahlenspiel üblich);
        # Fallback: RMSE-basierte Bewertung, wenn keine Daten vorliegen.
        # Primäre Zeichnungsbewertung über HistogrammEvaluator
        rmse = self._calculate_rmse()
        drawing_score = self._normalize_rmse_to_score(rmse)
        extra_metrics: Dict[str, Any] = {}

        if self.ground_truth_histogram and self.player_drawn_histogram and (
            len(self.ground_truth_histogram) == len(self.player_drawn_histogram)
        ):
            try:
                he = _he.HistogrammEvaluator(self.ground_truth_histogram, self.player_drawn_histogram)
                he_res = he.evaluate()
                # Übernehme RMSE/Wasserstein und Zeichnungs-Score aus HistogrammEvaluator
                if he_res.get("rmse") is not None:
                    rmse = float(he_res.get("rmse"))
                if he_res.get("drawing_score") is not None:
                    drawing_score = float(he_res.get("drawing_score"))
                extra_metrics.update({
                    "wasserstein_distance": he_res.get("wasserstein_distance"),
                    "wasserstein_score": he_res.get("wasserstein_score"),
                    # rmse_score optional für Debug
                    "rmse_score": he_res.get("rmse_score"),
                })
            except Exception:
                # Fallback: bleibe bei vorher berechnetem RMSE-basiertem drawing_score
                pass

            # Ergänze MAE und Mean-Error Metriken (für UI), aus normalisierten Histogrammen
            gt_n = self._normalize_hist(self.ground_truth_histogram)
            pl_n = self._normalize_hist(self.player_drawn_histogram)
            if gt_n and pl_n and len(gt_n) == len(pl_n):
                mae = sum(abs(g - p) for g, p in zip(gt_n, pl_n)) / len(gt_n)
                mae_score = max(0.0, 1.0 - min(1.0, mae))
                mean_gt = sum(i * g for i, g in enumerate(gt_n))
                mean_pl = sum(i * p for i, p in enumerate(pl_n))
                abs_mean_error = abs(mean_gt - mean_pl)
                mean_error_score = max(0.0, 1.0 - min(1.0, abs_mean_error / 20.0))
                extra_metrics.update({
                    "mae": round(mae, 4),
                    "mae_score": round(mae_score, 3),
                    "abs_mean_error": round(abs_mean_error, 2),
                    "mean_error_score": round(mean_error_score, 3),
                })

        # Optional: Pre-Reveal Teilmetriken über ZahlenEvaluator (nur zur Anzeige)
        try:
            gt_samples = self._expand_hist_to_samples(self.ground_truth_histogram)
            player_samples = self._expand_hist_to_samples(self.player_drawn_histogram)
            if gt_samples and player_samples:
                ze = ZahlenEvaluator(ground_truth=gt_samples, player_values=player_samples)
                ev_pre = ze.evaluate()
                extra_metrics.update({
                    "peak_value_score": ev_pre.get("peak_value_score"),
                    "peak_frequency_score": ev_pre.get("peak_frequency_score"),
                    "additional_peaks_score": ev_pre.get("additional_peaks_score"),
                })
        except Exception:
            pass
        
        # --- Finaler Score (70/30) ---
        final_score_ratio = 0.7 * questions_score + 0.3 * drawing_score
        # Für die UI wird erwartet, dass "score" ein Prozentwert (0-100) ist.
        # Wenn ZahlenEvaluator verfügbar ist, übernehmen wir dessen Prozent-Score,
        # ansonsten skalieren wir unseren Ratio-Score selbst.
        final_score_percent = max(0, min(100, int(round(final_score_ratio * 100))))
        passed = final_score_percent >= 60
        
        out: Dict[str, Any] = {
            "results": results,
            "correct_count": correct_count,
            "total": total,
            "questions_score": questions_score,
            "rmse": rmse,
            "drawing_score": drawing_score,
            # Prozentwert für UI
            "score": final_score_percent,
            "passed": passed,
            # Zusätzlich das Verhältnis (0..1) für mögliche interne Nutzung
            "final_score_ratio": round(final_score_ratio, 3)
        }

        # Ergänze Detail-Metriken, wenn aus ZahlenEvaluator vorhanden
        if extra_metrics:
            out.update({k: v for k, v in extra_metrics.items() if v is not None})

        return out
