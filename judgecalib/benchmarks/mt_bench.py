"""MT-Bench dataset loader."""
from typing import List
from datasets import load_dataset
from judgecalib.schemas import Task


def load_mt_bench(cache_dir: str = "data/benchmarks") -> List[Task]:
    """
    Load MT-Bench human judgments dataset.

    Each item is a pairwise comparison with two model responses and a human
    preference winner. We extract the question, both answers, and derive a
    numeric human score from the winner for calibration/alignment probes.

    Args:
        cache_dir: Directory for caching the dataset

    Returns:
        List of Task objects with question, reference_answer, options, and human_score
    """
    try:
        dataset = load_dataset("lmsys/mt_bench_human_judgments", split="human")
    except Exception:
        return []

    tasks = []
    for i, item in enumerate(dataset):
        conv_a = item.get("conversation_a") or []
        conv_b = item.get("conversation_b") or []

        # Extract first user question and first assistant answers from each conversation
        question = ""
        answer_a = ""
        answer_b = ""
        for msg in conv_a:
            role = msg.get("role", "")
            content = msg.get("content", "")
            if role == "user" and not question:
                question = content
            elif role == "assistant" and not answer_a:
                answer_a = content

        for msg in conv_b:
            if msg.get("role") == "assistant" and not answer_b:
                answer_b = msg.get("content", "")

        if not question or not answer_a:
            continue

        # Derive human score from winner: model_a good = high score, model_b wins = low score for answer_a
        winner = item.get("winner", "")
        if winner == "model_a":
            human_score = 7.0
        elif winner == "model_b":
            human_score = 3.0
        else:
            human_score = 5.0

        task = Task(
            id=f"{item.get('question_id', i)}_{i}",
            question=question,
            reference_answer=answer_a,
            options=[answer_a, answer_b] if answer_b else None,
            human_score=human_score,
        )
        tasks.append(task)

    return tasks
