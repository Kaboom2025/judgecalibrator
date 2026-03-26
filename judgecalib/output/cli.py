"""Command-line interface for judgecalibrator."""
from typing import Optional
import typer
from rich.console import Console
from judgecalib.core.judge_wrapper import JudgeWrapper
from judgecalib.core.prober import Prober
from judgecalib.core.rephraser import Rephraser
from judgecalib.schemas import AuditReport
from judgecalib.output.report import save_report, format_report_text

app = typer.Typer()
console = Console()


@app.command()
def audit(
    judge: str = typer.Option(..., "--judge", help="Model name (e.g. gpt-4o)"),
    benchmark: str = typer.Option(..., "--benchmark", help="mt_bench, reward_bench, or alpaca_eval"),
    probes: str = typer.Option("all", "--probes", help="Comma-separated probes or 'all'"),
    output: str = typer.Option("report.json", "--output", help="Output file path"),
    api_key: Optional[str] = typer.Option(None, "--api-key", envvar="JUDGE_API_KEY"),
    task_count: Optional[int] = typer.Option(None, "--task-count", help="Limit number of tasks"),
    n_rephrasings: int = typer.Option(5, "--rephrasings", help="Number of rephrasings for consistency probe"),
) -> None:
    """
    Run a comprehensive audit on a judge model.

    Example:
        judgecalib audit --judge gpt-4o --benchmark mt_bench --output report.json
        judgecalib audit --judge gpt-4o --benchmark reward_bench --probes calibration,consistency
    """
    try:
        # Import here to avoid circular imports
        from judgecalib.benchmarks import mt_bench, reward_bench, alpaca_eval

        # Load benchmark
        console.print(f"[cyan]Loading {benchmark} benchmark...[/cyan]")
        if benchmark == "mt_bench":
            tasks = mt_bench.load_mt_bench()
        elif benchmark == "reward_bench":
            tasks = reward_bench.load_reward_bench()
        elif benchmark == "alpaca_eval":
            tasks = alpaca_eval.load_alpaca_eval()
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

        # Define progress callback
        def progress_callback(current: int, total: int) -> None:
            percent = (current / total * 100) if total > 0 else 0
            console.print(f"[cyan]Progress: {current}/{total} ({percent:.1f}%)[/cyan]", end="\r")

        prober = Prober(judge=judge_wrapper, tasks=tasks, progress_callback=progress_callback)

        # Parse probe list
        probe_list = [p.strip() for p in probes.split(",")]

        # Run all probes or specific ones
        if "all" in probe_list or len(probe_list) >= 4:
            console.print("[cyan]Running comprehensive audit (all probes)...[/cyan]")
            rephraser = Rephraser()
            report = prober.run_all(rephraser=rephraser, n_rephrasings=n_rephrasings)
            console.print("[green]✓ All probes complete[/green]")
        else:
            # Run specific probes
            probe_results = []

            if "calibration" in probe_list:
                console.print("[cyan]Running calibration probe...[/cyan]")
                result = prober.run_calibration()
                probe_results.append(result)
                console.print(f"[green]✓ Calibration probe complete (ECE={result.metric_value:.4f})[/green]")

            if "consistency" in probe_list:
                console.print("[cyan]Running consistency probe...[/cyan]")
                rephraser = Rephraser()
                result = prober.run_consistency(rephraser, n_rephrasings=n_rephrasings)
                probe_results.append(result)
                console.print(f"[green]✓ Consistency probe complete (mean_sd={result.metric_value:.4f})[/green]")

            if "positional_bias" in probe_list:
                console.print("[cyan]Running positional bias probe...[/cyan]")
                result = prober.run_positional_bias()
                probe_results.append(result)
                console.print(f"[green]✓ Positional bias probe complete (flip_rate={result.metric_value:.4f})[/green]")

            if "verbosity_bias" in probe_list:
                console.print("[cyan]Running verbosity bias probe...[/cyan]")
                result = prober.run_verbosity_bias()
                probe_results.append(result)
                console.print(f"[green]✓ Verbosity bias probe complete (mean_lift={result.metric_value:.4f})[/green]")

            if "human_alignment" in probe_list:
                console.print("[cyan]Running human alignment probe...[/cyan]")
                result = prober.run_human_alignment()
                probe_results.append(result)
                console.print(f"[green]✓ Human alignment probe complete (spearman={result.metric_value:.4f})[/green]")

            # Create report with just the probes that ran
            report = AuditReport(
                judge=judge,
                benchmark=benchmark,
                tasks_evaluated=len(tasks),
                probes=probe_results,
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
