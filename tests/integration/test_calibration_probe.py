"""Integration tests for calibration probe."""
import pytest
from unittest.mock import MagicMock, patch
from judgecalib.schemas import Task, JudgeResponse, ProbeResult
from judgecalib.core.prober import Prober
from judgecalib.core.judge_wrapper import JudgeWrapper


class TestCalibrationProbe:
    """Tests for calibration probe integration."""

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_calibration_probe_returns_probe_result(self, mock_completion):
        """Prober.run_calibration should return a ProbeResult."""
        # Create 10 tasks with human scores
        tasks = [
            Task(
                id=f"task_{i}",
                question=f"Question {i}",
                reference_answer=f"Answer {i}",
                human_score=7.0,
            )
            for i in range(10)
        ]

        # Mock judge to return consistent responses
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='{"score": 7, "confidence": 75, "reasoning": "good"}'
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_calibration()

        assert isinstance(result, ProbeResult)
        assert result.probe_name == "calibration"
        assert result.metric_name == "ece"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_calibration_probe_metric_value_valid_range(self, mock_completion):
        """ECE metric value should be between 0.0 and 1.0."""
        tasks = [
            Task(
                id=f"task_{i}",
                question=f"Question {i}",
                reference_answer=f"Answer {i}",
                human_score=7.0,
            )
            for i in range(10)
        ]

        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='{"score": 7, "confidence": 75, "reasoning": "good"}'
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_calibration()

        assert 0.0 <= result.metric_value <= 1.0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_calibration_probe_bins_in_details(self, mock_completion):
        """Probe result should include bins in details."""
        tasks = [
            Task(
                id=f"task_{i}",
                question=f"Question {i}",
                reference_answer=f"Answer {i}",
                human_score=7.0,
            )
            for i in range(10)
        ]

        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='{"score": 7, "confidence": 75, "reasoning": "good"}'
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_calibration()

        assert "bins" in result.details
        assert isinstance(result.details["bins"], list)
        assert len(result.details["bins"]) > 0

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_calibration_probe_with_perfect_accuracy(self, mock_completion):
        """Perfect calibration should have low ECE."""
        tasks = [
            Task(
                id=f"task_{i}",
                question=f"Question {i}",
                reference_answer=f"Answer {i}",
                human_score=7.0,
            )
            for i in range(10)
        ]

        # Judge always gives high scores with high confidence, matching human scores
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='{"score": 7, "confidence": 90, "reasoning": "good"}'
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_calibration()

        # With perfect accuracy, ECE should be very low
        assert result.metric_value < 0.1

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_calibration_probe_progress_callback(self, mock_completion):
        """Prober should call progress_callback if provided."""
        tasks = [
            Task(
                id=f"task_{i}",
                question=f"Question {i}",
                reference_answer=f"Answer {i}",
                human_score=7.0,
            )
            for i in range(5)
        ]

        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='{"score": 7, "confidence": 75, "reasoning": "good"}'
                    )
                )
            ]
        )

        # Create a mock callback
        callback = MagicMock()

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks, progress_callback=callback)
        result = prober.run_calibration()

        # Callback should have been called for each task
        assert callback.call_count == 5

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_calibration_probe_skips_tasks_without_human_score(self, mock_completion):
        """Probe should skip tasks without human_score."""
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
                reference_answer="Answer 1",
                human_score=None,  # No human score
            ),
            Task(
                id="task_2",
                question="Question 2",
                reference_answer="Answer 2",
                human_score=8.0,
            ),
        ]

        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content='{"score": 7, "confidence": 75, "reasoning": "good"}'
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_calibration()

        # Should have been called only 2 times (for tasks with human_score)
        assert mock_completion.call_count == 2

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_calibration_probe_with_mixed_judge_scores(self, mock_completion):
        """Probe should handle varied judge scores."""
        tasks = [
            Task(
                id=f"task_{i}",
                question=f"Question {i}",
                reference_answer=f"Answer {i}",
                human_score=float(i % 2 * 8),  # Alternating 0 and 8
            )
            for i in range(10)
        ]

        # Judge gives mixed scores
        def mock_side_effect(*args, **kwargs):
            # Return different responses based on task
            call_count = mock_completion.call_count
            if call_count % 2 == 0:
                content = '{"score": 8, "confidence": 90, "reasoning": "good"}'
            else:
                content = '{"score": 2, "confidence": 10, "reasoning": "poor"}'
            return MagicMock(
                choices=[MagicMock(message=MagicMock(content=content))]
            )

        mock_completion.side_effect = mock_side_effect

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_calibration()

        # Should complete successfully
        assert isinstance(result, ProbeResult)
        assert result.metric_name == "ece"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_calibration_probe_empty_tasks(self, mock_completion):
        """Probe should handle empty task list."""
        tasks = []

        judge = JudgeWrapper("gpt-4o")
        prober = Prober(judge=judge, tasks=tasks)
        result = prober.run_calibration()

        # Should return a result even with no tasks
        assert isinstance(result, ProbeResult)
