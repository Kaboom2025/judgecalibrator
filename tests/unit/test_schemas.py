"""Tests for schemas module."""
import pytest
from datetime import datetime
from judgecalib.schemas import (
    Task,
    JudgeResponse,
    CalibrationBin,
    ProbeResult,
    AuditReport,
    TrustGrade,
)


class TestTrustGrade:
    """Tests for TrustGrade enum."""

    def test_trust_grade_a_exists(self):
        assert TrustGrade.A == "A"

    def test_trust_grade_b_plus_exists(self):
        assert TrustGrade.B_PLUS == "B+"

    def test_trust_grade_b_exists(self):
        assert TrustGrade.B == "B"

    def test_trust_grade_c_exists(self):
        assert TrustGrade.C == "C"

    def test_trust_grade_unknown_exists(self):
        assert TrustGrade.UNKNOWN == "UNKNOWN"


class TestTask:
    """Tests for Task schema."""

    def test_task_with_required_fields(self):
        task = Task(id="task_1", question="What is 2+2?")
        assert task.id == "task_1"
        assert task.question == "What is 2+2?"

    def test_task_with_all_fields(self):
        task = Task(
            id="task_1",
            question="What is 2+2?",
            reference_answer="4",
            options=["3", "4", "5"],
            human_score=9.5,
            category="math",
            metadata={"difficulty": "easy"},
        )
        assert task.reference_answer == "4"
        assert task.options == ["3", "4", "5"]
        assert task.human_score == 9.5
        assert task.category == "math"
        assert task.metadata["difficulty"] == "easy"

    def test_task_optional_fields_default_to_none(self):
        task = Task(id="task_1", question="Test?")
        assert task.reference_answer is None
        assert task.options is None
        assert task.human_score is None
        assert task.category is None

    def test_task_metadata_defaults_to_empty_dict(self):
        task = Task(id="task_1", question="Test?")
        assert task.metadata == {}


class TestJudgeResponse:
    """Tests for JudgeResponse schema."""

    def test_judge_response_with_required_fields(self):
        response = JudgeResponse(task_id="task_1", score=7, confidence=80)
        assert response.task_id == "task_1"
        assert response.score == 7
        assert response.confidence == 80

    def test_judge_response_with_all_fields(self):
        response = JudgeResponse(
            task_id="task_1",
            score=7,
            confidence=80,
            reasoning="Good answer",
            raw_response='{"score": 7}',
        )
        assert response.reasoning == "Good answer"
        assert response.raw_response == '{"score": 7}'

    def test_judge_response_score_at_lower_bound(self):
        response = JudgeResponse(task_id="task_1", score=1, confidence=50)
        assert response.score == 1

    def test_judge_response_score_at_upper_bound(self):
        response = JudgeResponse(task_id="task_1", score=10, confidence=50)
        assert response.score == 10

    def test_judge_response_score_below_lower_bound_fails(self):
        with pytest.raises(ValueError):
            JudgeResponse(task_id="task_1", score=0, confidence=50)

    def test_judge_response_score_above_upper_bound_fails(self):
        with pytest.raises(ValueError):
            JudgeResponse(task_id="task_1", score=11, confidence=50)

    def test_judge_response_confidence_at_lower_bound(self):
        response = JudgeResponse(task_id="task_1", score=5, confidence=0)
        assert response.confidence == 0

    def test_judge_response_confidence_at_upper_bound(self):
        response = JudgeResponse(task_id="task_1", score=5, confidence=100)
        assert response.confidence == 100

    def test_judge_response_confidence_below_lower_bound_fails(self):
        with pytest.raises(ValueError):
            JudgeResponse(task_id="task_1", score=5, confidence=-1)

    def test_judge_response_confidence_above_upper_bound_fails(self):
        with pytest.raises(ValueError):
            JudgeResponse(task_id="task_1", score=5, confidence=101)

    def test_judge_response_optional_fields_default_to_none(self):
        response = JudgeResponse(task_id="task_1", score=5, confidence=50)
        assert response.reasoning is None
        assert response.raw_response is None


class TestCalibrationBin:
    """Tests for CalibrationBin schema."""

    def test_calibration_bin_creation(self):
        bin_data = CalibrationBin(
            confidence_min=0.0,
            confidence_max=0.1,
            mean_confidence=0.05,
            accuracy=0.95,
            count=10,
        )
        assert bin_data.confidence_min == 0.0
        assert bin_data.confidence_max == 0.1
        assert bin_data.mean_confidence == 0.05
        assert bin_data.accuracy == 0.95
        assert bin_data.count == 10


class TestProbeResult:
    """Tests for ProbeResult schema."""

    def test_probe_result_with_required_fields(self):
        result = ProbeResult(
            probe_name="calibration",
            metric_name="ece",
            metric_value=0.12,
        )
        assert result.probe_name == "calibration"
        assert result.metric_name == "ece"
        assert result.metric_value == 0.12

    def test_probe_result_with_all_fields(self):
        details = {"bins": [{"confidence_min": 0.0, "count": 10}]}
        result = ProbeResult(
            probe_name="calibration",
            metric_name="ece",
            metric_value=0.12,
            details=details,
        )
        assert result.details == details
        assert result.error is None

    def test_probe_result_with_error(self):
        result = ProbeResult(
            probe_name="calibration",
            metric_name="ece",
            metric_value=0.0,
            error="Failed to compute ECE",
        )
        assert result.error == "Failed to compute ECE"

    def test_probe_result_details_defaults_to_empty_dict(self):
        result = ProbeResult(
            probe_name="calibration",
            metric_name="ece",
            metric_value=0.12,
        )
        assert result.details == {}


class TestAuditReport:
    """Tests for AuditReport schema."""

    def test_audit_report_with_required_fields(self):
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=80,
        )
        assert report.judge == "gpt-4o"
        assert report.benchmark == "mt_bench"
        assert report.tasks_evaluated == 80
        assert report.trust_grade == TrustGrade.UNKNOWN

    def test_audit_report_with_all_fields(self):
        probe = ProbeResult(
            probe_name="calibration",
            metric_name="ece",
            metric_value=0.12,
        )
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=80,
            probes=[probe],
            trust_grade=TrustGrade.B,
            recommendations=["Fix calibration"],
            total_tokens=100000,
            estimated_cost_usd=0.30,
        )
        assert len(report.probes) == 1
        assert report.trust_grade == TrustGrade.B
        assert len(report.recommendations) == 1
        assert report.total_tokens == 100000
        assert report.estimated_cost_usd == 0.30

    def test_audit_report_timestamp_defaults_to_now(self):
        before = datetime.utcnow()
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=80,
        )
        after = datetime.utcnow()
        assert before <= report.timestamp <= after

    def test_audit_report_probes_defaults_to_empty_list(self):
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=80,
        )
        assert report.probes == []

    def test_audit_report_recommendations_defaults_to_empty_list(self):
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=80,
        )
        assert report.recommendations == []

    def test_audit_report_serializes_to_json(self):
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=80,
        )
        json_str = report.model_dump_json(indent=2)
        assert isinstance(json_str, str)
        assert "gpt-4o" in json_str
        assert "mt_bench" in json_str
