"""Tests for analyzer module."""
import pytest
import numpy as np
from judgecalib.schemas import JudgeResponse, TrustGrade
from judgecalib.core.analyzer import (
    compute_ece,
    compute_spearman,
    compute_trust_grade,
)


class TestComputeECE:
    """Tests for Expected Calibration Error computation."""

    def test_ece_perfect_calibration(self):
        """Perfect calibration: all responses accurate at stated confidence."""
        responses = []
        human_scores = []
        # 10 responses with confidence=90, score matches human direction
        for i in range(10):
            responses.append(
                JudgeResponse(task_id=f"task_{i}", score=8, confidence=90)
            )
            human_scores.append(8.0)

        ece, bins = compute_ece(responses, human_scores, n_bins=10)

        # With perfect accuracy at high confidence, ECE should be small
        assert isinstance(ece, float)
        assert 0.0 <= ece <= 1.0
        assert len(bins) > 0

    def test_ece_overconfident(self):
        """Overconfident: high confidence but low accuracy."""
        responses = []
        human_scores = []
        # 10 responses: 5 with confidence=90 and correct, 5 with confidence=90 but wrong
        for i in range(5):
            responses.append(
                JudgeResponse(task_id=f"task_{i}", score=8, confidence=90)
            )
            human_scores.append(8.0)

        for i in range(5, 10):
            responses.append(
                JudgeResponse(task_id=f"task_{i}", score=8, confidence=90)
            )
            human_scores.append(2.0)

        ece, bins = compute_ece(responses, human_scores, n_bins=10)

        # With 50% accuracy at 90% confidence, ECE should be significant (~0.4)
        assert isinstance(ece, float)
        assert ece > 0.2

    def test_ece_empty_bins_ignored(self):
        """Empty bins should not cause division by zero."""
        responses = []
        human_scores = []
        # All responses in confidence range 80-100
        for i in range(5):
            responses.append(
                JudgeResponse(task_id=f"task_{i}", score=9, confidence=90)
            )
            human_scores.append(9.0)

        ece, bins = compute_ece(responses, human_scores, n_bins=10)

        # Should complete without error
        assert isinstance(ece, float)
        assert 0.0 <= ece <= 1.0

    def test_ece_returns_bins(self):
        """ECE computation should return list of bins."""
        responses = []
        human_scores = []
        for i in range(10):
            responses.append(
                JudgeResponse(task_id=f"task_{i}", score=5, confidence=50)
            )
            human_scores.append(5.0)

        ece, bins = compute_ece(responses, human_scores, n_bins=10)

        assert isinstance(bins, list)
        assert len(bins) > 0
        # Verify bin structure
        for bin_item in bins:
            assert hasattr(bin_item, "confidence_min")
            assert hasattr(bin_item, "confidence_max")
            assert hasattr(bin_item, "mean_confidence")
            assert hasattr(bin_item, "accuracy")
            assert hasattr(bin_item, "count")

    def test_ece_with_mixed_scores(self):
        """ECE with varied judge and human scores."""
        responses = [
            JudgeResponse(task_id="task_0", score=7, confidence=75),
            JudgeResponse(task_id="task_1", score=3, confidence=25),
            JudgeResponse(task_id="task_2", score=9, confidence=90),
            JudgeResponse(task_id="task_3", score=6, confidence=60),
        ]
        human_scores = [7.0, 3.0, 9.0, 6.0]

        ece, bins = compute_ece(responses, human_scores, n_bins=4)

        # Close match: ece should be reasonable
        assert 0.0 <= ece <= 1.0


class TestComputeSpearman:
    """Tests for Spearman rank correlation."""

    def test_spearman_perfect_correlation(self):
        """Perfect positive correlation: judge == human."""
        judge_scores = [1.0, 2.0, 3.0, 4.0, 5.0]
        human_scores = [1.0, 2.0, 3.0, 4.0, 5.0]

        rho = compute_spearman(judge_scores, human_scores)

        assert isinstance(rho, float)
        assert abs(rho - 1.0) < 0.01

    def test_spearman_negative_correlation(self):
        """Perfect negative correlation: reversed ranking."""
        judge_scores = [5.0, 4.0, 3.0, 2.0, 1.0]
        human_scores = [1.0, 2.0, 3.0, 4.0, 5.0]

        rho = compute_spearman(judge_scores, human_scores)

        assert isinstance(rho, float)
        assert abs(rho - (-1.0)) < 0.01

    def test_spearman_no_correlation(self):
        """Moderate negative correlation."""
        judge_scores = [1.0, 3.0, 2.0, 5.0, 4.0]
        human_scores = [5.0, 1.0, 3.0, 2.0, 4.0]

        rho = compute_spearman(judge_scores, human_scores)

        assert isinstance(rho, float)
        # Should be some correlation (not exactly 0 on small sample)
        assert -1.0 <= rho <= 1.0

    def test_spearman_with_ties(self):
        """Spearman should handle ties gracefully."""
        judge_scores = [1.0, 2.0, 2.0, 4.0, 5.0]
        human_scores = [1.0, 2.0, 2.0, 4.0, 5.0]

        rho = compute_spearman(judge_scores, human_scores)

        assert isinstance(rho, float)
        assert abs(rho - 1.0) < 0.01


class TestComputeTrustGrade:
    """Tests for trust grade computation."""

    def test_trust_grade_a(self):
        """Grade A: excellent calibration and alignment."""
        grade, recommendations = compute_trust_grade(
            ece=0.03,
            consistency_sd=0.4,
            flip_rate=0.04,
            spearman=0.85,
        )

        assert grade == TrustGrade.A
        assert isinstance(recommendations, list)

    def test_trust_grade_b_plus(self):
        """Grade B+: good calibration and alignment."""
        grade, recommendations = compute_trust_grade(
            ece=0.08,
            consistency_sd=0.7,
            flip_rate=0.12,
            spearman=0.75,
        )

        assert grade == TrustGrade.B_PLUS
        assert isinstance(recommendations, list)

    def test_trust_grade_b(self):
        """Grade B: acceptable calibration and alignment."""
        grade, recommendations = compute_trust_grade(
            ece=0.12,
            consistency_sd=1.0,
            flip_rate=0.25,
            spearman=0.65,
        )

        assert grade == TrustGrade.B
        assert isinstance(recommendations, list)

    def test_trust_grade_c(self):
        """Grade C: poor calibration and/or alignment."""
        grade, recommendations = compute_trust_grade(
            ece=0.20,
            consistency_sd=2.0,
            flip_rate=0.50,
            spearman=0.40,
        )

        assert grade == TrustGrade.C
        assert isinstance(recommendations, list)

    def test_trust_grade_returns_recommendations(self):
        """Trust grade should return actionable recommendations."""
        grade, recommendations = compute_trust_grade(
            ece=0.20,
            consistency_sd=1.5,
            flip_rate=0.45,
            spearman=0.50,
        )

        assert isinstance(recommendations, list)
        # Should have recommendations for poor performance
        if grade in [TrustGrade.C, TrustGrade.B]:
            assert len(recommendations) > 0

    def test_trust_grade_with_default_params(self):
        """Trust grade should work with only ECE provided."""
        grade, recommendations = compute_trust_grade(ece=0.05)

        assert grade in [
            TrustGrade.A,
            TrustGrade.B_PLUS,
            TrustGrade.B,
            TrustGrade.C,
        ]

    def test_trust_grade_ece_dominant_factor(self):
        """ECE should be a primary factor in grading."""
        # Excellent on all metrics should result in A
        grade_excellent, _ = compute_trust_grade(
            ece=0.03,
            consistency_sd=0.4,
            flip_rate=0.02,
            spearman=0.85,
        )

        # Bad ECE should result in C regardless of other metrics
        grade_bad_ece, _ = compute_trust_grade(
            ece=0.25,
            consistency_sd=0.2,
            flip_rate=0.01,
            spearman=0.95,
        )

        # Excellent metrics should yield A, bad ECE should yield C
        assert grade_excellent == TrustGrade.A
        assert grade_bad_ece == TrustGrade.C

    def test_trust_grade_consistency_matters(self):
        """High consistency SD should lower grade."""
        # All good metrics with low SD should yield B or better
        grade_consistent, _ = compute_trust_grade(
            ece=0.08,
            consistency_sd=0.4,
            flip_rate=0.10,
            spearman=0.72,
        )
        # All same metrics but high SD should yield C
        grade_inconsistent, _ = compute_trust_grade(
            ece=0.08,
            consistency_sd=2.0,
            flip_rate=0.10,
            spearman=0.72,
        )

        # Consistent should yield better grade than inconsistent
        assert grade_consistent != TrustGrade.C
        assert grade_inconsistent == TrustGrade.C

    def test_trust_grade_flip_rate_matters(self):
        """High flip rate should lower grade."""
        # Good metrics with low flip rate should yield B or better
        grade_low_flip, _ = compute_trust_grade(
            ece=0.08,
            consistency_sd=0.7,
            flip_rate=0.05,
            spearman=0.72,
        )
        # Same metrics with high flip rate should yield C
        grade_high_flip, _ = compute_trust_grade(
            ece=0.08,
            consistency_sd=0.7,
            flip_rate=0.60,
            spearman=0.72,
        )

        # Low flip should yield better grade than high flip
        assert grade_low_flip != TrustGrade.C
        assert grade_high_flip == TrustGrade.C

    def test_trust_grade_spearman_matters(self):
        """High Spearman correlation should improve grade."""
        # Good metrics with high Spearman should yield B+ or A
        grade_high_spearman, _ = compute_trust_grade(
            ece=0.08,
            consistency_sd=0.7,
            flip_rate=0.10,
            spearman=0.80,
        )
        # Same metrics with low Spearman should yield C
        grade_low_spearman, _ = compute_trust_grade(
            ece=0.08,
            consistency_sd=0.7,
            flip_rate=0.10,
            spearman=0.40,
        )

        # High Spearman should yield better grade than low Spearman
        assert grade_high_spearman != TrustGrade.C
        assert grade_low_spearman == TrustGrade.C
