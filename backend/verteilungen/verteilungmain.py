"""
verteilungmain.py

Enthält die Klasse `VerteilungMain`, die Verteilungen mit konkreten Zahlenwerten
(0-20) generiert. Dies ist eine Alternative zum Farbverteilungsspiel.

Spielprinzip:
- Statt Farbwahrscheinlichkeiten werden konkrete Zahlen (0-20) nach einer Verteilung generiert
- Der Spieler muss die Verteilung dieser Zahlen nachzeichnen/nachbilden
"""
import math
import random
from typing import List, Dict
from level import Level
from .w1 import generate_w1_normalverteilung

class VerteilungMain:
    """Erzeugt Verteilungen von Zahlenwerten (0-20).

    Methoden:
    - available(): Liste der verfügbaren Verteilungstypen
    - descriptions(): Beschreibungen der Verteilungen
    - generate(name, N=40): Liefert N Zahlenwerte (0-20) nach einer Verteilung
    - generate_histogram(name, N_samples=200, N_bins=21): Generiert Histogram (0-20 Bins)
    """

    @classmethod
    def create_normal_values(cls, N=40, mu=10, sigma=3) -> List[int]:
        values = [
            8, 9, 10, 11, 10, 9, 12, 10, 10, 11,
            10, 9, 10, 11, 8, 10, 12, 10, 9, 10,
            11, 10, 10, 9, 10, 10, 11, 10, 8, 10,
            10, 12, 10, 9, 10, 10, 11, 10, 10, 9,
            10, 11, 10, 9, 10, 12, 10, 10, 9, 11
        ]
        return values[:N]

    @classmethod
    def create_w1_stufe3_values(cls, N=20) -> List[int]:
        """Erzeugt eine Normalverteilung für Welt1/Stufe3 mit 5 Werten um den Hochpunkt (mu-2, mu-1, mu, mu+1, mu+2)."""
        mu = random.randint(2, 18)  # Hochpunkt zwischen 2-18, damit mu±2 noch in 0-20 passen
        vals = []
        five_values = [mu - 2, mu - 1, mu, mu + 1, mu + 2]
        # Verteilung der Häufigkeiten: mehr beim Hochpunkt, weniger an den Rändern
        # Insgesamt 20 Werte
        counts = [2, 4, 8, 4, 2]
        for val, count in zip(five_values, counts):
            val = max(0, min(20, val))  # Clamp auf 0-20
            vals.extend([val] * count)
        random.shuffle(vals)
        return vals

    @classmethod
    def create_w1_stufe5_values(cls, N=40) -> List[int]:
        """Erzeugt eine Normalverteilung für Welt1/Stufe5 mit 7 Werten um den Hochpunkt (mu-3 bis mu+3)."""
        mu = random.randint(3, 17)  # Hochpunkt zwischen 3-17, damit mu±3 in 0-20 passt
        vals = []
        seven_values = [mu - 3, mu - 2, mu - 1, mu, mu + 1, mu + 2, mu + 3]
        # Verteilung der Häufigkeiten: Normalverteilung mit mehr beim Hochpunkt
        # Insgesamt 40 Werte
        counts = [2, 5, 7, 12, 7, 5, 2]  # Summe = 40
        for val, count in zip(seven_values, counts):
            val = max(0, min(20, val))  # Clamp auf 0-20
            vals.extend([val] * count)
        random.shuffle(vals)
        return vals

    @classmethod
    def create_bimodal_values(cls, N=40) -> List[int]:
        return cls.create_normal_values(N)

    @classmethod
    def create_exponential_values(cls, N=40, scale=5) -> List[int]:
        return cls.create_normal_values(N)

    @classmethod
    def create_left_skewed_values(cls, N=40) -> List[int]:
        return cls.create_normal_values(N)

    @classmethod
    def create_right_skewed_values(cls, N=40) -> List[int]:
        return cls.create_normal_values(N)

    @classmethod
    def values_to_histogram(cls, values: List[int], N_bins=21) -> List[float]:
        hist = [0] * N_bins
        for v in values:
            idx = max(0, min(N_bins - 1, v))
            hist[idx] += 1
        total = sum(hist)
        if total == 0:
            return [0.0] * N_bins
        return [h / total * 100 for h in hist]

    @classmethod
    def available(cls) -> List[str]:
        return [
            "normal",
            "uniform",
            "bimodal",
            "exponential",
            "left_skewed",
            "right_skewed",
        ]

    @classmethod
    def descriptions(cls) -> Dict[str, str]:
        return {
            "normal": "Normalverteilung (Glockenform, zentriert um 10)",
            "uniform": "Gleichverteilung (alle Zahlen gleich wahrscheinlich)",
            "bimodal": "Bimodale Verteilung (zwei Spitzen bei ~5 und ~15)",
            "exponential": "Exponentialverteilung (viele kleine, wenige große Zahlen)",
            "left_skewed": "Linksverteilung (mehr hohe Zahlen, Schwerpunkt rechts)",
            "right_skewed": "Rechtsverteilung (mehr kleine Zahlen, Schwerpunkt links)",
        }

    @classmethod
    def generate(cls, name: str, N: int = 40, welt: int = None, stufe: int = None) -> List[int]:
        """
        Generiert N Zahlenwerte (0-20) nach der gewählten Verteilung.
        Wenn welt==1, wird die spezielle Verteilung aus w1.py verwendet, angepasst nach Stufe.
        """
        if welt == 1:
            # Für Welt 1 differenziert nach Stufe
          # if stufe == 3 or stufe == 4:
          #      return cls.create_w1_stufe3_values(N=20)
          #  if stufe == 5:
          #      return cls.create_w1_stufe5_values(N=40)
            # ältere einfache Variante für niedrigere Stufen 
            return generate_w1_normalverteilung()
        name = (name or "").lower()
        if name == "normal":
            return cls.create_normal_values(N)
        if name == "uniform":
            return cls.create_uniform_values(N)
        if name == "bimodal":
            return cls.create_bimodal_values(N)
        if name == "exponential":
            return cls.create_exponential_values(N)
        if name == "left_skewed":
            return cls.create_left_skewed_values(N)
        if name == "right_skewed":
            return cls.create_right_skewed_values(N)
        return cls.create_normal_values(N)

    @classmethod
    def generate_histogram(cls, name: str, N_samples: int = 200, N_bins: int = 21) -> List[float]:
        values = cls.generate(name, N_samples)
        return cls.values_to_histogram(values, N_bins)
