"""
ZahlenEvaluator
Evaluiert den Vergleich zwischen Ground-Truth-Zahlenwerten (0-20)
und den vom Spieler eingegebenen Zahlenwerten.
"""

from typing import List
import math


class ZahlenEvaluator:
    """
    Evaluiert Zahlenwerte (0-20) zwischen Ground-Truth und Spieler-Eingabe.
    Berechnet verschiedene Distanzmetriken für diskrete Zahlenwerte.
    """

    def __init__(self, ground_truth: List[int], player_values: List[int], pre_reveal_answers: dict = None):
        """
        Args:
            ground_truth: Ground-Truth Zahlenwerte (0-20)
            player_values: Spieler Zahlenwerte (0-20)
            pre_reveal_answers: Dict mit {peak_value, peak_frequency, additional_peaks}
        """
        self.ground_truth = ground_truth
        self.player_values = player_values
        self.pre_reveal_answers = pre_reveal_answers or {}

    def _to_histogram(self, values: List[int], bins=21) -> List[float]:
        """Konvertiert Zahlenwerte in normalisiertes Histogram"""
        hist = [0] * bins
        for v in values:
            if v is None:
                continue
            try:
                vi = int(round(v))
            except Exception:
                continue
            vi = max(0, min(bins - 1, vi))
            hist[vi] += 1
        total = sum(hist)
        if total == 0:
            return [0.0] * bins
        return [h / total for h in hist]

    def calculate_exact_match_rate(self) -> float:
        """Berechnet den Anteil exakter Übereinstimmungen"""
        if len(self.ground_truth) != len(self.player_values):
            return 0.0
        matches = sum(1 for g, p in zip(self.ground_truth, self.player_values) if g == p)
        return matches / len(self.ground_truth)

    def calculate_mean_absolute_error(self) -> float:
        """Berechnet MAE zwischen Zahlenwerten"""
        if len(self.ground_truth) != len(self.player_values):
            # Wenn unterschiedliche Längen, verwende Histogramme
            hist_gt = self._to_histogram(self.ground_truth)
            hist_player = self._to_histogram(self.player_values)
            return sum(abs(a - b) for a, b in zip(hist_gt, hist_player)) / len(hist_gt)
        
        return sum(abs(g - p) for g, p in zip(self.ground_truth, self.player_values)) / len(self.ground_truth)

    def calculate_rmse(self) -> float:
        """Berechnet Root Mean Squared Error"""
        if len(self.ground_truth) != len(self.player_values):
            hist_gt = self._to_histogram(self.ground_truth)
            hist_player = self._to_histogram(self.player_values)
            mse = sum((a - b) ** 2 for a, b in zip(hist_gt, hist_player)) / len(hist_gt)
            return math.sqrt(mse)
        
        mse = sum((g - p) ** 2 for g, p in zip(self.ground_truth, self.player_values)) / len(self.ground_truth)
        return math.sqrt(mse)

    def calculate_distribution_similarity(self) -> float:
        """
        Berechnet Ähnlichkeit der Verteilungen (0-1, 1=identisch)
        Verwendet Histogramm-Vergleich
        """
        hist_gt = self._to_histogram(self.ground_truth)
        hist_player = self._to_histogram(self.player_values)
        
        # Wasserstein Distance (Earth Mover's Distance)
        cdf_gt = []
        cdf_player = []
        s = 0.0
        for v in hist_gt:
            s += v
            cdf_gt.append(s)
        s = 0.0
        for v in hist_player:
            s += v
            cdf_player.append(s)
        
        wasserstein = sum(abs(a - b) for a, b in zip(cdf_gt, cdf_player)) / len(cdf_gt)
        # Konvertiere zu Similarity (0=verschieden, 1=identisch)
        return 1.0 - wasserstein

    def calculate_mean_and_std(self, values: List[int]) -> tuple:
        """Berechnet Mittelwert und Standardabweichung"""
        if not values:
            return 0.0, 0.0
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std = math.sqrt(variance)
        return mean, std

    def evaluate_pre_reveal_answers(self) -> dict:
        """
        Evaluiert die Pre-Reveal-Fragen (Peak-Wert, Häufigkeit, zusätzliche Peaks)
        Gibt Scores zwischen 0-1 zurück
        """
        if not self.pre_reveal_answers:
            return {
                "peak_value_score": 0.0,
                "peak_frequency_score": 0.0,
                "additional_peaks_score": 0.0,
                "pre_reveal_total_score": 0.0
            }
        
        # Berechne tatsächliches Histogram
        hist = self._to_histogram(self.ground_truth, bins=21)
        # Konvertiere zu Counts (hist ist normalized 0-1)
        total_samples = len(self.ground_truth)
        counts = [int(round(h * total_samples)) for h in hist]
        
        # Finde tatsächlichen Peak (höchster Wert)
        actual_peak_idx = counts.index(max(counts))
        actual_peak_value = actual_peak_idx
        actual_peak_count = counts[actual_peak_idx]
        
        # 1. Peak-Wert Score
        guess_peak_value = self.pre_reveal_answers.get("peak_value", None)
        if guess_peak_value is not None:
            # Abstand normiert (max Abstand ist 20)
            distance = abs(guess_peak_value - actual_peak_value)
            peak_value_score = max(0, 1 - (distance / 20.0))
        else:
            peak_value_score = 0.0
        
        # 2. Peak-Häufigkeit Score
        guess_peak_freq = self.pre_reveal_answers.get("peak_frequency", None)
        if guess_peak_freq is not None:
            # Abstand normiert (max Abstand ist total_samples)
            distance = abs(guess_peak_freq - actual_peak_count)
            peak_frequency_score = max(0, 1 - (distance / total_samples))
        else:
            peak_frequency_score = 0.0
        
        # 3. Zusätzliche Peaks Score
        additional_peaks = self.pre_reveal_answers.get("additional_peaks", [])
        if additional_peaks:
            # Durchschnittlicher Fehler über alle zusätzlichen Peaks
            scores = []
            for peak in additional_peaks:
                val = peak.get("value")
                freq = peak.get("frequency")
                if val is not None and freq is not None and 0 <= val < len(counts):
                    actual_count = counts[val]
                    distance = abs(freq - actual_count)
                    score = max(0, 1 - (distance / total_samples))
                    scores.append(score)
            additional_peaks_score = sum(scores) / len(scores) if scores else 0.0
        else:
            additional_peaks_score = 0.0
        
        # Gesamt-Score für Pre-Reveal (gleichgewichtet)
        pre_reveal_total_score = (peak_value_score + peak_frequency_score + additional_peaks_score) / 3.0
        
        return {
            "peak_value_score": round(peak_value_score, 3),
            "peak_frequency_score": round(peak_frequency_score, 3),
            "additional_peaks_score": round(additional_peaks_score, 3),
            "pre_reveal_total_score": round(pre_reveal_total_score, 3),
            "actual_peak_value": actual_peak_value,
            "actual_peak_count": actual_peak_count,
            "guess_peak_value": guess_peak_value,
            "guess_peak_frequency": guess_peak_freq
        }

    def evaluate(self) -> dict:
        """
        Führt vollständige Evaluierung durch.
        Gibt verschiedene Metriken und einen Gesamt-Score zurück.
        
        Score-Berechnung (0-100):
        - Pre-Reveal-Antworten: 30% (Peak-Wert, Häufigkeit, zusätzliche Peaks)
        - MAE: 30% (Mean Absolute Error zwischen Histogrammen)
        - Wasserstein Distance: 25% (Verteilungsform)
        - Mean Error: 15% (Unterschied der Mittelwerte)
        """
        # 1. Pre-Reveal Evaluation
        pre_reveal_results = self.evaluate_pre_reveal_answers()
        pre_reveal_score = pre_reveal_results["pre_reveal_total_score"]
        
        # 2. Berechne Metriken für gezeichnete Verteilung
        mae = self.calculate_mean_absolute_error()
        dist_similarity = self.calculate_distribution_similarity()
        
        # Statistiken
        mean_gt, std_gt = self.calculate_mean_and_std(self.ground_truth)
        mean_player, std_player = self.calculate_mean_and_std(self.player_values)
        abs_mean_error = abs(mean_gt - mean_player)
        
        # 3. Normalisierung und Score-Berechnung
        # MAE normalisieren (max error bei Histogrammen ist ~1.0)
        mae_normalized = min(1.0, mae)
        mae_score = 1.0 - mae_normalized
        
        # Wasserstein (dist_similarity ist bereits 0-1, 1=perfekt)
        wasserstein_score = dist_similarity
        
        # Mean Error normalisieren (max Unterschied ist 20)
        mean_error_normalized = min(1.0, abs_mean_error / 20.0)
        mean_error_score = 1.0 - mean_error_normalized
        
        # Gesamt-Score mit Gewichtung
        score = (
            pre_reveal_score * 0.30 +      # 30% Pre-Reveal-Fragen
            mae_score * 0.30 +              # 30% MAE
            wasserstein_score * 0.25 +      # 25% Wasserstein Distance
            mean_error_score * 0.15         # 15% Mean Error
        )
        score_percentage = max(0, min(100, int(round(score * 100))))
        
        # Bestanden wenn Score >= 70
        passed = score_percentage >= 70
        
        # Entwickler-Debug-Info
        print("\n" + "="*60)
        print("📊 ZAHLEN-EVALUIERUNG - ENTWICKLER-DEBUG")
        print("="*60)
        print(f"🎯 Pre-Reveal Antworten:")
        print(f"   Peak-Wert: {pre_reveal_results.get('guess_peak_value')} (Tatsächlich: {pre_reveal_results.get('actual_peak_value')})")
        print(f"   Peak-Häufigkeit: {pre_reveal_results.get('guess_peak_frequency')} (Tatsächlich: {pre_reveal_results.get('actual_peak_count')})")
        print(f"   Peak-Wert Score: {pre_reveal_results['peak_value_score']:.3f}")
        print(f"   Peak-Häufigkeit Score: {pre_reveal_results['peak_frequency_score']:.3f}")
        print(f"   Zusätzliche Peaks Score: {pre_reveal_results['additional_peaks_score']:.3f}")
        print(f"   ➡️ Pre-Reveal Gesamt: {pre_reveal_score:.3f} (Gewicht 30%)")
        print(f"\n📈 Verteilungs-Metriken:")
        print(f"   MAE (normalisiert): {mae:.4f} → Score: {mae_score:.3f} (Gewicht 30%)")
        print(f"   Wasserstein Distance: {1-dist_similarity:.4f} → Score: {wasserstein_score:.3f} (Gewicht 25%)")
        print(f"   Mean GT: {mean_gt:.2f}, Mean Player: {mean_player:.2f}")
        print(f"   Mean Error: {abs_mean_error:.2f} → Score: {mean_error_score:.3f} (Gewicht 15%)")
        print(f"\n🎯 FINAL SCORE: {score_percentage}% {'✅ BESTANDEN' if passed else '❌ NICHT BESTANDEN'}")
        print("="*60 + "\n")
        
        return {
            # Pre-Reveal Results
            **pre_reveal_results,
            # Metriken
            "mae": round(mae, 4),
            "wasserstein_distance": round(1 - dist_similarity, 4),
            "distribution_similarity": round(dist_similarity, 3),
            "mean_gt": round(mean_gt, 2),
            "mean_player": round(mean_player, 2),
            "std_gt": round(std_gt, 2),
            "std_player": round(std_player, 2),
            "abs_mean_error": round(abs_mean_error, 2),
            # Scores
            "mae_score": round(mae_score, 3),
            "wasserstein_score": round(wasserstein_score, 3),
            "mean_error_score": round(mean_error_score, 3),
            "score": score_percentage,
            "passed": passed
        }
