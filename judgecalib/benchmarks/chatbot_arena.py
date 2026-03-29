"""Chatbot Arena human preference dataset loader."""
from typing import List

from datasets import load_dataset

from judgecalib.schemas import Task


def load_chatbot_arena(
    max_samples: int = 1000,
    seed: int = 42,
    cache_dir: str = "data/benchmarks",
    language: str = "English",
) -> List[Task]:
    """
    Load Chatbot Arena human preference dataset.

    Each row is a pairwise battle where two anonymous models competed and
    a human voted for the winner. Model provenance (model_a, model_b) is
    stored in task metadata for self-preference bias analysis.

    Args:
        max_samples: Maximum number of samples to load (default 1000)
        seed: Random seed for reproducible sampling (default 42)
        cache_dir: Directory for caching the dataset
        language: Filter by conversation language (default "English")

    Returns:
        List of Task objects with question, options, human_score, and model
        provenance in metadata
    """
    try:
        dataset = load_dataset(
            "lmsys/chatbot_arena_conversations",
            split="train",
            cache_dir=cache_dir,
        )
    except Exception:
        return []

    tasks = []
    for i, item in enumerate(dataset):
        # Filter by language if specified
        if language and item.get("language", "") != language:
            continue

        # Skip ties — we want clear preference signal for alignment probes
        winner = item.get("winner", "")
        if winner not in ("model_a", "model_b"):
            continue

        # Extract first user question and first assistant answers
        conv_a = item.get("conversation_a") or []
        conv_b = item.get("conversation_b") or []

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

        if not question or not answer_a or not answer_b:
            continue

        # Derive human score: model_a winner = high score for answer_a
        human_score = 7.0 if winner == "model_a" else 3.0

        task = Task(
            id=f"arena_{item.get('question_id', i)}",
            question=question,
            reference_answer=answer_a,
            options=[answer_a, answer_b],
            human_score=human_score,
            metadata={
                "model_a": item.get("model_a", ""),
                "model_b": item.get("model_b", ""),
                "source": "chatbot_arena",
                "turn": item.get("turn", 1),
                "anony": item.get("anony", True),
            },
        )
        tasks.append(task)

        if len(tasks) >= max_samples:
            break

    return tasks
