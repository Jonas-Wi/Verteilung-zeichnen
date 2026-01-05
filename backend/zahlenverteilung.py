"""
zahlenverteilung.py

Enthält die Klasse `ZahlenVerteilung`, die Verteilungen mit konkreten Zahlenwerten
(0-20) generiert. Dies ist eine Alternative zum Farbverteilungsspiel.

Spielprinzip:
- Statt Farbwahrscheinlichkeiten werden konkrete Zahlen (0-20) nach einer Verteilung generiert
- Der Spieler muss die Verteilung dieser Zahlen nachzeichnen/nachbilden
"""
import math
import random
from typing import List, Dict


class ZahlenVerteilung:
    """Erzeugt Verteilungen von Zahlenwerten (0-20).

    Methoden:
    - available(): Liste der verfügbaren Verteilungstypen
    - descriptions(): Beschreibungen der Verteilungen
    - generate(name, N=40): Liefert N Zahlenwerte (0-20) nach einer Verteilung
    - generate_histogram(name, N_samples=200, N_bins=21): Generiert Histogram (0-20 Bins)
    """

    @classmethod
    def create_normal_values(cls, N=40, mu=10, sigma=3) -> List[int]:
        """Erzeugt N Werte nach einer Normalverteilung (0-20)"""
        # FIXE VERTEILUNG: Normalverteilung mit Peak bei 10
        # Random auskommentiert für Testing
        # values = []
        # for i in range(N):
        #     # Box-Muller Transform
        #     u1 = random.random()
        #     u2 = random.random()
        #     z = math.sqrt(-2 * math.log(u1 + 0.0001)) * math.cos(2 * math.pi * u2)
        #     v = mu + z * sigma
        #     # Clamp auf 0-20
        #     v = max(0, min(20, int(round(v))))
        #     values.append(v)
        
        # Fixe Normalverteilung mit Peak bei 10 (50 Werte)
        values = [
            8, 9, 10, 11, 10, 9, 12, 10, 10, 11,
            10, 9, 10, 11, 8, 10, 12, 10, 9, 10,
            11, 10, 10, 9, 10, 10, 11, 10, 8, 10,
            10, 12, 10, 9, 10, 10, 11, 10, 10, 9,
            10, 11, 10, 9, 10, 12, 10, 10, 9, 11
        ]
        return values[:N]

    @classmethod
    def create_uniform_values(cls, N=40) -> List[int]:
        """Erzeugt N gleichverteilte Werte (0-20)"""
        # FIXE VERTEILUNG: Normalverteilung mit Peak bei 10 (statt uniform)
        # return [random.randint(0, 20) for _ in range(N)]
        
        # Nutze normale Verteilung auch hier
        return cls.create_normal_values(N)

    @classmethod
    def create_bimodal_values(cls, N=40) -> List[int]:
        """Erzeugt N Werte mit zwei Spitzen (bei ~5 und ~15)"""
        # FIXE VERTEILUNG: Normalverteilung mit Peak bei 10 (statt bimodal)
        # values = []
        # for i in range(N):
        #     # 50% Chance für eine der beiden Modi
        #     if random.random() < 0.5:
        #         mu = 5
        #     else:
        #         mu = 15
        #     # Kleine Streuung um den Modus
        #     u1 = random.random()
        #     u2 = random.random()
        #     z = math.sqrt(-2 * math.log(u1 + 0.0001)) * math.cos(2 * math.pi * u2)
        #     v = mu + z * 2
        #     v = max(0, min(20, int(round(v))))
        #     values.append(v)
        
        # Nutze normale Verteilung
        return cls.create_normal_values(N)

    @classmethod
    def create_exponential_values(cls, N=40, scale=5) -> List[int]:
        """Erzeugt N Werte nach Exponentialverteilung (viele kleine, wenige große)"""
        # FIXE VERTEILUNG: Normalverteilung mit Peak bei 10 (statt exponential)
        # values = []
        # for i in range(N):
        #     # Exponentialverteilung
        #     u = random.random()
        #     v = -scale * math.log(u + 0.0001)
        #     v = max(0, min(20, int(round(v))))
        #     values.append(v)
        
        # Nutze normale Verteilung
        return cls.create_normal_values(N)

    @classmethod
    def create_left_skewed_values(cls, N=40) -> List[int]:
        """Erzeugt N Werte mit Linkssteile (mehr hohe Werte)"""
        # FIXE VERTEILUNG: Normalverteilung mit Peak bei 10 (statt left skewed)
        # values = []
        # for i in range(N):
        #     # Beta-ähnliche Verteilung durch Potenzfunktion
        #     u = random.random()
        #     v = 20 * (u ** 0.5)  # Wurzel macht linkssteil
        #     v = max(0, min(20, int(round(v))))
        #     values.append(v)
        
        # Nutze normale Verteilung
        return cls.create_normal_values(N)

    @classmethod
    def create_right_skewed_values(cls, N=40) -> List[int]:
        """Erzeugt N Werte mit Rechtssteile (mehr kleine Werte)"""
        # FIXE VERTEILUNG: Normalverteilung mit Peak bei 10 (statt right skewed)
        # values = []
        # for i in range(N):
        #     u = random.random()
        #     v = 20 * (u ** 2)  # Quadrat macht rechtssteil
        #     v = max(0, min(20, int(round(v))))
        #     values.append(v)
        
        # Nutze normale Verteilung
        return cls.create_normal_values(N)

    @classmethod
    def values_to_histogram(cls, values: List[int], N_bins=21) -> List[float]:
        """Konvertiert Zahlenwerte in ein normalisiertes Histogram (Wahrscheinlichkeiten)"""
        hist = [0] * N_bins
        for v in values:
            idx = max(0, min(N_bins - 1, v))
            hist[idx] += 1
        total = sum(hist)
        if total == 0:
            return [0.0] * N_bins
        return [h / total * 100 for h in hist]  # Als Prozent

    @classmethod
    def available(cls) -> List[str]:
        """Liste der verfügbaren Verteilungstypen"""
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
        """Beschreibungen der Verteilungen"""
        return {
            "normal": "Normalverteilung (Glockenform, zentriert um 10)",
            "uniform": "Gleichverteilung (alle Zahlen gleich wahrscheinlich)",
            "bimodal": "Bimodale Verteilung (zwei Spitzen bei ~5 und ~15)",
            "exponential": "Exponentialverteilung (viele kleine, wenige große Zahlen)",
            "left_skewed": "Linksverteilung (mehr hohe Zahlen, Schwerpunkt rechts)",
            "right_skewed": "Rechtsverteilung (mehr kleine Zahlen, Schwerpunkt links)",
        }

    @classmethod
    def generate(cls, name: str, N: int = 40) -> List[int]:
        """
        Generiert N Zahlenwerte (0-20) nach der gewählten Verteilung.
        
        Args:
            name: Verteilungstyp (normal, uniform, bimodal, etc.)
            N: Anzahl der zu generierenden Werte
            
        Returns:
            Liste von N Integer-Werten im Bereich 0-20
        """
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
        # Default
        return cls.create_normal_values(N)

    @classmethod
    def generate_histogram(cls, name: str, N_samples: int = 200, N_bins: int = 21) -> List[float]:
        """
        Generiert ein Histogram (Verteilung) von Zahlenwerten.
        
        Args:
            name: Verteilungstyp
            N_samples: Anzahl der Samples zum Erstellen des Histograms
            N_bins: Anzahl der Bins (Standard: 21 für Werte 0-20)
            
        Returns:
            Liste von N_bins Prozent-Werten (summiert zu 100)
        """
        values = cls.generate(name, N_samples)
        return cls.values_to_histogram(values, N_bins)
