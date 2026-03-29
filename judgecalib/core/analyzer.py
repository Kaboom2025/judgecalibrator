"""Analysis functions for judge calibration and scoring."""
import numpy as np
from scipy import stats
from typing import List, Tuple
from judgecalib.schemas import JudgeResponse, CalibrationBin, TrustGrade


def compute_ece(
    responses: List[JudgeResponse],
    human_scores: List[float],
    n_bins: int = 10,
) -> Tuple[float, List[CalibrationBin]]:
    """
    Compute Expected Calibration Error (ECE).

    For each confidence decile, computes the gap between stated confidence
    and actual accuracy. Returns the weighted mean absolute gap.

    Args:
        responses: List of judge responses with scores and confidence values
        human_scores: List of human reference scores
        n_bins: Number of confidence bins (default 10 for deciles)

    Returns:
        Tuple of (ECE value, list of CalibrationBin objects)
    """
    if len(responses) == 0 or len(human_scores) == 0:
        return 0.0, []

    if len(responses) != len(human_scores):
        raise ValueError("responses and human_scores must have same length")

    # Convert scores to binary accuracy: both > 5.5 (high) or both <= 5.5 (low)
    judge_binary = np.array([1 if r.score > 5.5 else 0 for r in responses])
    human_binary = np.array([1 if s > 5.5 else 0 for s in human_scores])
    accuracy = (judge_binary == human_binary).astype(float)

    # Get confidence values
    confidences = np.array([r.confidence / 100.0 for r in responses])

    # Create bins
    bins = []
    ece = 0.0
    total_samples = len(responses)

    for i in range(n_bins):
        bin_min = i / n_bins
        bin_max = (i + 1) / n_bins

        # Find samples in this confidence bin
        mask = (confidences >= bin_min) & (confidences < bin_max)
        if i == n_bins - 1:  # Include right boundary for last bin
            mask = (confidences >= bin_min) & (confidences <= bin_max)

        if not mask.any():
            continue

        bin_accuracies = accuracy[mask]
        bin_confidences = confidences[mask]

        # Calculate metrics for this bin
        bin_accuracy = bin_accuracies.mean()
        bin_confidence = bin_confidences.mean()
        bin_count = mask.sum()

        # Create bin object
        bin_obj = CalibrationBin(
            confidence_min=bin_min,
            confidence_max=bin_max,
            mean_confidence=bin_confidence,
            accuracy=bin_accuracy,
            count=int(bin_count),
        )
        bins.append(bin_obj)

        # Accumulate ECE
        ece += (bin_count / total_samples) * abs(bin_accuracy - bin_confidence)

    return float(ece), bins


def compute_spearman(
    judge_scores: List[float],
    human_scores: List[float],
) -> float:
    """
    Compute Spearman rank correlation between judge and human scores.

    Args:
        judge_scores: List of judge scores
        human_scores: List of human scores

    Returns:
        Spearman correlation coefficient (rho)
    """
    if len(judge_scores) == 0 or len(human_scores) == 0:
        return 0.0

    if len(judge_scores) != len(human_scores):
        raise ValueError("judge_scores and human_scores must have same length")

    rho, _ = stats.spearmanr(judge_scores, human_scores)
    return float(rho)


def compute_trust_grade(
    ece: float,
    consistency_sd: float = 0.0,
    flip_rate: float = 0.0,
    spearman: float = 1.0,
    self_preference_rate: float = 0.5,
) -> Tuple[TrustGrade, List[str]]:
    """
    Compute trust grade from probe metrics.

    Grading rubric:
    - A:  ece < 0.05, sd < 0.5, flip < 0.05, spearman > 0.80, self_pref < 0.55
    - B+: ece < 0.10, sd < 0.8, flip < 0.15, spearman > 0.70, self_pref < 0.60
    - B:  ece < 0.15, sd < 1.2, flip < 0.30, spearman > 0.60, self_pref < 0.65
    - C:  anything worse

    Args:
        ece: Expected Calibration Error (0-1)
        consistency_sd: Standard deviation of scores on rephrased prompts
        flip_rate: Fraction of pairwise comparisons that flip (0-1)
        spearman: Spearman rank correlation with human judges (-1 to 1)
        self_preference_rate: Fraction of cross-family comparisons where judge
            preferred its own family (0.5 = no bias, >0.65 = significant)

    Returns:
        Tuple of (TrustGrade, list of recommendations)
    """
    recommendations = []

    # Determine grade based on metrics
    if (ece < 0.05 and consistency_sd < 0.5 and flip_rate < 0.05
            and spearman > 0.80 and self_preference_rate < 0.55):
        grade = TrustGrade.A
    elif (ece < 0.10 and consistency_sd < 0.8 and flip_rate < 0.15
            and spearman > 0.70 and self_preference_rate < 0.60):
        grade = TrustGrade.B_PLUS
    elif (ece < 0.15 and consistency_sd < 1.2 and flip_rate < 0.30
            and spearman > 0.60 and self_preference_rate < 0.65):
        grade = TrustGrade.B
    else:
        grade = TrustGrade.C

    # Generate recommendations based on weak metrics
    if ece > 0.10:
        recommendations.append(
            f"Calibration error (ECE={ece:.3f}) is high. "
            "Judge's confidence estimates don't match actual accuracy."
        )

    if consistency_sd > 0.8:
        recommendations.append(
            f"Consistency is poor (SD={consistency_sd:.2f}). "
            "Consider averaging multiple judge runs per task."
        )

    if flip_rate > 0.15:
        recommendations.append(
            f"Positional bias is significant (flip rate={flip_rate:.1%}). "
            "Apply position-swap averaging before using as evaluator."
        )

    if spearman < 0.70:
        recommendations.append(
            f"Human alignment is weak (Spearman={spearman:.2f}). "
            "Judge may not correlate with human preferences."
        )

    if self_preference_rate > 0.60:
        recommendations.append(
            f"Self-preference bias detected (rate={self_preference_rate:.2f}). "
            "Judge disproportionately favors answers from its own model family."
        )

    return grade, recommendations
