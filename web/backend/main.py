"""FastAPI application for JudgeCalibrator backend."""
import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from web.backend.audit_queue import AuditQueue
from web.backend.rate_limit import RateLimiter

# Validation constants
VALID_BENCHMARKS = {"mt_bench", "reward_bench", "alpaca_eval"}


class AuditRequest(BaseModel):
    """Request model for audit endpoint."""

    judge_model: str
    api_key: str
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
                    # Skip malformed JSON files
                    pass
        return {"results": results}

    @app.post("/api/audit", status_code=202)
    def post_audit(req: AuditRequest, request: Request) -> dict[str, Any]:
        """
        Submit a new audit job.

        Args:
            req: Audit request config
            request: FastAPI request object

        Returns:
            Dict with job_id and status

        Raises:
            HTTPException: If rate limited (429) or invalid input (422)
        """
        # Extract IP address
        ip = request.headers.get("X-Forwarded-For", "")
        if ip:
            ip = ip.split(",")[0].strip()
        else:
            ip = request.client.host if request.client else "unknown"

        # Check rate limit
        if not limiter.is_allowed(ip):
            raise HTTPException(
                status_code=429,
                detail="Rate limit: 1 audit per hour per IP",
            )

        limiter.record(ip)

        # Enqueue job (excluding api_key from stored config)
        job_id = queue.enqueue(req.model_dump(exclude={"api_key"}))

        return {"job_id": job_id, "status": "queued"}

    @app.get("/api/audit/{job_id}/report")
    def get_report(job_id: str) -> dict[str, Any]:
        """
        Get audit job status and report.

        Args:
            job_id: Job ID

        Returns:
            Dict with status, progress, current_probe, result, error

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

        Args:
            job_id: Job ID

        Returns:
            StreamingResponse with SSE events

        Raises:
            HTTPException: If job not found (404)
        """
        job = queue.get_job(job_id)
        if job is None:
            raise HTTPException(status_code=404, detail="Job not found")

        def event_generator() -> Any:
            """Generate SSE events for job progress."""
            import time

            last_progress = -1
            max_iterations = 300  # 5 minutes

            for _ in range(max_iterations):
                j = queue.get_job(job_id)
                if j is None:
                    break

                # Send progress update if changed
                if j.progress != last_progress:
                    last_progress = j.progress
                    event_data = {
                        "probe": j.current_probe,
                        "percent": j.progress,
                    }
                    yield f"data: {json.dumps(event_data)}\n\n"

                # Send completion event
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


# Create default app instance
app = create_app()


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("web.backend.main:app", host="0.0.0.0", port=8000, reload=True)
