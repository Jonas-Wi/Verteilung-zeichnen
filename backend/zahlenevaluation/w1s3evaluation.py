"""W1S3Evaluation

Evaluiert die Freitext-Antworten der Welt 1, Stufe 3 Fragen sowie die gezeichnete Verteilung.
- 50% Gewichtung für die 3 Fragen
- 50% Gewichtung für die gezeichnete Verteilung (RMSE-basiert)
"""
from typing import List, Dict, Any
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
        Evaluiert die 3 Fragen (50%) und die gezeichnete Verteilung (50%).
        
        Returns a dict with:
        - results: list of {frage_idx, selected_value, korrekt, is_correct}
        - questions_score (0..1)
        - rmse: Root Mean Squared Error der Zeichnung
        - drawing_score (0..1)
        - score: Final Score (0..1) = 0.5 * questions_score + 0.5 * drawing_score
        - passed (bool, threshold 0.6)
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
        rmse = self._calculate_rmse()
        drawing_score = self._normalize_rmse_to_score(rmse)
        
        # --- Finaler Score (50/50) ---
        final_score = 0.5 * questions_score + 0.5 * drawing_score
        passed = final_score >= 0.6
        
        return {
            "results": results,
            "correct_count": correct_count,
            "total": total,
            "questions_score": questions_score,
            "rmse": rmse,
            "drawing_score": drawing_score,
            "score": final_score,
            "passed": passed
        }
