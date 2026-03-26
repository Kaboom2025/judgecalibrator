"""RewardBench dataset loader."""
from typing import List
import random
from datasets import load_dataset
from judgecalib.schemas import Task


def load_reward_bench(cache_dir: str = "data/benchmarks", n_samples: int = 500) -> List[Task]:
    """
    Load RewardBench dataset.

    Downloads a subset of the RewardBench filtered split with pairwise comparisons.

    Args:
        cache_dir: Directory for caching the dataset
        n_samples: Number of samples to return (default 500)

    Returns:
        List of Task objects with pairwise options
    """
    try:
        # Try to load from HuggingFace
        dataset = load_dataset("allenai/reward-bench", split="filtered")
    except Exception:
        # If dataset is not available, return empty list
        return []

    # Convert to list and sample
    items = list(dataset)
    if len(items) > n_samples:
        items = random.sample(items, n_samples)

    tasks = []
    for i, item in enumerate(items):
        task = Task(
            id=f"{i}",
            question=item.get("prompt", ""),
            options=[item.get("chosen", ""), item.get("rejected", "")],
            human_score=1.0,  # Pairwise preference data
        )
        tasks.append(task)

    return tasks
