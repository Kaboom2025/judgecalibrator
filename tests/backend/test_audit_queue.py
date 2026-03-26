"""Tests for in-memory audit queue."""
import pytest
import time
from web.backend.audit_queue import AuditQueue, JobStatus, AuditJob


class TestAuditQueueEnqueue:
    """Tests for enqueueing jobs."""

    def test_enqueue_returns_job_id(self) -> None:
        """Enqueue should return a non-empty string job ID."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        assert isinstance(job_id, str)
        assert len(job_id) > 0

    def test_enqueue_creates_queued_job(self) -> None:
        """Enqueued job should have QUEUED status."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        job = queue.get_job(job_id)
        assert job is not None
        assert job.status == JobStatus.QUEUED

    def test_enqueue_stores_config(self) -> None:
        """Enqueued job should preserve config."""
        queue = AuditQueue()
        config = {"judge_model": "gpt-4o", "benchmark": "mt_bench", "task_count": 50}
        job_id = queue.enqueue(config)
        job = queue.get_job(job_id)
        assert job is not None
        assert job.config == config


class TestAuditQueueGetJob:
    """Tests for retrieving jobs."""

    def test_get_job_returns_none_for_unknown(self) -> None:
        """Get unknown job ID should return None."""
        queue = AuditQueue()
        assert queue.get_job("nonexistent") is None

    def test_get_job_returns_queued_job(self) -> None:
        """Get should return queued job with correct defaults."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        job = queue.get_job(job_id)
        assert job is not None
        assert job.id == job_id
        assert job.progress == 0
        assert job.current_probe is None
        assert job.result is None
        assert job.error is None


class TestAuditQueueUpdateProgress:
    """Tests for updating job progress."""

    def test_update_progress_sets_in_progress(self) -> None:
        """Update progress should set status to IN_PROGRESS."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.update_progress(job_id, probe="calibration", percent=50)
        job = queue.get_job(job_id)
        assert job is not None
        assert job.status == JobStatus.IN_PROGRESS

    def test_update_progress_updates_percent(self) -> None:
        """Update progress should update progress percentage."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.update_progress(job_id, probe="calibration", percent=50)
        job = queue.get_job(job_id)
        assert job is not None
        assert job.progress == 50

    def test_update_progress_updates_probe(self) -> None:
        """Update progress should update current probe name."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.update_progress(job_id, probe="consistency", percent=25)
        job = queue.get_job(job_id)
        assert job is not None
        assert job.current_probe == "consistency"

    def test_update_progress_unknown_job_is_noop(self) -> None:
        """Update progress on unknown job should not raise error."""
        queue = AuditQueue()
        queue.update_progress("unknown_id", probe="calibration", percent=50)
        # Should not raise


class TestAuditQueueCompleteJob:
    """Tests for completing jobs."""

    def test_complete_job_sets_completed_status(self) -> None:
        """Complete job should set status to COMPLETED."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.complete_job(job_id, result={"trust_grade": "B"})
        job = queue.get_job(job_id)
        assert job is not None
        assert job.status == JobStatus.COMPLETED

    def test_complete_job_stores_result(self) -> None:
        """Complete job should preserve result."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        result = {"trust_grade": "B", "probes": []}
        queue.complete_job(job_id, result=result)
        job = queue.get_job(job_id)
        assert job is not None
        assert job.result == result

    def test_complete_job_sets_progress_to_100(self) -> None:
        """Complete job should set progress to 100."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.complete_job(job_id, result={})
        job = queue.get_job(job_id)
        assert job is not None
        assert job.progress == 100

    def test_complete_job_sets_completed_at(self) -> None:
        """Complete job should set completed_at timestamp."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.complete_job(job_id, result={})
        job = queue.get_job(job_id)
        assert job is not None
        assert job.completed_at is not None

    def test_complete_job_unknown_job_is_noop(self) -> None:
        """Complete job on unknown job should not raise error."""
        queue = AuditQueue()
        queue.complete_job("unknown_id", result={})
        # Should not raise


class TestAuditQueueFailJob:
    """Tests for failing jobs."""

    def test_fail_job_sets_failed_status(self) -> None:
        """Fail job should set status to FAILED."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.fail_job(job_id, error="API error")
        job = queue.get_job(job_id)
        assert job is not None
        assert job.status == JobStatus.FAILED

    def test_fail_job_stores_error(self) -> None:
        """Fail job should preserve error message."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        error_msg = "API key invalid"
        queue.fail_job(job_id, error=error_msg)
        job = queue.get_job(job_id)
        assert job is not None
        assert job.error == error_msg

    def test_fail_job_sets_completed_at(self) -> None:
        """Fail job should set completed_at timestamp."""
        queue = AuditQueue()
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.fail_job(job_id, error="error")
        job = queue.get_job(job_id)
        assert job is not None
        assert job.completed_at is not None

    def test_fail_job_unknown_job_is_noop(self) -> None:
        """Fail job on unknown job should not raise error."""
        queue = AuditQueue()
        queue.fail_job("unknown_id", error="error")
        # Should not raise


class TestAuditQueueCleanup:
    """Tests for TTL cleanup."""

    def test_cleanup_removes_expired_jobs(self) -> None:
        """Cleanup should remove jobs past TTL."""
        queue = AuditQueue(job_ttl_seconds=0)
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.complete_job(job_id, result={})
        time.sleep(0.01)
        queue.cleanup_expired()
        assert queue.get_job(job_id) is None

    def test_cleanup_preserves_active_jobs(self) -> None:
        """Cleanup should not remove active (non-completed) jobs."""
        queue = AuditQueue(job_ttl_seconds=0)
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.cleanup_expired()
        assert queue.get_job(job_id) is not None

    def test_cleanup_preserves_recent_completed_jobs(self) -> None:
        """Cleanup should not remove recently completed jobs."""
        queue = AuditQueue(job_ttl_seconds=3600)
        job_id = queue.enqueue({"judge_model": "gpt-4o", "benchmark": "mt_bench"})
        queue.complete_job(job_id, result={})
        queue.cleanup_expired()
        assert queue.get_job(job_id) is not None

    def test_cleanup_is_safe_when_empty(self) -> None:
        """Cleanup on empty queue should not raise error."""
        queue = AuditQueue()
        queue.cleanup_expired()
        # Should not raise
