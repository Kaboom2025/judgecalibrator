"""Tests for RewardBench dataset loader."""
import pytest
from unittest.mock import patch, MagicMock
from judgecalib.benchmarks.reward_bench import load_reward_bench
from judgecalib.schemas import Task


class TestLoadRewardBench:
    """Tests for load_reward_bench function."""

    @patch("judgecalib.benchmarks.reward_bench.load_dataset")
    def test_load_reward_bench_returns_tasks(self, mock_load_dataset):
        """load_reward_bench should return a list of tasks."""
        mock_dataset = [
            {
                "prompt": "What is 2+2?",
                "chosen": "The answer is 4.",
                "rejected": "The answer is 5.",
            },
            {
                "prompt": "What is the capital of France?",
                "chosen": "The capital of France is Paris.",
                "rejected": "The capital of France is London.",
            },
            {
                "prompt": "How many continents are there?",
                "chosen": "There are 7 continents.",
                "rejected": "There are 5 continents.",
            },
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_reward_bench(n_samples=3)

        assert len(tasks) == 3
        assert isinstance(tasks, list)
        assert all(isinstance(t, Task) for t in tasks)

    @patch("judgecalib.benchmarks.reward_bench.load_dataset")
    def test_load_reward_bench_has_pairwise_options(self, mock_load_dataset):
        """Tasks should have chosen and rejected as options."""
        mock_dataset = [
            {
                "prompt": "What is 2+2?",
                "chosen": "The answer is 4.",
                "rejected": "The answer is 5.",
            }
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_reward_bench(n_samples=1)

        task = tasks[0]
        assert task.options is not None
        assert len(task.options) == 2
        assert "The answer is 4." in task.options
        assert "The answer is 5." in task.options

    @patch("judgecalib.benchmarks.reward_bench.load_dataset")
    def test_load_reward_bench_prompt_becomes_question(self, mock_load_dataset):
        """Prompt should become question field."""
        mock_dataset = [
            {
                "prompt": "What is 2+2?",
                "chosen": "The answer is 4.",
                "rejected": "The answer is 5.",
            }
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_reward_bench(n_samples=1)

        assert tasks[0].question == "What is 2+2?"

    @patch("judgecalib.benchmarks.reward_bench.load_dataset")
    def test_load_reward_bench_samples_from_dataset(self, mock_load_dataset):
        """load_reward_bench should sample n_samples items."""
        mock_dataset = [
            {
                "prompt": f"Question {i}",
                "chosen": f"Good answer {i}",
                "rejected": f"Bad answer {i}",
            }
            for i in range(10)
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_reward_bench(n_samples=5)

        assert len(tasks) == 5

    @patch("judgecalib.benchmarks.reward_bench.load_dataset")
    def test_load_reward_bench_respects_n_samples_limit(self, mock_load_dataset):
        """load_reward_bench should not exceed n_samples."""
        mock_dataset = [
            {
                "prompt": f"Question {i}",
                "chosen": f"Good answer {i}",
                "rejected": f"Bad answer {i}",
            }
            for i in range(10)
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_reward_bench(n_samples=3)

        assert len(tasks) == 3

    @patch("judgecalib.benchmarks.reward_bench.load_dataset")
    def test_load_reward_bench_empty_dataset(self, mock_load_dataset):
        """load_reward_bench should handle empty dataset."""
        mock_load_dataset.return_value = []

        tasks = load_reward_bench(n_samples=5)

        assert tasks == []

    @patch("judgecalib.benchmarks.reward_bench.load_dataset")
    def test_load_reward_bench_default_n_samples(self, mock_load_dataset):
        """load_reward_bench should have a default n_samples value."""
        mock_dataset = [
            {
                "prompt": f"Question {i}",
                "chosen": f"Good answer {i}",
                "rejected": f"Bad answer {i}",
            }
            for i in range(600)
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_reward_bench()

        # Default should be 500
        assert len(tasks) == 500

    @patch("judgecalib.benchmarks.reward_bench.load_dataset")
    def test_load_reward_bench_sets_human_score(self, mock_load_dataset):
        """Tasks should have human_score set to 1.0 (for pairwise data)."""
        mock_dataset = [
            {
                "prompt": "What is 2+2?",
                "chosen": "The answer is 4.",
                "rejected": "The answer is 5.",
            }
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_reward_bench(n_samples=1)

        assert tasks[0].human_score == 1.0

    @patch("judgecalib.benchmarks.reward_bench.load_dataset")
    def test_load_reward_bench_cache_dir_parameter(self, mock_load_dataset):
        """load_reward_bench should accept cache_dir parameter."""
        mock_dataset = [
            {
                "prompt": "What is 2+2?",
                "chosen": "The answer is 4.",
                "rejected": "The answer is 5.",
            }
        ]
        mock_load_dataset.return_value = mock_dataset

        tasks = load_reward_bench(cache_dir="/custom/cache", n_samples=1)

        assert len(tasks) == 1
