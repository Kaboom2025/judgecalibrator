"""Report generation and output."""
from pathlib import Path
from judgecalib.schemas import AuditReport


def save_report(report: AuditReport, path: str) -> None:
    """
    Save audit report to JSON file.

    Args:
        report: AuditReport to save
        path: File path for the JSON output
    """
    Path(path).write_text(report.model_dump_json(indent=2))


def format_report_text(report: AuditReport) -> str:
    """
    Format audit report as human-readable text.

    Args:
        report: AuditReport to format

    Returns:
        Formatted text report
    """
    lines = [
        "JudgeCalibrator Audit Report",
        "=" * 60,
        f"Judge:      {report.judge}",
        f"Benchmark:  {report.benchmark}",
        f"Tasks:      {report.tasks_evaluated}",
        f"Timestamp:  {report.timestamp.isoformat()}",
        "",
    ]

    # Add probe results
    if report.probes:
        lines.append("PROBE RESULTS")
        lines.append("-" * 60)
        for probe in report.probes:
            # Format probe name nicely
            probe_display_name = probe.probe_name.replace("_", " ").title()
            lines.append(f"{probe_display_name}")
            lines.append(f"  Metric:  {probe.metric_name} = {probe.metric_value:.4f}")

            # Add details if available
            if probe.details:
                details = probe.details
                # Show key metrics from details
                if "per_task_sds" in details:
                    max_sd = details.get("max_sd", 0.0)
                    lines.append(f"  Max SD:  {max_sd:.4f}")
                if "per_task_lifts" in details:
                    max_lift = details.get("max_lift", 0.0)
                    lines.append(f"  Max Lift: {max_lift:.4f}")
                if "position_a_preference_rate" in details:
                    pref_rate = details.get("position_a_preference_rate", 0.0)
                    lines.append(f"  Position A Preference: {pref_rate:.1%}")
                if "bins" in details:
                    lines.append(f"  Calibration Bins: {len(details.get('bins', []))} bins")

            if probe.error:
                lines.append(f"  Error: {probe.error}")
        lines.append("")

    # Add trust grade
    lines.append("TRUST GRADE")
    lines.append("-" * 60)
    # Handle both TrustGrade enum and string values
    grade_value = (
        report.trust_grade.value
        if hasattr(report.trust_grade, "value")
        else str(report.trust_grade)
    )
    lines.append(f"Grade: {grade_value}")

    # Add recommendations
    if report.recommendations:
        lines.append("")
        lines.append("RECOMMENDATIONS")
        lines.append("-" * 60)
        for rec in report.recommendations:
            lines.append(f"  • {rec}")

    # Add cost info if available
    if report.total_tokens > 0:
        lines.append("")
        lines.append("USAGE")
        lines.append("-" * 60)
        lines.append(f"Total tokens: {report.total_tokens:,}")
        lines.append(f"Estimated cost: ${report.estimated_cost_usd:.2f}")

    return "\n".join(lines)
