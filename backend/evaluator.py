"""
DistributionEvaluator
Evaluiert den Vergleich zwischen Ground-Truth-Verteilung (Referenz)
und der vom Spieler gezeichneten Verteilung.
Berechnet MSE (Mean Squared Error) und MAE (Mean Absolute Error).
"""

from typing import List
import math


class DistributionEvaluator:
    """
    Evaluiert den Vergleich zwischen Ground-Truth-Verteilung (Referenz)
    und der vom Spieler gezeichneten Verteilung.
    Berechnet MSE (Mean Squared Error) und normalisiertes MAE.
    """

    def __init__(self, ground_truth: List[int], player_distribution: List[int], wasserstein_threshold: float = 0.2):
        """
        Args:
            ground_truth: Ground-Truth Samples (0-100)
            player_distribution: Spieler-Samples (0-100)
        """
        self.ground_truth = ground_truth
        self.player_distribution = player_distribution
        self.wasserstein_threshold = wasserstein_threshold

    def _histogram_0_100(self, samples: List[int]) -> List[int]:
        """Erstellt Histogram der Samples (0-100 bins)"""
        bins = [0] * 101
        for v in samples:
            if v is None:
                continue
            try:
                vi = int(round(v))
            except Exception:
                continue
            vi = max(0, min(100, vi))
            bins[vi] += 1
        return bins

    def _to_probability_vector(self, data: List[float]) -> List[float]:
        """Convert input to a probability vector.

        - If sum ≈ 1: treat as probabilities
        - If sum ≈ 100: treat as percentages (Blockhöhen)
        - If length == 50 and all 0-100: treat as percentages (Blockhöhen)
        - Otherwise: treat as raw samples and bin into 101-bin histogram
        """
        if not data:
            return []
        vals = [float(x) for x in data]
        s = sum(vals)
        # Wahrscheinlichkeitsvektor (Summe 1)
        if abs(s - 1.0) < 1e-6:
            return vals
        # Prozentvektor (Summe 100)
        if abs(s - 100.0) < 1.0:
            return [v / 100.0 for v in vals]
        # Blockhöhen: 50 Werte, alle 0-100
        if len(vals) == 50 and all(0 <= v <= 100 for v in vals):
            total = sum(vals)
            if total == 0:
                return [0.0] * 50
            return [v / total for v in vals]
        # treat as raw samples in 0-100 (even if short)
        if all(0 <= v <= 100 for v in vals):
            hist = self._histogram_0_100([int(round(v)) for v in vals])
            total = sum(hist)
            if total == 0:
                return [0.0] * len(hist)
            return [h / total for h in hist]
        # fallback: normalize to sum 1
        if s == 0:
            return [0.0] * len(vals)
        return [v / s for v in vals]

    def _align_vectors(self, p: List[float], q: List[float]) -> (List[float], List[float]):
        """Ensure both vectors have same length. If lengths differ, try to resample q to p's length using simple aggregation.

        This is a best-effort alignment: if one vector has length 101 and the other N, and N divides 100 evenly,
        map p's bins to q's bins by aggregating ranges.
        """
        if len(p) == len(q):
            return p, q
        # try to map 101 -> N or N -> 101
        if len(p) == 101 and len(q) != 101:
            # aggregate p into q's length
            N = len(q)
            agg = [0.0] * N
            for i, val in enumerate(p):
                # map bin index (0..100) to target bin
                tgt = int(i / 101 * N)
                if tgt >= N: tgt = N - 1
                agg[tgt] += val
            return agg, q
        if len(q) == 101 and len(p) != 101:
            N = len(p)
            agg = [0.0] * N
            for i, val in enumerate(q):
                tgt = int(i / 101 * N)
                if tgt >= N: tgt = N - 1
                agg[tgt] += val
            return p, agg
        # otherwise if lengths differ, resample by linear interpolation to max length
        L = max(len(p), len(q))
        def upsample(arr, L):
            if len(arr) == 0:
                return [0.0] * L
            out = [0.0] * L
            for i in range(L):
                # map i to original index pos
                pos = i * (len(arr) - 1) / (L - 1) if L > 1 else 0
                lo = int(math.floor(pos))
                hi = int(math.ceil(pos))
                if lo == hi:
                    out[i] = arr[lo]
                else:
                    t = pos - lo
                    out[i] = arr[lo] * (1 - t) + arr[hi] * t
            return out
        return upsample(p, L), upsample(q, L)

    def _normalize_histogram(self, bins: List[int]) -> List[float]:
        """Normalisiert Histogram zu Wahrscheinlichkeiten (0-1)"""
        s = sum(bins)
        if s == 0:
            return [0.0] * len(bins)
        return [x / s for x in bins]

    def calculate_mse(self) -> float:
        """
        Berechnet Mean Squared Error zwischen Histogrammen.
        """
        p = self._to_probability_vector(self.ground_truth)
        q = self._to_probability_vector(self.player_distribution)
        p, q = self._align_vectors(p, q)
        if len(p) == 0:
            return 0.0
        mse = sum((a - b) ** 2 for a, b in zip(p, q)) / len(p)
        return mse

    def calculate_mae(self) -> float:
        """
        Berechnet Mean Absolute Error zwischen Histogrammen.
        """
        p = self._to_probability_vector(self.ground_truth)
        q = self._to_probability_vector(self.player_distribution)
        p, q = self._align_vectors(p, q)
        if len(p) == 0:
            return 0.0
        mae = sum(abs(a - b) for a, b in zip(p, q)) / len(p)
        return mae

    def calculate_wasserstein(self) -> float:
        """Compute 1D Wasserstein (Earth Mover's Distance) for discrete distributions.

        We compute W1 = sum(|CDF_p(i) - CDF_q(i)|) / N, where N is number of bins.
        This yields a value in [0,1].
        """
        p = self._to_probability_vector(self.ground_truth)
        q = self._to_probability_vector(self.player_distribution)
        p, q = self._align_vectors(p, q)
        if len(p) == 0:
            return 0.0
        cdf_p = []
        cdf_q = []
        s = 0.0
        for v in p:
            s += v
            cdf_p.append(s)
        s = 0.0
        for v in q:
            s += v
            cdf_q.append(s)
        total = sum(abs(a - b) for a, b in zip(cdf_p, cdf_q))
        return total / len(p)

    def calculate_tvd(self) -> float:
        """Total Variation Distance: 0.5 * sum|p - q|"""
        p = self._to_probability_vector(self.ground_truth)
        q = self._to_probability_vector(self.player_distribution)
        p, q = self._align_vectors(p, q)
        if len(p) == 0:
            return 0.0
        return 0.5 * sum(abs(a - b) for a, b in zip(p, q))

    def _mean_and_std(self, prob: List[float]) -> (float, float):
        """Compute mean and std in [0,100] value space assuming bins uniformly cover 0..100."""
        if not prob:
            return 0.0, 0.0
        N = len(prob)
        # bin centers
        centers = [((i + 0.5) / N) * 100.0 for i in range(N)]
        mean = sum(p * c for p, c in zip(prob, centers))
        mean_sq = sum(p * (c ** 2) for p, c in zip(prob, centers))
        var = max(0.0, mean_sq - mean * mean)
        std = math.sqrt(var)
        return mean, std

    def evaluate(self) -> dict:
        """
        Führt vollständige Evaluierung durch.
        Gibt MSE, MAE und einen Score (0-100) zurück.
        """
        # compute all requested metrics
        p = self._to_probability_vector(self.ground_truth)
        q = self._to_probability_vector(self.player_distribution)
        p, q = self._align_vectors(p, q)

        mse = self.calculate_mse()
        mae = self.calculate_mae()
        wasserstein = self.calculate_wasserstein()
        tvd = self.calculate_tvd()

        # mean / std absolute errors
        mean_p, std_p = self._mean_and_std(p)
        mean_q, std_q = self._mean_and_std(q)
        abs_mean_error = abs(mean_p - mean_q)
        abs_std_error = abs(std_p - std_q)

        passed = wasserstein <= self.wasserstein_threshold

        return {
            "mse": mse,
            "mae": mae,
            "wasserstein": wasserstein,
            "tvd": tvd,
            "abs_mean_error": abs_mean_error,
            "abs_std_error": abs_std_error,
            "passed": passed
        }
