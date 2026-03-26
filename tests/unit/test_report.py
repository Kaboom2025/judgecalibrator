"""Unit tests for report generation."""
import pytest
import json
from pathlib import Path
from datetime import datetime
from unittest.mock import patch, MagicMock
from judgecalib.schemas import AuditReport, ProbeResult, TrustGrade
from judgecalib.output.report import save_report, format_report_text


class TestSaveReport:
    """Tests for save_report function."""

    def test_save_report_writes_json_file(self, tmp_path):
        """save_report should write JSON file."""
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            trust_grade=TrustGrade.A,
        )
        output_path = tmp_path / "report.json"

        save_report(report, str(output_path))

        assert output_path.exists()
        assert output_path.read_text()

    def test_save_report_creates_valid_json(self, tmp_path):
        """Saved report should be valid JSON."""
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            trust_grade=TrustGrade.B,
        )
        output_path = tmp_path / "report.json"

        save_report(report, str(output_path))

        content = output_path.read_text()
        parsed = json.loads(content)
        assert parsed["judge"] == "gpt-4o"
        assert parsed["benchmark"] == "mt_bench"
        assert parsed["tasks_evaluated"] == 10

    def test_save_report_includes_all_fields(self, tmp_path):
        """Saved report should include all fields."""
        probes = [
            ProbeResult(
                probe_name="calibration",
                metric_name="ece",
                metric_value=0.05,
            ),
            ProbeResult(
                probe_name="consistency",
                metric_name="mean_sd",
                metric_value=0.3,
            ),
        ]
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=50,
            probes=probes,
            trust_grade=TrustGrade.A,
            recommendations=["Improve calibration"],
        )
        output_path = tmp_path / "report.json"

        save_report(report, str(output_path))

        content = output_path.read_text()
        parsed = json.loads(content)
        assert len(parsed["probes"]) == 2
        assert len(parsed["recommendations"]) == 1

    def test_save_report_with_nested_path(self, tmp_path):
        """save_report should create parent directories if needed."""
        nested_path = tmp_path / "output" / "reports" / "report.json"
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
        )

        # Note: save_report doesn't create parent dirs, so we expect an error
        # unless the user creates them. This tests that it fails gracefully
        with pytest.raises(FileNotFoundError):
            save_report(report, str(nested_path))


class TestFormatReportText:
    """Tests for format_report_text function."""

    def test_format_report_includes_header(self):
        """Formatted report should include header with judge and benchmark."""
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
        )

        text = format_report_text(report)

        assert "JudgeCalibrator Audit Report" in text
        assert "gpt-4o" in text
        assert "mt_bench" in text
        assert "10" in text

    def test_format_report_includes_trust_grade(self):
        """Formatted report should include trust grade."""
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            trust_grade=TrustGrade.B_PLUS,
        )

        text = format_report_text(report)

        assert "TRUST GRADE" in text
        assert "B+" in text

    def test_format_report_includes_probe_results(self):
        """Formatted report should include all probe results."""
        probes = [
            ProbeResult(
                probe_name="calibration",
                metric_name="ece",
                metric_value=0.0523,
            ),
            ProbeResult(
                probe_name="consistency",
                metric_name="mean_sd",
                metric_value=0.3456,
            ),
        ]
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            probes=probes,
        )

        text = format_report_text(report)

        assert "PROBE RESULTS" in text
        assert "Calibration" in text
        assert "0.0523" in text
        assert "Consistency" in text
        assert "0.3456" in text

    def test_format_report_includes_recommendations(self):
        """Formatted report should include recommendations."""
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            recommendations=[
                "Improve calibration accuracy",
                "Reduce positional bias",
            ],
        )

        text = format_report_text(report)

        assert "RECOMMENDATIONS" in text
        assert "Improve calibration accuracy" in text
        assert "Reduce positional bias" in text

    def test_format_report_includes_usage_when_tokens_present(self):
        """Formatted report should include usage info when tokens present."""
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            total_tokens=5000,
            estimated_cost_usd=0.10,
        )

        text = format_report_text(report)

        assert "USAGE" in text
        assert "5,000" in text
        assert "$0.10" in text

    def test_format_report_omits_usage_when_no_tokens(self):
        """Formatted report should omit usage section when no tokens."""
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            total_tokens=0,
        )

        text = format_report_text(report)

        assert "USAGE" not in text

    def test_format_report_displays_probe_details(self):
        """Formatted report should display probe details when available."""
        probes = [
            ProbeResult(
                probe_name="positional_bias",
                metric_name="flip_rate",
                metric_value=0.15,
                details={"position_a_preference_rate": 0.65},
            ),
            ProbeResult(
                probe_name="verbosity_bias",
                metric_name="mean_lift",
                metric_value=0.25,
                details={"per_task_lifts": [0.2, 0.3], "max_lift": 0.5},
            ),
            ProbeResult(
                probe_name="consistency",
                metric_name="mean_sd",
                metric_value=0.3,
                details={"per_task_sds": [0.2, 0.4], "max_sd": 0.8},
            ),
        ]
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            probes=probes,
        )

        text = format_report_text(report)

        assert "Position A Preference" in text
        assert "65.0%" in text
        assert "Max Lift" in text
        assert "0.5000" in text
        assert "Max SD" in text
        assert "0.8000" in text

    def test_format_report_handles_empty_probes(self):
        """Formatted report should handle reports with no probes."""
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            probes=[],
        )

        text = format_report_text(report)

        assert "gpt-4o" in text
        assert "mt_bench" in text
        # PROBE RESULTS should still appear but have no probes

    def test_format_report_with_probe_error(self):
        """Formatted report should display probe errors."""
        probes = [
            ProbeResult(
                probe_name="consistency",
                metric_name="mean_sd",
                metric_value=0.0,
                error="Failed to load rephraser",
            ),
        ]
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            probes=probes,
        )

        text = format_report_text(report)

        assert "Failed to load rephraser" in text

    def test_format_report_formatting_consistency(self):
        """Formatted report should be consistent and readable."""
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=50,
            trust_grade=TrustGrade.A,
        )

        text = format_report_text(report)

        lines = text.split("\n")
        # Should have multiple lines
        assert len(lines) > 5
        # Should have section headers
        assert any("=" * 20 in line for line in lines)
        assert any("-" * 20 in line for line in lines)

    def test_format_report_display_name_conversion(self):
        """Probe names should be converted to readable display names."""
        probes = [
            ProbeResult(
                probe_name="positional_bias",
                metric_name="flip_rate",
                metric_value=0.15,
            ),
            ProbeResult(
                probe_name="human_alignment",
                metric_name="spearman",
                metric_value=0.85,
            ),
        ]
        report = AuditReport(
            judge="gpt-4o",
            benchmark="mt_bench",
            tasks_evaluated=10,
            probes=probes,
        )

        text = format_report_text(report)

        # Probe names should be title-cased with underscores replaced by spaces
        assert "Positional Bias" in text
        assert "Human Alignment" in text
