"""Command-line interface for judgecalibrator."""
from typing import Optional
import typer
from rich.console import Console
from judgecalib.core.judge_wrapper import JudgeWrapper
from judgecalib.core.prober import Prober
from judgecalib.core.analyzer import compute_trust_grade
from judgecalib.schemas import AuditReport
from judgecalib.output.report import save_report, format_report_text

app = typer.Typer()
console = Console()


@app.command()
def audit(
    judge: str = typer.Option(..., "--judge", help="Model name (e.g. gpt-4o)"),
    benchmark: str = typer.Option(..., "--benchmark", help="mt_bench or reward_bench"),
    probes: str = typer.Option("calibration", "--probes", help="Comma-separated probes"),
    output: str = typer.Option("report.json", "--output", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", envvar="JUDGE_API_KEY"),
    task_count: Optional[int] = typer.Option(None, "--task-count", help="Limit number of tasks"),
) -> None:
    """
    Run an audit on a judge model.

    Example:
        judgecalib audit --judge gpt-4o --benchmark mt_bench --output report.json
    """
    try:
        # Import here to avoid circular imports
        from judgecalib.benchmarks import mt_bench, reward_bench

        # Load benchmark
        console.print(f"[cyan]Loading {benchmark} benchmark...[/cyan]")
        if benchmark == "mt_bench":
            tasks = mt_bench.load_mt_bench()
        elif benchmark == "reward_bench":
            tasks = reward_bench.load_reward_bench()
        else:
            console.print(f"[red]Unknown benchmark: {benchmark}[/red]")
            raise typer.Exit(1)

        if not tasks:
            console.print(f"[red]No tasks loaded from {benchmark}[/red]")
            raise typer.Exit(1)

        # Limit task count if specified
        if task_count:
            tasks = tasks[:task_count]

        console.print(f"[green]Loaded {len(tasks)} tasks[/green]")

        # Create judge wrapper
        judge_wrapper = JudgeWrapper(model_name=judge, api_key=api_key)
        prober = Prober(judge=judge_wrapper, tasks=tasks)

        # Parse probe list
        probe_list = [p.strip() for p in probes.split(",")]
        probe_results = []

        # Run requested probes
        if "calibration" in probe_list:
            console.print("[cyan]Running calibration probe...[/cyan]")
            result = prober.run_calibration()
            probe_results.append(result)
            console.print(f"[green]✓ Calibration probe complete (ECE={result.metric_value:.4f})[/green]")

        # Compute trust grade from available probe results
        ece = next(
            (r.metric_value for r in probe_results if r.probe_name == "calibration"),
            0.0,
        )
        grade, recommendations = compute_trust_grade(ece=ece)

        # Create report
        report = AuditReport(
            judge=judge,
            benchmark=benchmark,
            tasks_evaluated=len(tasks),
            probes=probe_results,
            trust_grade=grade,
            recommendations=recommendations,
        )

        # Save report
        save_report(report, output)
        console.print(f"[green]✓ Report saved to {output}[/green]")

        # Display summary
        console.print("")
        console.print(format_report_text(report))

    except Exception as e:
        console.print(f"[red]Error: {str(e)}[/red]")
        raise typer.Exit(1)


if __name__ == "__main__":
    app()
