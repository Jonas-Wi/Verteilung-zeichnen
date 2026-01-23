from zahlenevaluation.zahlen_evaluator import ZahlenEvaluator

class Stufe4Fragen:
    """
    Enthält alle Freitext-Fragen für Welt 1, Stufe 4.
    Der Spieler soll nach dem Spiel die Verteilung selbst zeichnen (blind, ohne Anhaltspunkte).
    Jede Frage ist ein Dictionary mit 'frage', 'korrekt'.
    """
    def __init__(self, ground_truth: list):
        # Erzeuge ZahlenEvaluator für die Ground-Truth-Verteilung
        self.evaluator = ZahlenEvaluator(ground_truth, player_values=[])
        self.hist = self.evaluator._to_histogram(ground_truth, bins=21)
        self.counts = [int(round(h * len(ground_truth))) for h in self.hist]
        self.total_samples = len(ground_truth)
        self.peak_idx = self.counts.index(max(self.counts)) if any(self.counts) else 0
        self.peak_count = self.counts[self.peak_idx] if any(self.counts) else 0
        
        # Für Frage 3: Vergleiche mu+1 mit mu-2
        idx_mu_minus_2 = max(0, self.peak_idx - 2)
        idx_mu_plus_1 = min(20, self.peak_idx + 1)
        count_mu_minus_2 = self.counts[idx_mu_minus_2] if idx_mu_minus_2 < len(self.counts) else 0
        count_mu_plus_1 = self.counts[idx_mu_plus_1] if idx_mu_plus_1 < len(self.counts) else 0
        comparison_result = "ja" if count_mu_plus_1 > count_mu_minus_2 else "nein"
        
        self.fragen = [
            {
                'frage': 'Welche Zahl hast du am häufigsten gesehen?',
                'korrekt': str(self.peak_idx)
            },
            {
                'frage': f'Wie oft kam diese Zahl vor?',
                'korrekt': str(self.peak_count)
            },
            {
                'frage': f'War der Wert direkt rechts vom Hochpunkt ({self.peak_idx + 1}) häufiger als der Wert zwei Positionen links davon ({self.peak_idx - 2})? (ja/nein)',
                'korrekt': comparison_result
            }
        ]

    def get_fragen(self):
        return self.fragen
    
    def get_ground_truth_histogram(self):
        """Gibt das Histogramm der wahren Verteilung zurück"""
        return self.counts
