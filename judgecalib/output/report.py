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
        "=" * 50,
        f"Judge:      {report.judge}",
        f"Benchmark:  {report.benchmark}",
        f"Tasks:      {report.tasks_evaluated}",
        f"Timestamp:  {report.timestamp.isoformat()}",
        "",
    ]

    # Add probe results
    if report.probes:
        lines.append("PROBE RESULTS")
        lines.append("-" * 50)
        for probe in report.probes:
            lines.append(f"{probe.probe_name.upper()}")
            lines.append(f"  {probe.metric_name}: {probe.metric_value:.4f}")
            if probe.error:
                lines.append(f"  error: {probe.error}")
        lines.append("")

    # Add trust grade
    lines.append("TRUST GRADE")
    lines.append("-" * 50)
    lines.append(f"Grade: {report.trust_grade.value}")

    # Add recommendations
    if report.recommendations:
        lines.append("")
        lines.append("RECOMMENDATIONS")
        lines.append("-" * 50)
        for rec in report.recommendations:
            lines.append(f"  • {rec}")

    # Add cost info if available
    if report.total_tokens > 0:
        lines.append("")
        lines.append("USAGE")
        lines.append("-" * 50)
        lines.append(f"Total tokens: {report.total_tokens:,}")
        lines.append(f"Estimated cost: ${report.estimated_cost_usd:.2f}")

    return "\n".join(lines)
