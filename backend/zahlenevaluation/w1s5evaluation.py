"""W1S5Evaluation

Evaluiert nur die gezeichnete Verteilung für Welt 1, Stufe 5.
- 100% Gewichtung für die gezeichnete Verteilung (RMSE-basiert)
- Keine Freitext-Fragen
"""
from typing import List, Dict, Any
import math

class W1S5Evaluation:
    """
    Bewertet nur die gezeichnete Verteilung für Stufe 5.
    
    Usage:
        ev = W1S5Evaluation(ground_truth_histogram, player_drawn_histogram)
        result = ev.evaluate()
    
    - `ground_truth_histogram` ist die wahrhafte Häufigkeitsverteilung (Liste von Counts)
    - `player_drawn_histogram` ist die vom Spieler gezeichnete Verteilung (Liste von Counts)
    """
    def __init__(self, ground_truth_histogram: List[int], player_drawn_histogram: List[int]):
        self.ground_truth_histogram = ground_truth_histogram or []
        self.player_drawn_histogram = player_drawn_histogram or []

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
        Evaluiert nur die gezeichnete Verteilung (100%).
        
        Returns a dict with:
        - rmse: Root Mean Squared Error der Zeichnung
        - drawing_score (0..1)
        - score: Final Score (0..1) = drawing_score
        - passed (bool, threshold 0.6)
        """
        # Bewertung der gezeichneten Verteilung
        rmse = self._calculate_rmse()
        drawing_score = self._normalize_rmse_to_score(rmse)
        
        # Finaler Score (100% Zeichnung)
        final_score = drawing_score
        passed = final_score >= 0.6
        
        return {
            "results": [],
            "correct_count": 0,
            "total": 0,
            "questions_score": 0.0,
            "rmse": rmse,
            "drawing_score": drawing_score,
            "score": final_score,
            "passed": passed
        }
