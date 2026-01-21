from zahlenevaluation.zahlen_evaluator import ZahlenEvaluator

class Stufe3Fragen:
    """
    Enthält alle Freitext-Fragen für Welt 1, Stufe 3.
    Der Spieler soll nach dem Spiel die Verteilung selbst zeichnen.
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
        
        # Für Frage 3: Vergleiche zwei Werte, die nicht offensichtlich zum Hochpunkt hindeuten
        # Bei der 5er-Verteilung [mu-2, mu-1, mu, mu+1, mu+2]:
        # Vergleiche mu+2 (rechts) mit mu-1 (links) - beide haben mittlere Häufigkeit
        idx_mu_minus_1 = max(0, self.peak_idx - 1)
        idx_mu_plus_2 = min(20, self.peak_idx + 2)
        count_mu_minus_1 = self.counts[idx_mu_minus_1] if idx_mu_minus_1 < len(self.counts) else 0
        count_mu_plus_2 = self.counts[idx_mu_plus_2] if idx_mu_plus_2 < len(self.counts) else 0
        
        value_left = self.peak_idx - 1
        value_right = self.peak_idx + 2
        comparison_result = "ja" if count_mu_plus_2 > count_mu_minus_1 else "nein"
        
        self.fragen = [
            {
                'frage': 'Welche Zahl hast du am häufigsten gesehen?',
                'korrekt': str(self.peak_idx)
            },
            {
                'frage': f'Wie oft (ungefähr) kam diese Zahl vor?',
                'korrekt': str(self.peak_count)
            },
            {
                'frage': f'Kam die Zahl {value_right} häufiger vor als die Zahl {value_left}? (ja/nein)',
                'korrekt': comparison_result
            }
        ]

    def get_fragen(self):
        return self.fragen
    
    def get_ground_truth_histogram(self):
        """Gibt das Histogramm der wahren Verteilung zurück"""
        return self.counts
