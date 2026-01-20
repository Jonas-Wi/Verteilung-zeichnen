"""W1S2Evaluation

Evaluiert die Freitext-Antworten der Welt 1, Stufe 2 Fragen.
Vergleicht die vom Benutzer eingegebenen Werte mit den korrekten Werten aus Stufe2Fragen.
"""
from typing import List, Dict, Any

class W1S2Evaluation:
    """
    Prüft Antworten für Stufe 2 Freitext-Fragen.
    Usage:
        ev = W1S2Evaluation(fragen, antworten)
        result = ev.evaluate()
    - `fragen` ist eine Liste von Dicts mit Schlüsseln: 'frage', 'korrekt'
    - `antworten` ist eine Liste von Strings (User-Eingaben), parallele Reihenfolge
    """
    def __init__(self, fragen: List[Dict[str, Any]], antworten: List[str]):
        self.fragen = fragen or []
        self.antworten = antworten or []

    def evaluate(self) -> Dict[str, Any]:
        """
        Vergleicht Antworten mit den korrekten Werten (String-Vergleich, getrimmt).
        Returns a dict with:
        - results: list of {frage_idx, selected_value, korrekt, is_correct}
        - correct_count, total, score (0..1), passed (bool, threshold 0.6)
        """
        results = []
        correct_count = 0
        total = len(self.fragen)
        for idx, frage in enumerate(self.fragen):
            korrekt = frage.get("korrekt")
            selected_value = self.antworten[idx].strip() if idx < len(self.antworten) and self.antworten[idx] is not None else None
            is_correct = False
            if korrekt is not None and selected_value is not None:
                is_correct = str(selected_value) == str(korrekt)
            if is_correct:
                correct_count += 1
            results.append({
                "frage_idx": idx,
                "selected_value": selected_value,
                "korrekt": korrekt,
                "is_correct": is_correct
            })
        score = correct_count / total if total > 0 else 0.0
        passed = score >= 0.6
        return {
            "results": results,
            "correct_count": correct_count,
            "total": total,
            "score": score,
            "passed": passed
        }
