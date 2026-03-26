"""Integration tests for positional bias probe."""
import pytest
from unittest.mock import MagicMock, patch
from judgecalib.schemas import Task, ProbeResult
from judgecalib.core.prober import Prober
from judgecalib.core.judge_wrapper import JudgeWrapper


class TestPositionalBiasProbe:
    """Tests for positional bias probe integration."""

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_positional_bias_returns_probe_result(self, mock_judge_completion):
        """Prober.run_positional_bias should return a ProbeResult."""
        tasks = [
            Task(
                id="task_0",
                question="Compare these two options",
                options=["Option A", "Option B"],
                human_score=7.0,
            ),
            Task(
                id="task_1",
                question="Compare these two options",
                options=["Option C", "Option D"],
                human_score=8.0,
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
        result = prober.run_positional_bias()

        assert isinstance(result, ProbeResult)
        assert result.probe_name == "positional_bias"
        assert result.metric_name == "flip_rate"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_flip_rate_zero_when_consistent(self, mock_judge_completion):
        """flip_rate should be 0 when judge consistently prefers one option regardless of position."""
        tasks = [
            Task(
                id="task_0",
                question="Compare these",
                options=["Better option", "Worse option"],
                human_score=5.0,
            ),
        ]

        # Judge always scores the same content option higher (better option gets high score)
        # This means no positional bias - the judge is consistent in content preference
        def judge_side_effect(*args, **kwargs):
            content = kwargs.get("messages", [{}])[1].get("content", "")
            # Check if "Better option" is in position A
            if "Answer A: Better option" in content:
                # Better option is in position A
                score = 8
            elif "Answer A: Worse option" in content:
                # Worse option is in position A, so Better option is in position B
                score = 2
            else:
                score = 5
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
        result = prober.run_positional_bias()

        # Judge prefers the same option (Better) regardless of position -> flip_rate = 0
        assert result.metric_value == 0.0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_flip_rate_one_when_always_flips(self, mock_judge_completion):
        """flip_rate should be 1.0 when judge always prefers whichever is first."""
        tasks = [
            Task(
                id="task_0",
                question="Compare these",
                options=["Option 1", "Option 2"],
                human_score=5.0,
            ),
        ]

        # Judge always scores whichever is "Answer A" higher (positional bias)
        def judge_side_effect(*args, **kwargs):
            # Both A and B get high scores, but we want the flip to happen
            # when the options are swapped. Let's return 9 for A and 2 for B
            content = kwargs.get("messages", [{}])[1].get("content", "")
            if "Answer A:" in content:
                score = 9
            else:
                score = 2
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
        result = prober.run_positional_bias()

        # Always prefers Answer A -> flip_rate = 1.0
        assert result.metric_value == 1.0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_positional_details_include_flip_rate(self, mock_judge_completion):
        """Details should include position_a_preference_rate."""
        tasks = [
            Task(
                id="task_0",
                question="Compare these",
                options=["Option A", "Option B"],
                human_score=5.0,
            ),
            Task(
                id="task_1",
                question="Compare these",
                options=["Option C", "Option D"],
                human_score=6.0,
            ),
        ]

        def judge_side_effect(*args, **kwargs):
            return MagicMock(
                choices=[
                    MagicMock(
                        message=MagicMock(
                            content='{"score": 7, "confidence": 75, "reasoning": "test"}'
                        )
                    )
                ]
            )

        mock_judge_completion.side_effect = judge_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_positional_bias()

        assert "position_a_preference_rate" in result.details
        assert isinstance(result.details["position_a_preference_rate"], float)
        assert 0.0 <= result.details["position_a_preference_rate"] <= 1.0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_positional_bias_skips_tasks_without_options(
        self, mock_judge_completion
    ):
        """Should skip tasks without options."""
        tasks = [
            Task(
                id="task_0",
                question="Compare these",
                options=["Option A", "Option B"],
                human_score=5.0,
            ),
            Task(
                id="task_1",
                question="No options here",
                reference_answer="Answer",
                human_score=6.0,
            ),
            Task(
                id="task_2",
                question="Compare these too",
                options=["Option C", "Option D"],
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
                            content='{"score": 7, "confidence": 75, "reasoning": "test"}'
                        )
                    )
                ]
            )

        mock_judge_completion.side_effect = judge_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_positional_bias()

        # Should only process 2 tasks with options
        # Each task: 2 comparisons (A-B and B-A) = 4 judge calls
        assert judge_call_count[0] == 4

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_positional_bias_empty_tasks(self, mock_judge_completion):
        """Should handle empty task list."""
        tasks = []

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_positional_bias()

        assert isinstance(result, ProbeResult)
        assert result.probe_name == "positional_bias"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_positional_bias_skips_single_option_tasks(
        self, mock_judge_completion
    ):
        """Should skip tasks with fewer than 2 options."""
        tasks = [
            Task(
                id="task_0",
                question="Compare",
                options=["Option A"],  # Only 1 option
                human_score=5.0,
            ),
            Task(
                id="task_1",
                question="Compare",
                options=["Option A", "Option B"],  # 2 options
                human_score=6.0,
            ),
        ]

        judge_call_count = [0]

        def judge_side_effect(*args, **kwargs):
            judge_call_count[0] += 1
            return MagicMock(
                choices=[
                    MagicMock(
                        message=MagicMock(
                            content='{"score": 7, "confidence": 75, "reasoning": "test"}'
                        )
                    )
                ]
            )

        mock_judge_completion.side_effect = judge_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_positional_bias()

        # Should only process task_1 (2 comparisons = 2 judge calls)
        assert judge_call_count[0] == 2
