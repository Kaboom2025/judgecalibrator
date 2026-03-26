"""Probe runner for judge calibration and bias detection."""
from typing import List, Optional, Callable
from judgecalib.schemas import Task, ProbeResult
from judgecalib.core.judge_wrapper import JudgeWrapper
from judgecalib.core import analyzer


class Prober:
    """Runs diagnostic probes on a judge model."""

    def __init__(
        self,
        judge: JudgeWrapper,
        tasks: List[Task],
        progress_callback: Optional[Callable[[int, int], None]] = None,
    ):
        """
        Initialize prober.

        Args:
            judge: JudgeWrapper instance to probe
            tasks: List of tasks to evaluate
            progress_callback: Optional callback(current, total) for progress tracking
        """
        self.judge = judge
        self.tasks = tasks
        self.progress_callback = progress_callback

    def run_calibration(self) -> ProbeResult:
        """
        Run calibration probe (ECE computation).

        Evaluates all tasks with human scores and computes Expected Calibration Error.

        Returns:
            ProbeResult with ECE metric and calibration bins
        """
        responses = []
        human_scores = []

        for i, task in enumerate(self.tasks):
            # Skip tasks without human scores
            if task.human_score is None:
                continue

            resp = self.judge.evaluate(task)
            responses.append(resp)
            human_scores.append(task.human_score)

            if self.progress_callback:
                self.progress_callback(i + 1, len(self.tasks))

        # Compute ECE
        if len(responses) == 0:
            ece = 0.0
            bins = []
        else:
            ece, bins = analyzer.compute_ece(responses, human_scores)

        # Create probe result
        result = ProbeResult(
            probe_name="calibration",
            metric_name="ece",
            metric_value=ece,
            details={"bins": [b.model_dump() for b in bins]},
        )

        return result
