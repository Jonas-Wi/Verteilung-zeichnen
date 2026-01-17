from zahlenevaluation.zahlen_evaluator import ZahlenEvaluator

class Stufe1Fragen:
    """
    Enthält alle Multiple-Choice-Fragen für Welt 1, Stufe 1.
    Jede Frage ist ein Dictionary mit 'frage', 'optionen', 'korrekt'.
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
                'optionen': [
                    str(max(0, self.peak_idx - 1)),
                    str(self.peak_idx),
                    str(min(20, self.peak_idx + 1))
                ],
                'korrekt': str(self.peak_idx)
            },
            {
                'frage': f'Wie oft (ungefähr) kam die Zahl {self.peak_idx} vor?',
                'optionen': [str(max(1, self.peak_count - 2)), str(self.peak_count), str(self.peak_count + 2)],
                'korrekt': str(self.peak_count)
            },
            {
                'frage': 'Welche Zahl hast du am zweithäufigsten gesehen?',
                'optionen': [
                    str(self.second_peak_idx) if self.second_peak_idx is not None else '0',
                    str(max(0, self.peak_idx - 2)),
                    str(min(20, self.peak_idx + 2))
                ],
                'korrekt': str(self.second_peak_idx) if self.second_peak_idx is not None else None
            },
            {
                'frage': 'Wie viele verschiedene Zahlen hast du gesehen?',
                'optionen': [str(max(1, self.distinct_count - 1)), str(self.distinct_count), str(self.distinct_count + 1)],
                'korrekt': str(self.distinct_count)
            },
            {
                'frage': 'Welche Zahl kam gar nicht vor?',
                'optionen': [str(self.zero_indices[0]) if self.zero_indices else '0', str(self.zero_indices[1]) if len(self.zero_indices) > 1 else '1', str(self.zero_indices[2]) if len(self.zero_indices) > 2 else '2'],
                'korrekt': str(self.zero_indices[0]) if self.zero_indices else None
            }
        ]

    def get_fragen(self):
        return self.fragen
