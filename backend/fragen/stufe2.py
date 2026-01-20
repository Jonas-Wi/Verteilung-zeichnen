from zahlenevaluation.zahlen_evaluator import ZahlenEvaluator

class Stufe2Fragen:
    """
    Enthält alle Multiple-Choice-Fragen für Welt 1, Stufe 2.
    Jede Frage ist ein Dictionary mit 'frage', 'korrekt'.
    """
    def __init__(self, ground_truth: list):
        # Erzeuge ZahlenEvaluator für die Ground-Truth-Verteilung
        self.evaluator = ZahlenEvaluator(ground_truth, player_values=[])
        self.hist = self.evaluator._to_histogram(ground_truth, bins=21)
        self.counts = [int(round(h * len(ground_truth))) for h in self.hist]
        self.total_samples = len(ground_truth)
        self.peak_idx = self.counts.index(max(self.counts))
        self.peak_count = self.counts[self.peak_idx]
        # Zweithäufigster Wert
        sorted_counts = sorted([(i, c) for i, c in enumerate(self.counts)], key=lambda x: x[1], reverse=True)
        self.second_peak_idx = sorted_counts[1][0] if len(sorted_counts) > 1 else None
        # Zahlen, die gar nicht vorkamen
        self.zero_indices = [i for i, c in enumerate(self.counts) if c == 0]
        # Anzahl verschiedener Zahlen
        self.distinct_count = sum(1 for c in self.counts if c > 0)

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
                'frage': 'Welche Zahl hast du am zweithäufigsten gesehen?',
                'korrekt': str(self.second_peak_idx) if self.second_peak_idx is not None else None
            },
            {
                'frage': 'Wie viele verschiedene Zahlen hast du gesehen?',
                'korrekt': str(self.distinct_count)
            },
            {
                'frage': 'Was war die höchste Zahl?',
                'korrekt': str(max(ground_truth))
            }
        ]

    def get_fragen(self):
        return self.fragen
