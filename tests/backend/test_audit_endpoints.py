"""Tests for audit API endpoints."""
import pytest
import tempfile
from fastapi.testclient import TestClient


@pytest.fixture(scope="function")
def client() -> TestClient:
    """Create test client with temporary precomputed directory (function-scoped)."""
    from web.backend.main import create_app

    with tempfile.TemporaryDirectory() as tmpdir:
        app = create_app(precomputed_dir=tmpdir)
        yield TestClient(app)


class TestPostAudit:
    """Tests for POST /api/audit endpoint."""

    def test_post_audit_returns_202(self, client: TestClient) -> None:
        """POST /api/audit should return 202 Accepted."""
        response = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test-key",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        assert response.status_code == 202

    def test_post_audit_returns_job_id(self, client: TestClient) -> None:
        """Response should contain job_id."""
        response = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test-key",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        data = response.json()
        assert "job_id" in data
        assert isinstance(data["job_id"], str)
        assert len(data["job_id"]) > 0

    def test_post_audit_returns_queued_status(self, client: TestClient) -> None:
        """Response should indicate queued status."""
        response = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test-key",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        data = response.json()
        assert data["status"] == "queued"

    def test_post_audit_invalid_benchmark(self, client: TestClient) -> None:
        """Invalid benchmark should return 422."""
        response = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "invalid_benchmark",
                "task_count": 10,
            },
        )
        assert response.status_code == 422

    def test_post_audit_task_count_too_large(self, client: TestClient) -> None:
        """Task count > 200 should return 422."""
        response = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 9999,
            },
        )
        assert response.status_code == 422

    def test_post_audit_task_count_too_small(self, client: TestClient) -> None:
        """Task count < 10 should return 422."""
        response = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 5,
            },
        )
        assert response.status_code == 422

    def test_post_audit_valid_benchmarks(self, client: TestClient) -> None:
        """All valid benchmarks should be accepted."""
        for i, benchmark in enumerate(["mt_bench", "reward_bench", "alpaca_eval"]):
            response = client.post(
                "/api/audit",
                json={
                    "judge_model": "gpt-4o",
                    "api_key": "sk-test",
                    "benchmark": benchmark,
                    "task_count": 10,
                },
                headers={"X-Forwarded-For": f"10.0.0.{i}"},
            )
            assert response.status_code == 202

    def test_post_audit_missing_api_key(self, client: TestClient) -> None:
        """Missing api_key should return 422."""
        response = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        assert response.status_code == 422

    def test_post_audit_missing_judge_model(self, client: TestClient) -> None:
        """Missing judge_model should return 422."""
        response = client.post(
            "/api/audit",
            json={
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        assert response.status_code == 422


class TestGetReport:
    """Tests for GET /api/audit/{job_id}/report endpoint."""

    def test_get_report_returns_200(self, client: TestClient) -> None:
        """GET /api/audit/{job_id}/report should return 200."""
        post_resp = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        job_id = post_resp.json()["job_id"]
        get_resp = client.get(f"/api/audit/{job_id}/report")
        assert get_resp.status_code == 200

    def test_get_report_returns_status(self, client: TestClient) -> None:
        """Response should contain status field."""
        post_resp = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        job_id = post_resp.json()["job_id"]
        get_resp = client.get(f"/api/audit/{job_id}/report")
        data = get_resp.json()
        assert "status" in data

    def test_get_report_status_is_queued_initially(self, client: TestClient) -> None:
        """Initial status should be queued."""
        post_resp = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        job_id = post_resp.json()["job_id"]
        get_resp = client.get(f"/api/audit/{job_id}/report")
        data = get_resp.json()
        assert data["status"] == "queued"

    def test_get_report_returns_progress(self, client: TestClient) -> None:
        """Response should contain progress field."""
        post_resp = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        job_id = post_resp.json()["job_id"]
        get_resp = client.get(f"/api/audit/{job_id}/report")
        data = get_resp.json()
        assert "progress" in data

    def test_get_report_returns_current_probe(self, client: TestClient) -> None:
        """Response should contain current_probe field."""
        post_resp = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        job_id = post_resp.json()["job_id"]
        get_resp = client.get(f"/api/audit/{job_id}/report")
        data = get_resp.json()
        assert "current_probe" in data

    def test_get_report_unknown_job_returns_404(self, client: TestClient) -> None:
        """Unknown job ID should return 404."""
        response = client.get("/api/audit/nonexistent-id/report")
        assert response.status_code == 404

    def test_get_report_returns_result_field(self, client: TestClient) -> None:
        """Response should contain result field."""
        post_resp = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        job_id = post_resp.json()["job_id"]
        get_resp = client.get(f"/api/audit/{job_id}/report")
        data = get_resp.json()
        assert "result" in data

    def test_get_report_returns_error_field(self, client: TestClient) -> None:
        """Response should contain error field."""
        post_resp = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
        )
        job_id = post_resp.json()["job_id"]
        get_resp = client.get(f"/api/audit/{job_id}/report")
        data = get_resp.json()
        assert "error" in data


class TestRateLimit:
    """Tests for rate limiting."""

    def test_post_audit_rate_limited(self, client: TestClient) -> None:
        """Second request from same IP should be rate limited."""
        ip_header = {"X-Forwarded-For": "10.0.0.1"}
        # First request succeeds
        response1 = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
            headers=ip_header,
        )
        assert response1.status_code == 202

        # Second request blocked
        response2 = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
            headers=ip_header,
        )
        assert response2.status_code == 429

    def test_different_ips_not_rate_limited(self, client: TestClient) -> None:
        """Different IPs should not be rate limited by each other."""
        # First IP
        response1 = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
            headers={"X-Forwarded-For": "10.0.0.1"},
        )
        assert response1.status_code == 202

        # Second IP (different)
        response2 = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
            headers={"X-Forwarded-For": "10.0.0.2"},
        )
        assert response2.status_code == 202

    def test_rate_limit_429_response(self, client: TestClient) -> None:
        """Rate limited response should have detail message."""
        ip_header = {"X-Forwarded-For": "10.0.0.3"}
        client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
            headers=ip_header,
        )
        response = client.post(
            "/api/audit",
            json={
                "judge_model": "gpt-4o",
                "api_key": "sk-test",
                "benchmark": "mt_bench",
                "task_count": 10,
            },
            headers=ip_header,
        )
        assert response.status_code == 429
        assert "detail" in response.json()


class TestStreamEndpoint:
    """Tests for GET /api/audit/{job_id}/stream endpoint."""

    def test_stream_endpoint_unknown_job_returns_404(self, client: TestClient) -> None:
        """Unknown job ID should return 404."""
        response = client.get("/api/audit/nonexistent-id/stream")
        assert response.status_code == 404
