"""W1S5Evaluation

Bewertet die Eingabe für Welt 1, Stufe 5 mit einem
kompositen, fehlerbasierten Score. Ziel ist es, reine
Null-Eingaben nicht zu belohnen und "fast richtig" deutlich
zu honorieren.

Komponenten (je 0..1, am Ende gewichtet kombiniert):
- Fehlerbasierter Score: 1 - (Summe |user[i] - gt[i]| / Sum(gt)).
    (Sum(gt) als Normalisierung verhindert hohe Werte bei "alles null").
- Form-/Richtung: Distanz der gewichteten Mittelwerte (Schwerpunkte)
    der Verteilungen, auf Bereich 0..20 normiert.
- Peak-Position: 1.0 bei gleicher x-Position, 0.5 bei ±1, sonst 0.0.
- Peak-Höhe: 1 - |user_peak_height - gt_peak_height| / gt_peak_height.

Endscore (0..100%):
    40% Fehler, 30% Form, 15% Peak-Position, 15% Peak-Höhe.
"""
from typing import List, Dict, Any
import math

class W1S5Evaluation:
    """Komposite Bewertung für Stufe 5.

    - `ground_truth_histogram`: echte Häufigkeiten pro Wert 0..20
    - `player_drawn_histogram`: Nutzer-Eingaben pro Wert 0..20
    """
    def __init__(self, ground_truth_histogram: List[int], player_drawn_histogram: List[int]):
        self.ground_truth_histogram = ground_truth_histogram or []
        self.player_drawn_histogram = player_drawn_histogram or []

    def _peak_info(self, counts: List[int]) -> Dict[str, int]:
        if not counts:
            return {"idx": None, "height": 0}
        idx = int(max(range(len(counts)), key=lambda i: counts[i])) if len(counts) > 0 else None
        height = int(counts[idx]) if idx is not None else 0
        return {"idx": idx, "height": height}

    def _weighted_mean(self, counts: List[int]) -> float:
        total = sum(counts)
        if total <= 0:
            return float('nan')
        return sum(i * c for i, c in enumerate(counts)) / float(total)

    def evaluate(self) -> Dict[str, Any]:
        """Berechnet den Gesamt-Score (0..100) gemäß Spezifikation."""
        gt = list(self.ground_truth_histogram)
        user = list(self.player_drawn_histogram)
        if not gt or not user:
            return {"score": 0, "details": {"error": 0, "form": 0, "peak_pos": 0, "peak_height": 0}}

        n = min(len(gt), len(user))
        gt = gt[:n]
        user = user[:n]

        # Fehlerbasierter Score
        total_error = sum(abs(gt[i] - user[i]) for i in range(n))
        max_error_norm = max(1, sum(gt))  # verhindert hohe Werte bei "alles null"
        error_score = max(0.0, 1.0 - (total_error / max_error_norm))

        # Form-/Richtung (Schwerpunktdistanz)
        mean_gt = self._weighted_mean(gt)
        mean_user = self._weighted_mean(user)
        if math.isnan(mean_user):
            form_score = 0.0
        else:
            mean_dist = abs(mean_gt - mean_user)
            form_score = max(0.0, 1.0 - min(1.0, mean_dist / 20.0))

        # Peak-Position
        p_gt = self._peak_info(gt)
        p_user = self._peak_info(user)
        if p_user["idx"] is None or p_gt["idx"] is None:
            peak_pos_score = 0.0
        else:
            dx = abs(p_gt["idx"] - p_user["idx"])
            peak_pos_score = 1.0 if dx == 0 else (0.5 if dx == 1 else 0.0)

        # Peak-Höhe
        if p_gt["height"] <= 0 or p_user["idx"] is None:
            peak_height_score = 0.0
        else:
            user_height_at_gt_peak = user[p_gt["idx"]]
            peak_height_score = max(0.0, 1.0 - min(1.0, abs(user_height_at_gt_peak - p_gt["height"]) / float(p_gt["height"])) )

        # Gewichte (Summe = 1)
        w_error = 0.40
        w_form = 0.30
        w_peak_pos = 0.15
        w_peak_height = 0.15

        final_ratio = (
            w_error * error_score
            + w_form * form_score
            + w_peak_pos * peak_pos_score
            + w_peak_height * peak_height_score
        )
        final_ratio = max(0.0, min(1.0, final_ratio))
        score_percent = int(round(final_ratio * 100))

        return {
            "results": [],
            "correct_count": 0,
            "total": 0,
            "questions_score": 0.0,
            "score": score_percent,
            "passed": score_percent >= 60,
            "details": {
                "total_error": total_error,
                "error_score": round(error_score, 3),
                "mean_gt": round(mean_gt, 3) if not math.isnan(mean_gt) else None,
                "mean_user": round(mean_user, 3) if not math.isnan(mean_user) else None,
                "form_score": round(form_score, 3),
                "peak_gt_idx": p_gt["idx"],
                "peak_user_idx": p_user["idx"],
                "peak_pos_score": round(peak_pos_score, 3),
                "peak_gt_height": p_gt["height"],
                "peak_height_score": round(peak_height_score, 3),
            }
        }
