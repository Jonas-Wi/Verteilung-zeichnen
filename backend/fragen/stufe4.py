from zahlenevaluation.zahlen_evaluator import ZahlenEvaluator
import random

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
        
        # Finde ALLE Zahlen mit der maximalen Häufigkeit
        max_count = max(self.counts) if any(self.counts) else 0
        self.peak_indices = [i for i, count in enumerate(self.counts) if count == max_count]
        self.peak_idx = self.peak_indices[0] if self.peak_indices else 0  # Erste als Standard
        self.peak_count = max_count
        self.ground_truth = ground_truth
        
        # Für Frage 3: Vergleiche mu+1 mit mu-2
        idx_mu_minus_2 = max(0, self.peak_idx - 2)
        idx_mu_plus_1 = min(20, self.peak_idx + 1)
        count_mu_minus_2 = self.counts[idx_mu_minus_2] if idx_mu_minus_2 < len(self.counts) else 0
        count_mu_plus_1 = self.counts[idx_mu_plus_1] if idx_mu_plus_1 < len(self.counts) else 0
        comparison_result = "ja" if count_mu_plus_1 > count_mu_minus_2 else "nein"
        
        # Für Frage 4: Welche Zahl wurde nicht gesehen?
        # Finde Zahlen die tatsächlich gesehen wurden
        seen_numbers = set(ground_truth)
        # Finde alle möglichen Zahlen (0-20)
        all_numbers = set(range(0, 21))
        unseen_numbers = list(all_numbers - seen_numbers)
        
        # Wähle 2 gesehene Zahlen und 1 nicht gesehene Zahl als Optionen
        seen_sample = random.sample(list(seen_numbers), min(2, len(seen_numbers)))
        if unseen_numbers:
            not_seen = random.choice(unseen_numbers)
            options_frage4 = seen_sample + [not_seen]
            random.shuffle(options_frage4)
            korrekt_frage4 = str(not_seen)
        else:
            # Fallback falls alle Zahlen gesehen wurden (unwahrscheinlich)
            options_frage4 = random.sample(list(seen_numbers), min(3, len(seen_numbers)))
            korrekt_frage4 = "keine"
        
        # Für Frage 5: Durchschnittsfrage
        avg = sum(ground_truth) / len(ground_truth) if ground_truth else 10
        avg_rounded = round(avg)
        # Frage: War der Durchschnitt größer ODER GLEICH dem gerundeten Wert?
        # Das macht mehr Sinn, weil bei avg=3.4 gerundet auf 3 die Antwort "ja" ist
        # und bei avg=2.6 gerundet auf 3 die Antwort "nein" ist
        if avg >= avg_rounded:
            korrekt_avg = "ja"
        else:
            korrekt_avg = "nein"
        
        self.fragen = [
            {
                'frage': 'Welche Zahl hast du am häufigsten gesehen?',
                'korrekt': str(self.peak_idx),
                'akzeptabel': [str(idx) for idx in self.peak_indices]  # Alle gleich häufigen Zahlen
            },
            {
                'frage': f'Wie oft kam diese Zahl vor?',
                'korrekt': str(self.peak_count)
            },
            {
                'frage': f'Kam die  ({self.peak_idx + 1}) häufiger als die ({self.peak_idx - 2})? (ja/nein)',
                'korrekt': comparison_result
            },
            {
                'frage': f'Welche der folgenden Zahlen hast du gar nicht gesehen? ({options_frage4[0]}, {options_frage4[1]}, {options_frage4[2]})',
                'korrekt': korrekt_frage4,
                'optionen': options_frage4
            },
            {
                'frage': f'War der Durchschnitt der Zahlen größer als {avg_rounded}? (ja/nein)',
                'korrekt': korrekt_avg
            }
        ]

    def get_fragen(self):
        return self.fragen
    
    def get_ground_truth_histogram(self):
        """Gibt das Histogramm der wahren Verteilung zurück"""
        return self.counts
