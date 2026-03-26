"""In-memory audit job queue with TTL."""
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional


class JobStatus(str, Enum):
    """Status of an audit job."""

    QUEUED = "queued"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


@dataclass
class AuditJob:
    """A single audit job."""

    id: str
    config: dict[str, Any]
    status: JobStatus = JobStatus.QUEUED
    progress: int = 0
    current_probe: Optional[str] = None
    result: Optional[dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class AuditQueue:
    """In-memory queue for audit jobs with TTL cleanup."""

    def __init__(self, job_ttl_seconds: int = 900) -> None:
        """
        Initialize audit queue.

        Args:
            job_ttl_seconds: Time-to-live for completed jobs (seconds)
        """
        self._jobs: dict[str, AuditJob] = {}
        self._ttl = job_ttl_seconds

    def enqueue(self, config: dict[str, Any]) -> str:
        """
        Enqueue a new audit job.

        Args:
            config: Job configuration (judge_model, benchmark, etc.)

        Returns:
            Job ID (UUID string)
        """
        job_id = str(uuid.uuid4())
        self._jobs[job_id] = AuditJob(id=job_id, config=config)
        return job_id

    def get_job(self, job_id: str) -> Optional[AuditJob]:
        """
        Get job by ID.

        Args:
            job_id: Job ID

        Returns:
            AuditJob or None if not found
        """
        return self._jobs.get(job_id)

    def update_progress(
        self, job_id: str, probe: str, percent: int
    ) -> None:
        """
        Update job progress.

        Args:
            job_id: Job ID
            probe: Current probe name
            percent: Progress percentage (0-100)
        """
        job = self._jobs.get(job_id)
        if job:
            job.status = JobStatus.IN_PROGRESS
            job.current_probe = probe
            job.progress = percent

    def complete_job(self, job_id: str, result: dict[str, Any]) -> None:
        """
        Mark job as completed.

        Args:
            job_id: Job ID
            result: Result data
        """
        job = self._jobs.get(job_id)
        if job:
            job.status = JobStatus.COMPLETED
            job.result = result
            job.progress = 100
            job.completed_at = datetime.utcnow()

    def fail_job(self, job_id: str, error: str) -> None:
        """
        Mark job as failed.

        Args:
            job_id: Job ID
            error: Error message
        """
        job = self._jobs.get(job_id)
        if job:
            job.status = JobStatus.FAILED
            job.error = error
            job.completed_at = datetime.utcnow()

    def cleanup_expired(self) -> None:
        """Remove completed jobs past TTL."""
        cutoff = datetime.utcnow() - timedelta(seconds=self._ttl)
        expired_ids = [
            jid
            for jid, job in self._jobs.items()
            if job.completed_at and job.completed_at < cutoff
        ]
        for jid in expired_ids:
            del self._jobs[jid]
