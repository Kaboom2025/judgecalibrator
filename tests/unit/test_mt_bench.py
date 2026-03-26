"""Tests for MT-Bench dataset loader."""
import pytest
from unittest.mock import patch, MagicMock
from judgecalib.benchmarks.mt_bench import load_mt_bench
from judgecalib.schemas import Task


class TestLoadMTBench:
    """Tests for load_mt_bench function."""

    @patch("judgecalib.benchmarks.mt_bench.load_dataset")
    def test_load_mt_bench_returns_tasks(self, mock_load_dataset):
        """load_mt_bench should return a list of tasks."""
        # Mock dataset
        mock_dataset = [
            {
                "question_id": 1,
                "question": "What is 2+2?",
                "score": 9.0,
                "category": "math",
            },
            {
                "question_id": 2,
                "question": "What is the capital of France?",
                "score": 8.5,
                "category": "geography",
            },
            {
                "question_id": 3,
                "question": "How many continents are there?",
                "score": 9.5,
                "category": "geography",
            },
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_mt_bench()

        assert len(tasks) == 3
        assert isinstance(tasks, list)
        assert all(isinstance(t, Task) for t in tasks)

    @patch("judgecalib.benchmarks.mt_bench.load_dataset")
    def test_load_mt_bench_task_has_required_fields(self, mock_load_dataset):
        """Each task should have id, question, and human_score."""
        mock_dataset = [
            {
                "question_id": 1,
                "question": "What is 2+2?",
                "score": 9.0,
                "category": "math",
            }
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_mt_bench()

        task = tasks[0]
        assert task.id is not None
        assert task.question == "What is 2+2?"
        assert task.human_score == 9.0

    @patch("judgecalib.benchmarks.mt_bench.load_dataset")
    def test_load_mt_bench_preserves_category(self, mock_load_dataset):
        """Task category should be preserved from dataset."""
        mock_dataset = [
            {
                "question_id": 1,
                "question": "What is 2+2?",
                "score": 9.0,
                "category": "math",
            }
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_mt_bench()

        assert tasks[0].category == "math"

    @patch("judgecalib.benchmarks.mt_bench.load_dataset")
    def test_load_mt_bench_empty_dataset(self, mock_load_dataset):
        """load_mt_bench should handle empty dataset."""
        mock_load_dataset.return_value = []

        tasks = load_mt_bench()

        assert tasks == []

    @patch("judgecalib.benchmarks.mt_bench.load_dataset")
    def test_load_mt_bench_cache_dir_parameter(self, mock_load_dataset):
        """load_mt_bench should accept cache_dir parameter."""
        mock_dataset = [
            {
                "question_id": 1,
                "question": "What is 2+2?",
                "score": 9.0,
                "category": "math",
            }
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_mt_bench(cache_dir="/custom/cache")

        assert len(tasks) == 1

    @patch("judgecalib.benchmarks.mt_bench.load_dataset")
    def test_load_mt_bench_converts_question_id_to_str(self, mock_load_dataset):
        """Question ID should be converted to string."""
        mock_dataset = [
            {
                "question_id": 1,
                "question": "What is 2+2?",
                "score": 9.0,
            }
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_mt_bench()

        assert isinstance(tasks[0].id, str)
        assert tasks[0].id == "1"
