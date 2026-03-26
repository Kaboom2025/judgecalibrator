"""Integration tests for consistency probe."""
import pytest
from unittest.mock import MagicMock, patch
import numpy as np
from judgecalib.schemas import Task, JudgeResponse, ProbeResult
from judgecalib.core.prober import Prober
from judgecalib.core.judge_wrapper import JudgeWrapper
from judgecalib.core.rephraser import Rephraser


@pytest.fixture(autouse=True)
def clear_rephraser_cache():
    """Clear the rephraser cache before each test."""
    # The rephraser caches results, clear it for test isolation
    yield
    # No cleanup needed as each test creates a new Rephraser instance


def create_completion_side_effect(rephraser_content, judge_responses):
    """Create a side_effect function for mocking litellm.completion."""

    def side_effect(*args, **kwargs):
        model = kwargs.get("model", "")
        if "haiku" in model:
            # Rephraser call
            return MagicMock(
                choices=[
                    MagicMock(message=MagicMock(content=rephraser_content))
                ]
            )
        else:
            # Judge call - return next response
            if not hasattr(side_effect, "judge_call_count"):
                side_effect.judge_call_count = 0
            response = judge_responses[
                side_effect.judge_call_count % len(judge_responses)
            ]
            side_effect.judge_call_count += 1
            return response

    return side_effect


class TestConsistencyProbe:
    """Tests for consistency probe integration."""

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_consistency_probe_returns_probe_result(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """Prober.run_consistency should return a ProbeResult."""
        tasks = [
            Task(
                id=f"task_{i}",
                question=f"Question {i}",
                reference_answer=f"Answer {i}",
                human_score=7.0,
            )
            for i in range(3)
        ]

        rephraser_content = '["Variation 1", "Variation 2", "Variation 3", "Variation 4", "Variation 5"]'
        judge_response = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='{"score": 7, "confidence": 75, "reasoning": "good"}'
                    )
                )
            ]
        )

        def completion_side_effect(*args, **kwargs):
            model = kwargs.get("model", "")
            if "haiku" in model:
                return MagicMock(
                    choices=[
                        MagicMock(message=MagicMock(content=rephraser_content))
                    ]
                )
            else:
                return judge_response

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_consistency(rephraser, n_rephrasings=5)

        assert isinstance(result, ProbeResult)
        assert result.probe_name == "consistency"
        assert result.metric_name == "mean_sd"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_consistency_zero_sd_for_identical_responses(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """All rephrasings returning same score should give SD=0."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                human_score=7.0,
            )
        ]

        rephraser_content = '["V1", "V2", "V3", "V4", "V5"]'
        judge_response = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='{"score": 7, "confidence": 80, "reasoning": "good"}'
                    )
                )
            ]
        )

        def completion_side_effect(*args, **kwargs):
            model = kwargs.get("model", "")
            if "haiku" in model:
                return MagicMock(
                    choices=[
                        MagicMock(message=MagicMock(content=rephraser_content))
                    ]
                )
            else:
                return judge_response

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_consistency(rephraser, n_rephrasings=5)

        # With all scores the same, SD should be 0
        assert result.metric_value == 0.0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_consistency_high_sd_for_variable_responses(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """Variable scores should produce high SD."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                human_score=5.0,
            )
        ]

        rephraser_content = '["V1", "V2", "V3", "V4", "V5"]'

        # Return alternating high/low scores: [1, 10, 1, 10, 1]
        scores = [1, 10, 1, 10, 1]
        call_count = [0]

        def judge_response_fn(score):
            return MagicMock(
                choices=[
                    MagicMock(
                        message=MagicMock(
                            content=f'{{"score": {score}, "confidence": 50, "reasoning": "varies"}}'
                        )
                    )
                ]
            )

        def completion_side_effect(*args, **kwargs):
            model = kwargs.get("model", "")
            if "haiku" in model:
                return MagicMock(
                    choices=[
                        MagicMock(message=MagicMock(content=rephraser_content))
                    ]
                )
            else:
                score = scores[call_count[0] % len(scores)]
                call_count[0] += 1
                return judge_response_fn(score)

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_consistency(rephraser, n_rephrasings=5)

        # High variability should produce high SD (> 2.0 for [1,10,1,10,1])
        assert result.metric_value > 2.0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_consistency_details_include_per_task_sds(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """Details should include per_task_sds and max_sd."""
        tasks = [
            Task(
                id=f"task_{i}",
                question=f"Question {i}",
                reference_answer=f"Answer {i}",
                human_score=7.0,
            )
            for i in range(2)
        ]

        rephraser_content = '["V1", "V2", "V3"]'
        judge_response = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='{"score": 7, "confidence": 75, "reasoning": "good"}'
                    )
                )
            ]
        )

        def completion_side_effect(*args, **kwargs):
            model = kwargs.get("model", "")
            if "haiku" in model:
                return MagicMock(
                    choices=[
                        MagicMock(message=MagicMock(content=rephraser_content))
                    ]
                )
            else:
                return judge_response

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_consistency(rephraser, n_rephrasings=3)

        assert "per_task_sds" in result.details
        assert isinstance(result.details["per_task_sds"], list)
        assert len(result.details["per_task_sds"]) == 2
        assert "max_sd" in result.details
        assert isinstance(result.details["max_sd"], float)

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_consistency_skips_tasks_without_reference_answer(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """Tasks without reference_answer should be skipped."""
        tasks = [
            Task(
                id="task_0",
                question="Question 0",
                reference_answer="Answer 0",
                human_score=7.0,
            ),
            Task(
                id="task_1",
                question="Question 1",
                reference_answer=None,
                human_score=7.0,
            ),
            Task(
                id="task_2",
                question="Question 2",
                reference_answer="Answer 2",
                human_score=7.0,
            ),
        ]

        judge_call_count = [0]

        def completion_side_effect(*args, **kwargs):
            model = kwargs.get("model", "")
            if "haiku" in model:
                return MagicMock(
                    choices=[
                        MagicMock(
                            message=MagicMock(content='["V1", "V2"]')
                        )
                    ]
                )
            else:
                judge_call_count[0] += 1
                return MagicMock(
                    choices=[
                        MagicMock(
                            message=MagicMock(
                                content='{"score": 7, "confidence": 75, "reasoning": "good"}'
                            )
                        )
                    ]
                )

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_consistency(rephraser, n_rephrasings=2)

        # Should only process 2 tasks (skip task_1)
        # Each task has 2 rephrasings, so 2*2 = 4 judge calls
        assert judge_call_count[0] == 4

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_consistency_empty_tasks(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """Should handle empty task list."""
        tasks = []

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_consistency(rephraser, n_rephrasings=5)

        assert isinstance(result, ProbeResult)
        assert result.probe_name == "consistency"
