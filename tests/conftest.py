"""Pytest configuration and fixtures."""
import pytest


@pytest.fixture
def sample_tasks():
    """Sample tasks for testing."""
    from judgecalib.schemas import Task

    return [
        Task(
            id="task_1",
            question="What is 2+2?",
            reference_answer="4",
            human_score=9.0,
            category="math",
        ),
        Task(
            id="task_2",
            question="What is the capital of France?",
            reference_answer="Paris",
            human_score=8.5,
            category="geography",
        ),
    ]


@pytest.fixture
def sample_judge_responses():
    """Sample judge responses for testing."""
    from judgecalib.schemas import JudgeResponse

    return [
        JudgeResponse(task_id="task_1", score=9, confidence=85, reasoning="Correct"),
        JudgeResponse(task_id="task_2", score=8, confidence=80, reasoning="Correct"),
    ]
