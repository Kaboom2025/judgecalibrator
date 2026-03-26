"""Tests for judge wrapper module."""
import pytest
import json
from unittest.mock import patch, MagicMock
from judgecalib.schemas import Task, JudgeResponse
from judgecalib.core.judge_wrapper import JudgeWrapper


class TestJudgeWrapperEvaluate:
    """Tests for JudgeWrapper.evaluate method."""

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_parses_json_response(self, mock_completion):
        """Judge should parse JSON response correctly."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps(
                            {"score": 7, "confidence": 80, "reasoning": "good"}
                        )
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(id="task_1", question="Test?", reference_answer="Test answer")
        response = judge.evaluate(task)

        assert response.task_id == "task_1"
        assert response.score == 7
        assert response.confidence == 80
        assert response.reasoning == "good"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_falls_back_to_regex(self, mock_completion):
        """Judge should parse plain text with score and confidence."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(message=MagicMock(content="Score: 8/10, Confidence: 75%"))
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(id="task_1", question="Test?", reference_answer="Test answer")
        response = judge.evaluate(task)

        assert response.task_id == "task_1"
        assert response.score == 8
        assert response.confidence == 75

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_clamps_out_of_range_score(self, mock_completion):
        """Judge should clamp score to [1, 10] range."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps(
                            {"score": 15, "confidence": 50, "reasoning": "too high"}
                        )
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(id="task_1", question="Test?")
        response = judge.evaluate(task)

        assert response.score == 10

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_clamps_low_score(self, mock_completion):
        """Judge should clamp negative score to 1."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps(
                            {"score": -5, "confidence": 50, "reasoning": "too low"}
                        )
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(id="task_1", question="Test?")
        response = judge.evaluate(task)

        assert response.score == 1

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_clamps_out_of_range_confidence(self, mock_completion):
        """Judge should clamp confidence to [0, 100] range."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps(
                            {
                                "score": 5,
                                "confidence": 150,
                                "reasoning": "too confident",
                            }
                        )
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(id="task_1", question="Test?")
        response = judge.evaluate(task)

        assert response.confidence == 100

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_sets_task_id(self, mock_completion):
        """Judge response should include the task ID."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps(
                            {"score": 5, "confidence": 50, "reasoning": "ok"}
                        )
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(id="my_task_123", question="Test?")
        response = judge.evaluate(task)

        assert response.task_id == "my_task_123"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_stores_raw_response(self, mock_completion):
        """Judge should store the raw response text."""
        raw_text = json.dumps(
            {"score": 5, "confidence": 50, "reasoning": "ok"}
        )
        mock_completion.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content=raw_text))]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(id="task_1", question="Test?")
        response = judge.evaluate(task)

        assert response.raw_response == raw_text

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_uses_api_key(self, mock_completion):
        """Judge should pass API key to litellm."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps(
                            {"score": 5, "confidence": 50, "reasoning": "ok"}
                        )
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o", api_key="test-key-123")
        task = Task(id="task_1", question="Test?")
        judge.evaluate(task)

        # Check that completion was called with api_key
        call_kwargs = mock_completion.call_args[1]
        assert call_kwargs["api_key"] == "test-key-123"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_passes_model_name(self, mock_completion):
        """Judge should pass model name to litellm."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps(
                            {"score": 5, "confidence": 50, "reasoning": "ok"}
                        )
                    )
                )
            ]
        )

        judge = JudgeWrapper("claude-3-sonnet")
        task = Task(id="task_1", question="Test?")
        judge.evaluate(task)

        call_kwargs = mock_completion.call_args[1]
        assert call_kwargs["model"] == "claude-3-sonnet"

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_with_missing_reasoning(self, mock_completion):
        """Judge should handle missing reasoning field."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps({"score": 5, "confidence": 50})
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(id="task_1", question="Test?")
        response = judge.evaluate(task)

        assert response.reasoning is None
        assert response.score == 5

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_formats_user_message(self, mock_completion):
        """Judge should format user message with question and answer."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps(
                            {"score": 5, "confidence": 50, "reasoning": "ok"}
                        )
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(
            id="task_1",
            question="What is 2+2?",
            reference_answer="4",
        )
        judge.evaluate(task)

        # Check the user message
        call_kwargs = mock_completion.call_args[1]
        messages = call_kwargs["messages"]
        user_msg = next(m for m in messages if m["role"] == "user")
        assert "What is 2+2?" in user_msg["content"]
        assert "4" in user_msg["content"]

    @patch("judgecalib.core.judge_wrapper.litellm.completion")
    def test_evaluate_with_float_score_in_json(self, mock_completion):
        """Judge should handle float scores in JSON."""
        mock_completion.return_value = MagicMock(
            choices=[
                MagicMock(
                    message=MagicMock(
                        content=json.dumps(
                            {"score": 7.5, "confidence": 82.5, "reasoning": "ok"}
                        )
                    )
                )
            ]
        )

        judge = JudgeWrapper("gpt-4o")
        task = Task(id="task_1", question="Test?")
        response = judge.evaluate(task)

        assert isinstance(response.score, float)
        assert response.score == 7.5
