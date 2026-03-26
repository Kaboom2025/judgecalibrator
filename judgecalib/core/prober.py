"""Probe runner for judge calibration and bias detection."""
from typing import List, Optional, Callable
import numpy as np
from judgecalib.schemas import Task, ProbeResult, AuditReport
from judgecalib.core.judge_wrapper import JudgeWrapper
from judgecalib.core import analyzer


def _pad_text(text: str, target_ratio: float = 1.5) -> str:
    """
    Add padding to text to increase word count without changing meaning.

    This function is deterministic and requires no LLM calls. It uses rule-based
    padding with transitional phrases and repeated key concepts.

    Args:
        text: Original text to pad
        target_ratio: Target length ratio (default 1.5 = 50% increase)

    Returns:
        Padded text approximately target_ratio times the original length
    """
    padding_phrases = [
        "To elaborate further, ",
        "As previously mentioned, ",
        "Building on this point, ",
        "In summary, ",
        "Furthermore, ",
        "More specifically, ",
    ]

    words = text.split()
    if len(words) == 0:
        return text

    target_word_count = int(len(words) * target_ratio)
    current_word_count = len(words)

    # If already at target length, return as-is
    if current_word_count >= target_word_count:
        return text

    padding_to_add = target_word_count - current_word_count
    result = list(words)

    # Add padding phrases and repeat key sentences
    padding_index = 0
    while len(result) < target_word_count:
        if padding_index < len(padding_phrases):
            # Add transition phrase
            phrase = padding_phrases[padding_index].rstrip()
            result.extend(phrase.split())
            padding_index += 1
        else:
            # Repeat the first few words as a summary
            if len(words) > 0:
                result.extend(words[:min(3, len(words))])
            else:
                break

    return " ".join(result[:target_word_count])


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

    def run_consistency(
        self, rephraser: "Rephraser", n_rephrasings: int = 5  # noqa: F821
    ) -> ProbeResult:
        """
        Run consistency probe using prompt rephrasing.

        Evaluates tasks multiple times with semantically equivalent rephrased prompts
        and measures the standard deviation of responses.

        Args:
            rephraser: Rephraser instance for generating prompt variations
            n_rephrasings: Number of times to rephrase each prompt (default 5)

        Returns:
            ProbeResult with mean_sd metric
        """
        per_task_sds: list[float] = []

        for task in self.tasks:
            # Skip tasks without reference answer
            if task.reference_answer is None:
                continue

            # Generate rephrased versions of the question
            variations = rephraser.rephrase(task.question, n=n_rephrasings)

            # Evaluate with each rephrased question
            scores = []
            for variation in variations:
                # Create modified task with rephrased question
                modified_task = Task(
                    id=task.id,
                    question=variation,
                    reference_answer=task.reference_answer,
                    human_score=task.human_score,
                    category=task.category,
                    metadata=task.metadata,
                )

                # Get judge response
                response = self.judge.evaluate(modified_task)
                scores.append(response.score)

            # Compute SD for this task
            if len(scores) > 0:
                task_sd = float(np.std(scores))
                per_task_sds.append(task_sd)

            if self.progress_callback:
                # For progress tracking, approximate work done
                total_evals = len(self.tasks) * n_rephrasings
                current = len(per_task_sds) * n_rephrasings
                self.progress_callback(current, total_evals)

        # Compute mean SD
        mean_sd = float(np.mean(per_task_sds)) if per_task_sds else 0.0
        max_sd = float(np.max(per_task_sds)) if per_task_sds else 0.0

        # Create probe result
        result = ProbeResult(
            probe_name="consistency",
            metric_name="mean_sd",
            metric_value=mean_sd,
            details={"per_task_sds": per_task_sds, "max_sd": max_sd},
        )

        return result

    def run_positional_bias(self) -> ProbeResult:
        """
        Run positional bias probe by comparing option order swaps.

        Evaluates pairwise options in both orders and measures the flip rate
        (fraction of cases where the content preference changes when positions are swapped).

        Returns:
            ProbeResult with flip_rate metric
        """
        flips = 0
        position_a_preference_count = 0
        total_comparisons = 0

        for task in self.tasks:
            # Skip tasks without exactly 2 options
            if task.options is None or len(task.options) < 2:
                continue

            # Take first two options
            option_1 = task.options[0]
            option_2 = task.options[1]

            # Create task with option_1 as Answer A, option_2 as Answer B
            task_ab = Task(
                id=task.id,
                question=f"{task.question}\nAnswer A: {option_1}\nAnswer B: {option_2}",
                reference_answer=None,
                human_score=task.human_score,
                category=task.category,
                metadata=task.metadata,
            )

            # Create task with option_2 as Answer A, option_1 as Answer B (swapped)
            task_ba = Task(
                id=task.id,
                question=f"{task.question}\nAnswer A: {option_2}\nAnswer B: {option_1}",
                reference_answer=None,
                human_score=task.human_score,
                category=task.category,
                metadata=task.metadata,
            )

            # Get responses
            response_ab = self.judge.evaluate(task_ab)
            response_ba = self.judge.evaluate(task_ba)

            # Determine preference based on scores
            # score > 5.5 means the judge prefers Answer A in that comparison
            position_a_preferred_in_ab = response_ab.score > 5.5
            position_a_preferred_in_ba = response_ba.score > 5.5

            # Track position A preference (how often does judge prefer position A?)
            if position_a_preferred_in_ab:
                position_a_preference_count += 1

            # A flip in content preference occurs when the same option's preference reverses
            # In AB order: option_1 is in position A, so it's preferred if position_a_preferred_in_ab = True
            # In BA order: option_1 is in position B, so it's preferred if position_a_preferred_in_ba = False
            # A flip occurs when option_1's preference is inconsistent: position_a_preferred_in_ab != (not position_a_preferred_in_ba)
            # Which simplifies to: position_a_preferred_in_ab == position_a_preferred_in_ba (both true or both false means same position is always preferred)
            # When position_a_preferred_in_ab == position_a_preferred_in_ba == True, option_1 is preferred in AB but not in BA -> FLIP
            # When position_a_preferred_in_ab == position_a_preferred_in_ba == False, option_1 is not preferred in AB, and not preferred in BA -> CONSISTENT
            #
            # Actually, let me think differently:
            # - In AB: if position_a_preferred_in_ab is True, option_1 wins
            # - In BA: if position_a_preferred_in_ba is True, option_2 wins (option_1 loses)
            # So option_1's preference is: position_a_preferred_in_ab
            # And in BA order, option_1's preference should be: NOT position_a_preferred_in_ba
            option_1_wins_in_ab = position_a_preferred_in_ab
            option_1_wins_in_ba = not position_a_preferred_in_ba

            # A flip is when option_1 has different outcomes in the two orders
            if option_1_wins_in_ab != option_1_wins_in_ba:
                flips += 1

            total_comparisons += 1

            if self.progress_callback:
                current = total_comparisons * 2  # 2 evals per task
                total = len(self.tasks) * 2
                self.progress_callback(current, total)

        # Calculate metrics
        flip_rate = float(flips / total_comparisons) if total_comparisons > 0 else 0.0
        position_a_preference_rate = (
            float(position_a_preference_count / total_comparisons)
            if total_comparisons > 0
            else 0.0
        )

        # Create probe result
        result = ProbeResult(
            probe_name="positional_bias",
            metric_name="flip_rate",
            metric_value=flip_rate,
            details={"position_a_preference_rate": position_a_preference_rate},
        )

        return result

    def run_verbosity_bias(self) -> ProbeResult:
        """
        Run verbosity bias probe by comparing original and padded versions.

        Evaluates tasks with original and padded (50% longer) answers and measures
        the mean lift (score difference between padded and original).

        Returns:
            ProbeResult with mean_lift metric
        """
        per_task_lifts: list[float] = []

        for task in self.tasks:
            # Skip tasks without reference answer
            if task.reference_answer is None:
                continue

            # Create task with original answer
            task_original = Task(
                id=task.id,
                question=task.question,
                reference_answer=task.reference_answer,
                human_score=task.human_score,
                category=task.category,
                metadata=task.metadata,
            )

            # Create padded version of the answer
            padded_answer = _pad_text(task.reference_answer, target_ratio=1.5)

            # Create task with padded answer
            task_padded = Task(
                id=task.id,
                question=task.question,
                reference_answer=padded_answer,
                human_score=task.human_score,
                category=task.category,
                metadata=task.metadata,
            )

            # Get responses
            response_original = self.judge.evaluate(task_original)
            response_padded = self.judge.evaluate(task_padded)

            # Compute lift (padded - original)
            lift = response_padded.score - response_original.score
            per_task_lifts.append(lift)

            if self.progress_callback:
                current = len(per_task_lifts) * 2  # 2 evals per task
                total = len(self.tasks) * 2
                self.progress_callback(current, total)

        # Compute mean lift
        mean_lift = float(np.mean(per_task_lifts)) if per_task_lifts else 0.0
        max_lift = float(np.max(per_task_lifts)) if per_task_lifts else 0.0

        # Create probe result
        result = ProbeResult(
            probe_name="verbosity_bias",
            metric_name="mean_lift",
            metric_value=mean_lift,
            details={"per_task_lifts": per_task_lifts, "max_lift": max_lift},
        )

        return result

    def run_human_alignment(self) -> ProbeResult:
        """
        Run human alignment probe using Spearman rank correlation.

        Evaluates all tasks and computes the Spearman rank correlation between
        judge scores and human scores to measure alignment.

        Returns:
            ProbeResult with spearman metric
        """
        judge_scores = []
        human_scores = []

        for i, task in enumerate(self.tasks):
            # Skip tasks without human score or reference answer
            if task.human_score is None or task.reference_answer is None:
                continue

            resp = self.judge.evaluate(task)
            judge_scores.append(resp.score)
            human_scores.append(task.human_score)

            if self.progress_callback:
                self.progress_callback(i + 1, len(self.tasks))

        # Compute Spearman correlation
        spearman = analyzer.compute_spearman(judge_scores, human_scores)

        # Create probe result
        result = ProbeResult(
            probe_name="human_alignment",
            metric_name="spearman",
            metric_value=spearman,
            details={
                "judge_scores": judge_scores,
                "human_scores": human_scores,
            },
        )

        return result

    def run_all(
        self, rephraser: "Rephraser", n_rephrasings: int = 5  # noqa: F821
    ) -> AuditReport:
        """
        Run all diagnostic probes and compute overall trust grade.

        Orchestrates the execution of all probes and computes the overall trust grade
        based on the combined metrics from calibration, consistency, positional bias,
        verbosity bias, and human alignment probes.

        Args:
            rephraser: Rephraser instance for consistency probe
            n_rephrasings: Number of rephrasings for consistency probe (default 5)

        Returns:
            AuditReport with all probe results and overall trust grade
        """
        # Run all probes
        probes = [
            self.run_calibration(),
            self.run_consistency(rephraser, n_rephrasings=n_rephrasings),
            self.run_positional_bias(),
            self.run_verbosity_bias(),
            self.run_human_alignment(),
        ]

        # Extract metrics for trust grade computation
        calibration_probe = probes[0]
        consistency_probe = probes[1]
        positional_bias_probe = probes[2]
        human_alignment_probe = probes[4]

        ece = calibration_probe.metric_value
        consistency_sd = consistency_probe.metric_value
        flip_rate = positional_bias_probe.metric_value
        spearman = human_alignment_probe.metric_value

        # Compute trust grade
        trust_grade, recommendations = analyzer.compute_trust_grade(
            ece=ece,
            consistency_sd=consistency_sd,
            flip_rate=flip_rate,
            spearman=spearman,
        )

        # Create audit report
        report = AuditReport(
            judge=self.judge.model_name,
            benchmark="custom",
            tasks_evaluated=len(self.tasks),
            probes=probes,
            trust_grade=trust_grade,
            recommendations=recommendations,
        )

        return report
