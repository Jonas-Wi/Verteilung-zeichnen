from zahlenevaluation.zahlen_evaluator import ZahlenEvaluator

class Stufe5Fragen:
    """
    Enthält keine Fragen für Welt 1, Stufe 5.
    Der Spieler soll direkt nach dem Spiel die Verteilung zeichnen (ohne Fragen).
    """
    def __init__(self, ground_truth: list):
        # Erzeuge ZahlenEvaluator für die Ground-Truth-Verteilung
        self.evaluator = ZahlenEvaluator(ground_truth, player_values=[])
        self.hist = self.evaluator._to_histogram(ground_truth, bins=21)
        self.counts = [int(round(h * len(ground_truth))) for h in self.hist]
        self.total_samples = len(ground_truth)
        self.peak_idx = self.counts.index(max(self.counts)) if any(self.counts) else 0
        self.peak_count = self.counts[self.peak_idx] if any(self.counts) else 0
        
        # Keine Fragen für Stufe 5
        self.fragen = []

    def get_fragen(self):
        return self.fragen
    
    def get_ground_truth_histogram(self):
        """Gibt das Histogramm der wahren Verteilung zurück"""
        return self.counts
