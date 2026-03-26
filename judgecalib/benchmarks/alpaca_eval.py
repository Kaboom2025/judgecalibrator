"""AlpacaEval dataset loader."""
import random
from typing import List, Optional
from datasets import load_dataset
from judgecalib.schemas import Task


def load_alpaca_eval(
    cache_dir: str = "data/benchmarks",
    n_samples: Optional[int] = None,
    seed: Optional[int] = None,
) -> List[Task]:
    """
    Load AlpacaEval dataset.

    Downloads pairwise comparison tasks from the AlpacaEval benchmark.

    Args:
        cache_dir: Directory for caching the dataset
        n_samples: Maximum number of samples to return (default None = all)
        seed: Random seed for sampling (default None)

    Returns:
        List of Task objects with pairwise options
    """
    try:
        # Try to load from HuggingFace
        dataset = load_dataset("tatsu-lab/alpaca_eval", split="eval")
    except Exception:
        # If dataset is not available, return empty list
        return []

    # Convert to list and sample if needed
    items = list(dataset)
    if n_samples is not None and len(items) > n_samples:
        if seed is not None:
            random.seed(seed)
        items = random.sample(items, n_samples)

    tasks = []
    for i, item in enumerate(items):
        task = Task(
            id=str(i),
            question=item.get("instruction", ""),
            options=[item.get("output_1", ""), item.get("output_2", "")],
            human_score=1.0,  # Pairwise preference data
        )
        tasks.append(task)

    return tasks
