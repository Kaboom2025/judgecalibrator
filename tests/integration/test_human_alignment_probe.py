"""Integration tests for human alignment probe."""
import pytest
from unittest.mock import MagicMock, patch
from judgecalib.schemas import Task, ProbeResult
from judgecalib.core.prober import Prober
from judgecalib.core.judge_wrapper import JudgeWrapper


class TestHumanAlignmentProbe:
    """Tests for human alignment probe."""

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_human_alignment_returns_probe_result(self, mock_judge_completion):
        """run_human_alignment should return a ProbeResult."""
        tasks = [
            Task(
                id="task_0",
                question="Answer this",
                reference_answer="Short answer",
                human_score=7.0,
            ),
            Task(
                id="task_1",
                question="Answer that",
                reference_answer="Another answer",
                human_score=5.0,
            ),
        ]

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
        result = prober.run_human_alignment()

        assert isinstance(result, ProbeResult)
        assert result.probe_name == "human_alignment"
        assert result.metric_name == "spearman"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_human_alignment_perfect_correlation(self, mock_judge_completion):
        """Should have spearman=1.0 when judge and human scores are perfectly correlated."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                human_score=2.0,
            ),
            Task(
                id="task_1",
                question="Question",
                reference_answer="Answer",
                human_score=5.0,
            ),
            Task(
                id="task_2",
                question="Question",
                reference_answer="Answer",
                human_score=8.0,
            ),
        ]

        scores = [2, 5, 8]
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
        result = prober.run_human_alignment()

        # Perfect correlation should give spearman ~ 1.0
        assert result.metric_value > 0.95

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_human_alignment_zero_correlation(self, mock_judge_completion):
        """Should have low spearman when judge and human scores are unrelated."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                human_score=2.0,
            ),
            Task(
                id="task_1",
                question="Question",
                reference_answer="Answer",
                human_score=5.0,
            ),
            Task(
                id="task_2",
                question="Question",
                reference_answer="Answer",
                human_score=8.0,
            ),
        ]

        # Judge gives scores in reverse order
        scores = [8, 5, 2]
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
        result = prober.run_human_alignment()

        # Reverse correlation should give spearman ~ -1.0
        assert result.metric_value < -0.95

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_human_alignment_skips_tasks_without_human_score(
        self, mock_judge_completion
    ):
        """Should skip tasks without human_score."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                human_score=7.0,
            ),
            Task(
                id="task_1",
                question="Question",
                reference_answer="Answer",
                human_score=None,
            ),
            Task(
                id="task_2",
                question="Question",
                reference_answer="Answer",
                human_score=5.0,
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
        result = prober.run_human_alignment()

        # Should only process 2 tasks (skip task_1 without human_score)
        assert judge_call_count[0] == 2

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_human_alignment_skips_tasks_without_reference_answer(
        self, mock_judge_completion
    ):
        """Should skip tasks without reference_answer."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                human_score=7.0,
            ),
            Task(
                id="task_1",
                question="Question",
                reference_answer=None,
                human_score=5.0,
            ),
            Task(
                id="task_2",
                question="Question",
                reference_answer="Answer",
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
                            content='{"score": 6, "confidence": 75, "reasoning": "test"}'
                        )
                    )
                ]
            )

        mock_judge_completion.side_effect = judge_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_human_alignment()

        # Should only process 2 tasks (skip task_1 without reference_answer)
        assert judge_call_count[0] == 2

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_human_alignment_empty_tasks(self, mock_judge_completion):
        """Should handle empty task list."""
        tasks = []

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_human_alignment()

        assert isinstance(result, ProbeResult)
        assert result.probe_name == "human_alignment"
