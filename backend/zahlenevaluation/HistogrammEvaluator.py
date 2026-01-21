import math
from typing import List, Dict, Any


class HistogrammEvaluator:
    """
    Evaluiert zwei Histogramme (Counts pro Bin).
    Liefert Form-Ähnlichkeit und einen Score zwischen 0 und 1.
    """

    def __init__(self, ground_truth: List[int], player_histogram: List[int]):
        self.gt = ground_truth or []
        self.pl = player_histogram or []

    def _normalize(self, hist: List[int]) -> List[float]:
        s = sum(hist)
        if s == 0:
            return [0.0] * len(hist)
        return [h / s for h in hist]

    def evaluate(self) -> Dict[str, Any]:
        if not self.gt or not self.pl or len(self.gt) != len(self.pl):
            return {
                "drawing_score": 0.0,
                "rmse": None,
                "wasserstein_distance": None,
            }

        gt_n = self._normalize(self.gt)
        pl_n = self._normalize(self.pl)

        # --- RMSE ---
        rmse = math.sqrt(
            sum((g - p) ** 2 for g, p in zip(gt_n, pl_n)) / len(gt_n)
        )
        rmse_score = max(0.0, 1.0 - rmse * 3.0)

        # --- Wasserstein (CDF) ---
        cdf_gt, cdf_pl = [], []
        s_gt = s_pl = 0.0
        for g, p in zip(gt_n, pl_n):
            s_gt += g
            s_pl += p
            cdf_gt.append(s_gt)
            cdf_pl.append(s_pl)

        wasserstein = sum(
            abs(a - b) for a, b in zip(cdf_gt, cdf_pl)
        ) / len(cdf_gt)
        wasserstein_score = max(0.0, 1.0 - wasserstein)

        # --- Final Drawing Score ---
        drawing_score = 0.6 * rmse_score + 0.4 * wasserstein_score

        return {
            "drawing_score": round(drawing_score, 3),
            "rmse": round(rmse, 4),
            "rmse_score": round(rmse_score, 3),
            "wasserstein_distance": round(wasserstein, 4),
            "wasserstein_score": round(wasserstein_score, 3),
        }
