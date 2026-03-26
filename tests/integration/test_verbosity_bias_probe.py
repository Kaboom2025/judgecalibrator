"""Integration tests for verbosity bias probe."""
import pytest
from unittest.mock import MagicMock, patch
from judgecalib.schemas import Task, ProbeResult
from judgecalib.core.prober import Prober
from judgecalib.core.judge_wrapper import JudgeWrapper


class TestVerbosityBiasProbe:
    """Tests for verbosity bias probe."""

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_verbosity_bias_returns_probe_result(self, mock_judge_completion):
        """run_verbosity_bias should return a ProbeResult."""
        tasks = [
            Task(
                id="task_0",
                question="Answer this",
                reference_answer="Short answer",
                human_score=7.0,
            ),
        ]

        def judge_side_effect(*args, **kwargs):
            return MagicMock(
                choices=[
                    MagicMock(
                        message=MagicMock(
                            content='{"score": 7, "confidence": 75, "reasoning": "good"}'
                        )
                    )
                ]
            )

        mock_judge_completion.side_effect = judge_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_verbosity_bias()

        assert isinstance(result, ProbeResult)
        assert result.probe_name == "verbosity_bias"
        assert result.metric_name == "mean_lift"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_verbosity_zero_lift_when_no_preference(self, mock_judge_completion):
        """Should have zero lift when original and padded get same score."""
        tasks = [
            Task(
                id="task_0",
                question="Answer this",
                reference_answer="Original answer",
                human_score=5.0,
            ),
        ]

        # Both original and padded get same score
        def judge_side_effect(*args, **kwargs):
            return MagicMock(
                choices=[
                    MagicMock(
                        message=MagicMock(
                            content='{"score": 6, "confidence": 75, "reasoning": "good"}'
                        )
                    )
                ]
            )

        mock_judge_completion.side_effect = judge_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_verbosity_bias()

        assert result.metric_value == 0.0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_verbosity_positive_lift_when_longer_preferred(self, mock_judge_completion):
        """Should have positive lift when padded version scores higher."""
        tasks = [
            Task(
                id="task_0",
                question="Answer this",
                reference_answer="Answer",
                human_score=5.0,
            ),
        ]

        scores = [6, 8]  # Original scores 6, padded scores 8
        call_count = [0]

        def judge_side_effect(*args, **kwargs):
            score = scores[call_count[0] % len(scores)]
            call_count[0] += 1
            return MagicMock(
                choices=[
                    MagicMock(
                        message=MagicMock(
                            content=f'{{"score": {score}, "confidence": 75, "reasoning": "test"}}'
                        )
                    )
                ]
            )

        mock_judge_completion.side_effect = judge_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_verbosity_bias()

        assert result.metric_value > 0.0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_verbosity_details_include_per_task_lifts(self, mock_judge_completion):
        """Details should include per_task_lifts and max_lift."""
        tasks = [
            Task(
                id="task_0",
                question="Answer",
                reference_answer="Original",
                human_score=5.0,
            ),
            Task(
                id="task_1",
                question="Answer",
                reference_answer="Another",
                human_score=6.0,
            ),
        ]

        def judge_side_effect(*args, **kwargs):
            return MagicMock(
                choices=[
                    MagicMock(
                        message=MagicMock(
                            content='{"score": 6, "confidence": 75, "reasoning": "test"}'
                        )
                    )
                ]
            )

        mock_judge_completion.side_effect = judge_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_verbosity_bias()

        assert "per_task_lifts" in result.details
        assert isinstance(result.details["per_task_lifts"], list)
        assert len(result.details["per_task_lifts"]) == 2
        assert "max_lift" in result.details

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_verbosity_skips_tasks_without_reference_answer(
        self, mock_judge_completion
    ):
        """Should skip tasks without reference_answer."""
        tasks = [
            Task(
                id="task_0",
                question="Answer",
                reference_answer="Original",
                human_score=5.0,
            ),
            Task(
                id="task_1",
                question="Answer",
                reference_answer=None,
                human_score=6.0,
            ),
            Task(
                id="task_2",
                question="Answer",
                reference_answer="Another",
                human_score=7.0,
            ),
        ]

        judge_call_count = [0]

        def judge_side_effect(*args, **kwargs):
            judge_call_count[0] += 1
            return MagicMock(
                choices=[
                    MagicMock(
                        message=MagicMock(
                            content='{"score": 6, "confidence": 75, "reasoning": "test"}'
                        )
                    )
                ]
            )

        mock_judge_completion.side_effect = judge_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_verbosity_bias()

        # Should only process 2 tasks with reference_answer
        # Each task: 2 evals (original + padded) = 4 judge calls
        assert judge_call_count[0] == 4

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_verbosity_empty_tasks(self, mock_judge_completion):
        """Should handle empty task list."""
        tasks = []

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_verbosity_bias()

        assert isinstance(result, ProbeResult)
        assert result.probe_name == "verbosity_bias"
