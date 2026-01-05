"""
verteilung.py

Enthält die Klasse `Verteilung`, die alle festen, deterministischen
Verteilungen kapselt. Ziel: Eine zentrale Stelle, um Verteilungen
einzufügen oder anzupassen.
"""
import math
from typing import List, Dict


class Verteilung:
    """Erzeugt deterministische Verteilungen (N Werte 0-100).

    Methoden:
    - available(): liste der Namen
    - descriptions(): beschreibungen
    - generate(name, N=40): liefert Liste von N Integer-Werten (0-100)
    """

    @classmethod
    def create_normal(cls, N=40, mu=50, sigma=15) -> List[float]:
        # Erzeuge N Werte, dann Histogramm (nicht kumuliert)
        raw = []
        for i in range(N * 10):
            u1 = (i + 1) / (N * 10 + 1)
            u2 = (i + 0.5) / (N * 10)
            z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
            v = max(0, min(100, int(mu + z * sigma)))
            raw.append(v)
        # Histogramm auf N Bins
        hist = [0] * N
        for v in raw:
            idx = min(N - 1, max(0, int(v / 100 * N)))
            hist[idx] += 1
        total = sum(hist)
        return [round(h * 100 / total, 2) for h in hist]

    @classmethod
    def create_uniform(cls, N=40) -> List[float]:
        # Gleichverteilung: alle gleich wahrscheinlich
        return [round(100 / N, 2)] * N

    @classmethod
    def create_bimodal(cls, N=40) -> List[float]:
        # Zwei Normalverteilungen, Histogramm
        raw = []
        for i in range(N * 5):
            u1 = (i + 1) / (N * 5 + 1)
            u2 = (i + 0.5) / (N * 5)
            z = math.sqrt(-2 * math.log(u1)) * math.cos(2 * math.pi * u2)
            v1 = max(0, min(100, int(30 + z * 10)))
            v2 = max(0, min(100, int(70 + z * 10)))
            raw.append(v1)
            raw.append(v2)
        hist = [0] * N
        for v in raw:
            idx = min(N - 1, max(0, int(v / 100 * N)))
            hist[idx] += 1
        total = sum(hist)
        return [round(h * 100 / total, 2) for h in hist]

    @classmethod
    def create_exponential(cls, N=40, lambda_param=0.1) -> List[float]:
        # Viele kleine, wenige große Werte, Histogramm
        raw = []
        for i in range(N * 10):
            u = (i + 0.5) / (N * 10)
            exp_val = -math.log(max(0.001, u)) / lambda_param
            v = max(0, min(100, int(exp_val)))
            raw.append(v)
        hist = [0] * N
        for v in raw:
            idx = min(N - 1, max(0, int(v / 100 * N)))
            hist[idx] += 1
        total = sum(hist)
        return [round(h * 100 / total, 2) for h in hist]

    @classmethod
    def create_left_skewed(cls, N=40) -> List[float]:
        # Linkssteil, Histogramm
        raw = []
        for i in range(N * 10):
            u = (i + 0.5) / (N * 10)
            v = int(100 * (u ** 0.5))
            raw.append(v)
        hist = [0] * N
        for v in raw:
            idx = min(N - 1, max(0, int(v / 100 * N)))
            hist[idx] += 1
        total = sum(hist)
        return [round(h * 100 / total, 2) for h in hist]

    @classmethod
    def available(cls) -> List[str]:
        return [
            "normal",
            "uniform",
            "bimodal",
            "exponential",
            "left_skewed",
        ]

    @classmethod
    def descriptions(cls) -> Dict[str, str]:
        return {
            "normal": "Normalverteilung (Glockenform, Mitte um 50)",
            "uniform": "Gleichverteilung (überall gleich wahrscheinlich)",
            "bimodal": "Bimodale Verteilung (zwei Spitzen bei 30 und 70)",
            "exponential": "Exponentialverteilung (viele kleine, wenige große Werte)",
            "left_skewed": "Linksverteilung (mehr Werte auf der rechten Seite)",
        }

    @classmethod
    def generate(cls, name: str, N: int = 40) -> List[int]:
        name = (name or "").lower()
        if name == "normal":
            return cls.create_normal(N)
        if name == "uniform":
            return cls.create_uniform(N)
        if name == "bimodal":
            return cls.create_bimodal(N)
        if name == "exponential":
            return cls.create_exponential(N)
        if name == "left_skewed":
            return cls.create_left_skewed(N)
        # default
        return cls.create_normal(N)
