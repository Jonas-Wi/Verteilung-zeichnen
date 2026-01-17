"""W1S1Evaluation

Evaluiert die Antworten der Welt 1, Stufe 1 Multiple-Choice-Fragen.
Die Klasse vergleicht die vom Benutzer gewählten Option-Indizes mit den
korrekten Antworten, liefert pro Frage ein Ergebnis und eine Gesamtpunktzahl.
"""
from typing import List, Dict, Any


class W1S1Evaluation:
    """Prüft Antworten für Stufe 1 Multiple-Choice-Fragen.

    Usage:
        ev = W1S1Evaluation(fragen, antworten)
        result = ev.evaluate()

    - `fragen` ist eine Liste von Dicts mit Schlüsseln: 'frage', 'optionen', 'korrekt'
    - `antworten` ist eine Liste von ausgewählten Option-Indizes (int), parallele Reihenfolge
    """

    def __init__(self, fragen: List[Dict[str, Any]], antworten: List[int]):
        self.fragen = fragen or []
        self.antworten = antworten or []

    def evaluate(self) -> Dict[str, Any]:
        """Vergleicht Antworten mit den korrekten Optionen.

        Returns a dict with:
        - results: list of {frage_idx, selected, korrekt, is_correct}
        - correct_count, total, score (0..1), passed (bool, threshold 0.6)
        """
        results = []
        correct_count = 0
        total = len(self.fragen)

        for idx, frage in enumerate(self.fragen):
            korrekt = frage.get("korrekt")
            optionen = frage.get("optionen", [])

            selected_value = None
            selected_index = None
            if idx < len(self.antworten):
                try:
                    selected_index = int(self.antworten[idx])
                except Exception:
                    selected_index = None

            if selected_index is not None and 0 <= selected_index < len(optionen):
                selected_value = optionen[selected_index]

            is_correct = False
            # Compare string values as produced by Stufe1Fragen ('korrekt' stored as str)
            if korrekt is not None and selected_value is not None:
                is_correct = str(selected_value) == str(korrekt)

            if is_correct:
                correct_count += 1

            results.append({
                "frage_idx": idx,
                "selected_index": selected_index,
                "selected_value": selected_value,
                "korrekt": korrekt,
                "is_correct": is_correct,
            })

        score = (correct_count / total) if total > 0 else 0.0
        passed = score >= 0.6

        return {
            "results": results,
            "correct_count": correct_count,
            "total": total,
            "score": round(score, 3),
            "passed": passed,
        }
