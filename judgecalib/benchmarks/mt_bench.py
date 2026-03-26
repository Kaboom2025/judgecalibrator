"""MT-Bench dataset loader."""
from typing import List
from datasets import load_dataset
from judgecalib.schemas import Task


def load_mt_bench(cache_dir: str = "data/benchmarks") -> List[Task]:
    """
    Load MT-Bench dataset.

    Downloads human-judged quality scores for 80 MT-Bench tasks.

    Args:
        cache_dir: Directory for caching the dataset

    Returns:
        List of Task objects with human scores
    """
    try:
        # Try to load from HuggingFace
        dataset = load_dataset("lmsys/mt_bench_human_judgments", split="human")
    except Exception:
        # If dataset is not available, return empty list
        return []

    tasks = []
    for item in dataset:
        task = Task(
            id=str(item.get("question_id", len(tasks))),
            question=item.get("question", ""),
            human_score=float(item.get("score", 5.0)),
            category=item.get("category"),
        )
        tasks.append(task)

    return tasks
