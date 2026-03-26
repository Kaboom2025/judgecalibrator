"""Tests for precomputed results endpoint."""
import pytest
import json
import tempfile
from pathlib import Path
from fastapi.testclient import TestClient


@pytest.fixture
def mock_precomputed_dir() -> str:
    """Create temporary directory with mock precomputed JSON files."""
    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        # Create two mock result files
        for model in ["gpt-4o", "claude-sonnet"]:
            data = {
                "judge": model,
                "benchmark": "mt_bench",
                "tasks_evaluated": 80,
                "trust_grade": "B",
                "probes": [],
            }
            (tmp_path / f"{model}.json").write_text(json.dumps(data))
        yield str(tmp_path)


@pytest.fixture
def client(mock_precomputed_dir: str) -> TestClient:
    """Create test client with mock precomputed directory."""
    from web.backend.main import create_app

    app = create_app(precomputed_dir=mock_precomputed_dir)
    return TestClient(app)


class TestHealthCheck:
    """Tests for health check endpoint."""

    def test_health_check_returns_ok(self, client: TestClient) -> None:
        """GET /health should return status ok."""
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


class TestPrecomputedEndpoint:
    """Tests for GET /api/precomputed endpoint."""

    def test_precomputed_returns_200(self, client: TestClient) -> None:
        """GET /api/precomputed should return 200."""
        response = client.get("/api/precomputed")
        assert response.status_code == 200

    def test_precomputed_returns_results_key(self, client: TestClient) -> None:
        """Response should have results key."""
        response = client.get("/api/precomputed")
        data = response.json()
        assert "results" in data

    def test_precomputed_returns_two_results(self, client: TestClient) -> None:
        """Should return two precomputed results."""
        response = client.get("/api/precomputed")
        data = response.json()
        assert len(data["results"]) == 2

    def test_precomputed_results_have_judge_field(self, client: TestClient) -> None:
        """Each result should have judge field."""
        response = client.get("/api/precomputed")
        results = response.json()["results"]
        for result in results:
            assert "judge" in result

    def test_precomputed_results_have_trust_grade(self, client: TestClient) -> None:
        """Each result should have trust_grade field."""
        response = client.get("/api/precomputed")
        results = response.json()["results"]
        for result in results:
            assert "trust_grade" in result

    def test_precomputed_results_have_probes(self, client: TestClient) -> None:
        """Each result should have probes field."""
        response = client.get("/api/precomputed")
        results = response.json()["results"]
        for result in results:
            assert "probes" in result

    def test_precomputed_results_sorted_by_name(self, client: TestClient) -> None:
        """Results should be sorted by filename."""
        response = client.get("/api/precomputed")
        results = response.json()["results"]
        judges = [r["judge"] for r in results]
        assert judges == sorted(judges)


class TestPrecomputedEmptyDir:
    """Tests for precomputed with empty directory."""

    def test_precomputed_empty_dir(self) -> None:
        """Empty precomputed dir should return empty results."""
        from web.backend.main import create_app

        with tempfile.TemporaryDirectory() as tmpdir:
            app = create_app(precomputed_dir=tmpdir)
            client = TestClient(app)
            response = client.get("/api/precomputed")
            assert response.status_code == 200
            assert response.json()["results"] == []

    def test_precomputed_nonexistent_dir(self) -> None:
        """Nonexistent precomputed dir should return empty results."""
        from web.backend.main import create_app

        app = create_app(precomputed_dir="/nonexistent/path")
        client = TestClient(app)
        response = client.get("/api/precomputed")
        assert response.status_code == 200
        assert response.json()["results"] == []
