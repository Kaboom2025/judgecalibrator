"""Unit tests for AlpacaEval dataset loader."""
import pytest
from unittest.mock import patch, MagicMock
from judgecalib.schemas import Task
from judgecalib.benchmarks.alpaca_eval import load_alpaca_eval


class TestAlpacaEvalLoader:
    """Tests for load_alpaca_eval function."""

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_returns_task_list(self, mock_load_dataset):
        """load_alpaca_eval should return a list of Task objects."""
        mock_dataset = [
            {
                "instruction": "What is 2+2?",
                "output_1": "4",
                "output_2": "The answer is 4",
                "preference": 2,
            },
            {
                "instruction": "What is capital of France?",
                "output_1": "Paris",
                "output_2": "France's capital is Paris",
                "preference": 1,
            },
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_alpaca_eval()

        assert isinstance(tasks, list)
        assert len(tasks) == 2
        assert all(isinstance(task, Task) for task in tasks)

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_task_structure(self, mock_load_dataset):
        """Tasks should have correct fields from AlpacaEval data."""
        mock_dataset = [
            {
                "instruction": "What is 2+2?",
                "output_1": "4",
                "output_2": "The answer is 4",
                "preference": 2,
            },
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_alpaca_eval()
        task = tasks[0]

        assert task.question == "What is 2+2?"
        assert task.options == ["4", "The answer is 4"]
        assert task.human_score == 1.0

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_with_n_samples(self, mock_load_dataset):
        """Should limit to n_samples when specified."""
        mock_dataset = [
            {
                "instruction": f"Question {i}",
                "output_1": f"Answer A {i}",
                "output_2": f"Answer B {i}",
                "preference": 1,
            }
            for i in range(100)
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_alpaca_eval(n_samples=10)

        assert len(tasks) == 10
        assert all(isinstance(task, Task) for task in tasks)

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_smaller_than_n_samples(self, mock_load_dataset):
        """Should return all tasks if fewer than n_samples."""
        mock_dataset = [
            {
                "instruction": f"Question {i}",
                "output_1": f"Answer A {i}",
                "output_2": f"Answer B {i}",
                "preference": 1,
            }
            for i in range(5)
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_alpaca_eval(n_samples=10)

        assert len(tasks) == 5

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_task_ids(self, mock_load_dataset):
        """Tasks should have sequential IDs."""
        mock_dataset = [
            {
                "instruction": f"Question {i}",
                "output_1": f"Answer A {i}",
                "output_2": f"Answer B {i}",
                "preference": 1,
            }
            for i in range(3)
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_alpaca_eval()

        assert tasks[0].id == "0"
        assert tasks[1].id == "1"
        assert tasks[2].id == "2"

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_handles_missing_fields(self, mock_load_dataset):
        """Should handle missing optional fields gracefully."""
        mock_dataset = [
            {
                "instruction": "What is 2+2?",
                "output_1": "4",
                "output_2": "The answer is 4",
                # Missing preference
            },
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_alpaca_eval()

        assert len(tasks) == 1
        assert tasks[0].question == "What is 2+2?"

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_load_dataset_called_correctly(self, mock_load_dataset):
        """Should call load_dataset with correct parameters."""
        mock_dataset = []
        mock_load_dataset.return_value = mock_dataset

        load_alpaca_eval()

        mock_load_dataset.assert_called_once_with("tatsu-lab/alpaca_eval", split="eval")

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_empty_dataset(self, mock_load_dataset):
        """Should return empty list for empty dataset."""
        mock_load_dataset.return_value = []

        tasks = load_alpaca_eval()

        assert tasks == []

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_dataset_load_failure(self, mock_load_dataset):
        """Should return empty list if dataset fails to load."""
        mock_load_dataset.side_effect = Exception("Dataset not found")

        tasks = load_alpaca_eval()

        assert tasks == []

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_all_tasks_have_options(self, mock_load_dataset):
        """All tasks should have exactly 2 options."""
        mock_dataset = [
            {
                "instruction": "Which is better?",
                "output_1": "Option A",
                "output_2": "Option B",
                "preference": 1,
            },
            {
                "instruction": "Compare these",
                "output_1": "Choice 1",
                "output_2": "Choice 2",
                "preference": 2,
            },
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_alpaca_eval()

        for task in tasks:
            assert task.options is not None
            assert len(task.options) == 2

    @patch("judgecalib.benchmarks.alpaca_eval.load_dataset")
    def test_load_alpaca_eval_deterministic_sampling(self, mock_load_dataset):
        """When n_samples < dataset size, should sample deterministically with seed."""
        mock_dataset = [
            {
                "instruction": f"Question {i}",
                "output_1": f"Answer A {i}",
                "output_2": f"Answer B {i}",
                "preference": 1,
            }
            for i in range(100)
        ]
        mock_load_dataset.return_value = mock_dataset

        # Run twice with same seed
        tasks1 = load_alpaca_eval(n_samples=10, seed=42)
        tasks2 = load_alpaca_eval(n_samples=10, seed=42)

        # Should get same tasks in same order
        assert len(tasks1) == len(tasks2)
        assert [t.id for t in tasks1] == [t.id for t in tasks2]
