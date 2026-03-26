"""FastAPI application for JudgeCalibrator backend."""
import json
import random
import threading
from pathlib import Path
from typing import Any, List, Optional

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from web.backend.audit_queue import AuditQueue
from web.backend.rate_limit import RateLimiter


def _run_audit_job(queue: AuditQueue, job_id: str) -> None:
    """Execute a queued audit job in a background thread."""
    from judgecalib.benchmarks.alpaca_eval import load_alpaca_eval
    from judgecalib.benchmarks.mt_bench import load_mt_bench
    from judgecalib.benchmarks.reward_bench import load_reward_bench
    from judgecalib.core.analyzer import compute_trust_grade
    from judgecalib.core.judge_wrapper import JudgeWrapper
    from judgecalib.core.prober import Prober
    from judgecalib.core.rephraser import Rephraser

    job = queue.get_job(job_id)
    if not job:
        return

    config = job.config
    model: str = config["judge_model"]
    benchmark: str = config.get("benchmark", "mt_bench")
    task_count: int = config.get("task_count", 50)

    try:
        queue.update_progress(job_id, "loading", 2)

        if benchmark == "reward_bench":
            tasks = load_reward_bench()
        elif benchmark == "alpaca_eval":
            tasks = load_alpaca_eval()
        else:
            tasks = load_mt_bench()

        if not tasks:
            queue.fail_job(job_id, f"No tasks loaded for benchmark '{benchmark}'")
            return

        if len(tasks) > task_count:
            tasks = random.sample(tasks, task_count)

        judge = JudgeWrapper(model_name=model)
        rephraser = Rephraser(model_name=model)
        expander = Rephraser(model_name="gemini/gemini-2.5-flash")

        probe_names = [
            "calibration",
            "consistency",
            "positional_bias",
            "verbosity_bias",
            "human_alignment",
        ]
        probe_results = []

        for i, probe_name in enumerate(probe_names):
            pct = 5 + int((i / len(probe_names)) * 90)
            queue.update_progress(job_id, probe_name, pct)

            prober = Prober(judge=judge, tasks=tasks)

            if probe_name == "calibration":
                result = prober.run_calibration()
            elif probe_name == "consistency":
                result = prober.run_consistency(rephraser=rephraser)
            elif probe_name == "positional_bias":
                result = prober.run_positional_bias()
            elif probe_name == "verbosity_bias":
                result = prober.run_verbosity_bias(expander=expander)
            else:
                result = prober.run_human_alignment()

            probe_results.append(result)

        ece = probe_results[0].metric_value
        sd = probe_results[1].metric_value
        flip = probe_results[2].metric_value
        spearman = probe_results[4].metric_value

        trust_grade, recommendations = compute_trust_grade(
            ece=ece, consistency_sd=sd, flip_rate=flip, spearman=spearman
        )

        report: dict[str, Any] = {
            "judge": model,
            "benchmark": benchmark,
            "tasks_evaluated": len(tasks),
            "probes": [p.model_dump() for p in probe_results],
            "trust_grade": trust_grade.value if hasattr(trust_grade, "value") else str(trust_grade),
            "recommendations": recommendations,
            "estimated_cost_usd": 0.0,
        }

        queue.complete_job(job_id, report)

    except Exception as exc:
        queue.fail_job(job_id, str(exc))


# Validation constants
VALID_BENCHMARKS = {"mt_bench", "reward_bench", "alpaca_eval"}

# Module-level cache for demo data (loaded once)
_demo_tasks: Optional[List[Any]] = None
_demo_tasks_lock = threading.Lock()
_demo_judge: Optional[Any] = None
_demo_judge_lock = threading.Lock()
_demo_expander: Optional[Any] = None
_demo_expander_lock = threading.Lock()


def _get_demo_tasks() -> List[Any]:
    """Load and cache MT-Bench pairwise tasks for the demo."""
    global _demo_tasks
    if _demo_tasks is not None:
        return _demo_tasks
    with _demo_tasks_lock:
        if _demo_tasks is not None:
            return _demo_tasks
        from judgecalib.benchmarks.mt_bench import load_mt_bench
        tasks = load_mt_bench()
        # Only keep tasks with two options (pairwise)
        _demo_tasks = [t for t in tasks if t.options and len(t.options) >= 2]
    return _demo_tasks


def _get_demo_judge() -> Any:
    """Lazily initialize demo judge (gpt-4o-mini)."""
    global _demo_judge
    if _demo_judge is not None:
        return _demo_judge
    with _demo_judge_lock:
        if _demo_judge is not None:
            return _demo_judge
        from judgecalib.core.judge_wrapper import JudgeWrapper
        _demo_judge = JudgeWrapper(model_name="gpt-4o-mini")
    return _demo_judge


def _get_demo_expander() -> Any:
    """Lazily initialize demo expander (gemini-2.5-flash)."""
    global _demo_expander
    if _demo_expander is not None:
        return _demo_expander
    with _demo_expander_lock:
        if _demo_expander is not None:
            return _demo_expander
        from judgecalib.core.rephraser import Rephraser
        _demo_expander = Rephraser(model_name="gemini/gemini-2.5-flash")
    return _demo_expander


class AuditRequest(BaseModel):
    """Request model for audit endpoint."""

    judge_model: str
    api_key: str | None = None
    benchmark: str
    task_count: int = Field(default=50, ge=10, le=200)
    probes: list[str] = Field(
        default=[
            "calibration",
            "consistency",
            "positional_bias",
            "verbosity_bias",
            "human_alignment",
        ]
    )

    @field_validator("benchmark")
    @classmethod
    def validate_benchmark(cls, v: str) -> str:
        """Validate benchmark is in allowed list."""
        if v not in VALID_BENCHMARKS:
            raise ValueError(f"benchmark must be one of {VALID_BENCHMARKS}")
        return v


class DemoEvaluateRequest(BaseModel):
    """Request model for demo pairwise evaluation."""

    question: str
    answer_a: str
    answer_b: str


class DemoExpandRequest(BaseModel):
    """Request model for demo text expansion."""

    text: str
    method: str = "deterministic"  # "deterministic" | "llm"


def create_app(precomputed_dir: str = "data/precomputed") -> FastAPI:
    """
    Create FastAPI application.

    Args:
        precomputed_dir: Path to directory with precomputed result JSONs

    Returns:
        Configured FastAPI application
    """
    app = FastAPI(title="JudgeCalibrator API")
    queue = AuditQueue()
    limiter = RateLimiter()
    demo_limiter = RateLimiter(max_per_hour=30, window_seconds=3600)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    def health() -> dict[str, str]:
        """Health check endpoint."""
        return {"status": "ok"}

    @app.get("/api/precomputed")
    def get_precomputed() -> dict[str, list[dict[str, Any]]]:
        """
        Get precomputed audit results.

        Returns:
            Dict with 'results' key containing list of result JSONs
        """
        results: list[dict[str, Any]] = []
        p = Path(precomputed_dir)
        if p.exists():
            for f in sorted(p.glob("*.json")):
                try:
                    results.append(json.loads(f.read_text()))
                except (json.JSONDecodeError, IOError):
                    pass
        return {"results": results}

    @app.get("/api/demo/question")
    def get_demo_question(
        request: Request,
        exclude: str = Query(default=""),
    ) -> dict[str, Any]:
        """
        Get a random pairwise question for the interactive demo.

        Args:
            exclude: Comma-separated list of question IDs to exclude

        Returns:
            Dict with question_id, question, answer_a, answer_b, human_winner
        """
        ip = _extract_ip(request)
        if not demo_limiter.is_allowed(ip):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
        demo_limiter.record(ip)

        tasks = _get_demo_tasks()
        if not tasks:
            raise HTTPException(status_code=503, detail="Demo data unavailable")

        exclude_ids = set(exclude.split(",")) if exclude else set()
        candidates = [t for t in tasks if t.id not in exclude_ids]
        if not candidates:
            candidates = tasks  # wrap around if all excluded

        task = random.choice(candidates)
        human_score = task.human_score or 5.0
        if human_score > 5:
            human_winner = "A"
        elif human_score < 5:
            human_winner = "B"
        else:
            human_winner = "tie"

        return {
            "question_id": task.id,
            "question": task.question,
            "answer_a": task.options[0],
            "answer_b": task.options[1],
            "human_winner": human_winner,
        }

    @app.post("/api/demo/evaluate")
    def post_demo_evaluate(
        req: DemoEvaluateRequest, request: Request
    ) -> dict[str, Any]:
        """
        Evaluate a pairwise question using the demo judge (gpt-4o-mini).

        Returns:
            Dict with preference, confidence, reasoning
        """
        ip = _extract_ip(request)
        if not demo_limiter.is_allowed(ip):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
        demo_limiter.record(ip)

        try:
            judge = _get_demo_judge()
            result = judge.evaluate_pairwise(req.question, req.answer_a, req.answer_b)
            return {
                "preference": result.get("preference", "A"),
                "confidence": result.get("confidence", 50),
                "reasoning": result.get("reasoning", ""),
            }
        except Exception as exc:
            raise HTTPException(status_code=500, detail=f"Evaluation failed: {exc}")

    @app.post("/api/demo/expand")
    def post_demo_expand(
        req: DemoExpandRequest, request: Request
    ) -> dict[str, Any]:
        """
        Expand text to be more verbose.

        Returns:
            Dict with expanded_text, method, original_length, expanded_length
        """
        ip = _extract_ip(request)
        if not demo_limiter.is_allowed(ip):
            raise HTTPException(status_code=429, detail="Rate limit exceeded. Try again later.")
        demo_limiter.record(ip)

        original_length = len(req.text.split())

        if req.method == "llm":
            try:
                expander = _get_demo_expander()
                expanded = expander.expand(req.text)
                if not expanded:
                    expanded = req.text
            except Exception:
                expanded = req.text
        else:
            from judgecalib.core.prober import _pad_text
            expanded = _pad_text(req.text, target_ratio=1.5)

        expanded_length = len(expanded.split())
        return {
            "expanded_text": expanded,
            "method": req.method,
            "original_length": original_length,
            "expanded_length": expanded_length,
        }

    @app.post("/api/audit", status_code=202)
    def post_audit(req: AuditRequest, request: Request) -> dict[str, Any]:
        """
        Submit a new audit job.

        Returns:
            Dict with job_id and status

        Raises:
            HTTPException: If rate limited (429) or invalid input (422)
        """
        ip = _extract_ip(request)

        if not limiter.is_allowed(ip):
            raise HTTPException(
                status_code=429,
                detail="Rate limit: 1 audit per hour per IP",
            )

        limiter.record(ip)

        job_id = queue.enqueue(req.model_dump(exclude={"api_key"}))

        thread = threading.Thread(
            target=_run_audit_job, args=(queue, job_id), daemon=True
        )
        thread.start()

        return {"job_id": job_id, "status": "queued"}

    @app.get("/api/audit/{job_id}/report")
    def get_report(job_id: str) -> dict[str, Any]:
        """
        Get audit job status and report.

        Raises:
            HTTPException: If job not found (404)
        """
        job = queue.get_job(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")

        return {
            "status": job.status.value,
            "progress": job.progress,
            "current_probe": job.current_probe,
            "result": job.result,
            "error": job.error,
        }

    @app.get("/api/audit/{job_id}/stream")
    def stream_audit(job_id: str) -> StreamingResponse:
        """
        Stream audit progress via Server-Sent Events.

        Raises:
            HTTPException: If job not found (404)
        """
        job = queue.get_job(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")

        def event_generator() -> Any:
            import time

            last_progress = -1
            max_iterations = 300  # 5 minutes

            for _ in range(max_iterations):
                j = queue.get_job(job_id)
                if j is None:
                    break

                if j.progress != last_progress:
                    last_progress = j.progress
                    event_data = {
                        "probe": j.current_probe,
                        "percent": j.progress,
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"

                if j.status.value in ("completed", "failed"):
                    payload = {
                        "status": j.status.value,
                        "result": j.result,
                        "error": j.error,
                    }
                    yield f"event: complete\ndata: {json.dumps(payload)}\n\n"
                    break

                time.sleep(1)

        return StreamingResponse(event_generator(), media_type="text/event-stream")

    return app


def _extract_ip(request: Request) -> str:
    """Extract client IP from request headers."""
    ip = request.headers.get("X-Forwarded-For", "")
    if ip:
        return ip.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# Create default app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("web.backend.main:app", host="0.0.0.0", port=8000, reload=True)
