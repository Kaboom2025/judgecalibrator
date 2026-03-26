"""Integration tests for Prober.run_all orchestration."""
import pytest
from unittest.mock import MagicMock, patch
from judgecalib.schemas import Task, AuditReport
from judgecalib.core.prober import Prober
from judgecalib.core.judge_wrapper import JudgeWrapper
from judgecalib.core.rephraser import Rephraser


class TestProberRunAll:
    """Tests for Prober.run_all orchestration method."""

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_run_all_returns_audit_report(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """run_all should return an AuditReport."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                options=["Option A", "Option B"],
                human_score=7.0,
            ),
        ]

        def completion_side_effect(*args, **kwargs):
            model = kwargs.get("model", "")
            if "haiku" in model:
                return MagicMock(
                    choices=[
                        MagicMock(
                            message=MagicMock(content='["Variation 1", "Variation 2"]')
                        )
                    ]
                )
            else:
                return MagicMock(
                    choices=[
                        MagicMock(
                            message=MagicMock(
                                content='{"score": 6, "confidence": 75, "reasoning": "good"}'
                            )
                        )
                    ]
                )

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_all(rephraser=rephraser)

        assert isinstance(result, AuditReport)

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_run_all_includes_all_probes(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """AuditReport should include all four probes."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                options=["Option A", "Option B"],
                human_score=7.0,
            ),
        ]

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
                return MagicMock(
                    choices=[
                        MagicMock(
                            message=MagicMock(
                                content='{"score": 6, "confidence": 75, "reasoning": "test"}'
                            )
                        )
                    ]
                )

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_all(rephraser=rephraser, n_rephrasings=2)

        # Check for all four probe results
        probe_names = {probe.probe_name for probe in result.probes}
        assert "calibration" in probe_names
        assert "consistency" in probe_names
        assert "positional_bias" in probe_names
        assert "verbosity_bias" in probe_names
        assert "human_alignment" in probe_names

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_run_all_computes_trust_grade(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """AuditReport should include trust_grade."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                options=["Option A", "Option B"],
                human_score=7.0,
            ),
        ]

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
                return MagicMock(
                    choices=[
                        MagicMock(
                            message=MagicMock(
                                content='{"score": 6, "confidence": 75, "reasoning": "test"}'
                            )
                        )
                    ]
                )

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_all(rephraser=rephraser, n_rephrasings=2)

        assert result.trust_grade is not None
        assert result.trust_grade in ["A", "B+", "B", "C"]

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_run_all_with_custom_n_rephrasings(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """run_all should accept custom n_rephrasings parameter."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                options=["Option A", "Option B"],
                human_score=7.0,
            ),
        ]

        def completion_side_effect(*args, **kwargs):
            model = kwargs.get("model", "")
            if "haiku" in model:
                return MagicMock(
                    choices=[
                        MagicMock(
                            message=MagicMock(content='["V1", "V2", "V3"]')
                        )
                    ]
                )
            else:
                return MagicMock(
                    choices=[
                        MagicMock(
                            message=MagicMock(
                                content='{"score": 6, "confidence": 75, "reasoning": "test"}'
                            )
                        )
                    ]
                )

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_all(rephraser=rephraser, n_rephrasings=3)

        assert isinstance(result, AuditReport)

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_run_all_empty_tasks(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """run_all should handle empty task list."""
        tasks = []

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_all(rephraser=rephraser)

        assert isinstance(result, AuditReport)
        assert len(result.probes) > 0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    @patch("judgecalib.core.rephraser.litellm.completion")
    def test_run_all_with_progress_callback(
        self, mock_rephraser_completion, mock_judge_completion
    ):
        """run_all should pass progress_callback to individual probes."""
        tasks = [
            Task(
                id="task_0",
                question="Question",
                reference_answer="Answer",
                options=["Option A", "Option B"],
                human_score=7.0,
            ),
        ]

        progress_calls = []

        def progress_callback(current, total):
            progress_calls.append((current, total))

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
                return MagicMock(
                    choices=[
                        MagicMock(
                            message=MagicMock(
                                content='{"score": 6, "confidence": 75, "reasoning": "test"}'
                            )
                        )
                    ]
                )

        mock_rephraser_completion.side_effect = completion_side_effect
        mock_judge_completion.side_effect = completion_side_effect

        judge = JudgeWrapper("gpt-4o")
        rephraser = Rephraser()
        prober = Prober(judge=judge, tasks=tasks, progress_callback=progress_callback)
        result = prober.run_all(rephraser=rephraser, n_rephrasings=2)

        # Progress callback should be called multiple times across all probes
        assert len(progress_calls) > 0
        assert isinstance(result, AuditReport)
