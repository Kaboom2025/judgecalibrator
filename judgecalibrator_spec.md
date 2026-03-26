# JudgeCalibrator — Project Spec

**One-liner:** An open-source auditing tool that measures whether an LLM judge is actually trustworthy — with a live web demo where anyone can run an audit against their own judge.

---

## What This Is

LLM-as-judge is used everywhere for evals. Almost nobody checks whether the judge itself is reliable. JudgeCalibrator is a Python library + hosted web app that runs four diagnostic probes against any LLM judge and produces a structured reliability report with a single trust grade (A / B+ / C / etc).

The website is the portfolio artifact. Visitors can either interact with a live demo using pre-seeded results, or (stretch goal) plug in their own API key and run a real audit on a small task sample. Either way, the findings are visual, immediate, and surprising enough to share.

---

## The Four Probes

### 1. Calibration (ECE)
Prompt the judge to output both a **score** (1–10) and a **stated confidence** (0–100%) for each task. Bin confidence values into deciles and check actual accuracy within each bin. Plot as a reliability diagram. Compute Expected Calibration Error (ECE) — the weighted mean absolute gap between stated confidence and actual accuracy.

- Well-calibrated judge: ECE < 0.05
- Moderate miscalibration: ECE 0.05–0.15
- Poor calibration: ECE > 0.15

### 2. Consistency
Take each task and generate 5 semantically equivalent rephrasings of the evaluation prompt (using a cheap model call). Run all 5 through the judge. Compute per-task score standard deviation. Average across all tasks. A reliable judge should produce SD < 0.8 on a 1–10 scale.

### 3. Bias Detection
Two sub-probes:

- **Positional bias:** For every pairwise comparison, run it as (A, B) then (B, A). Measure the fraction of flips. A fair judge should flip < 5%. GPT-4o historically flips ~30%.
- **Verbosity bias:** Take Answer A, generate a padded version adding ~50% more words without new content. Check whether the judge now scores it higher. Controlled experiment — same underlying quality, different length.

### 4. Human Alignment
Run the judge on tasks from public benchmark datasets that already have human ground-truth labels. Compute Spearman rank correlation between judge rankings and human rankings. This is the external validity anchor.

---

## Datasets (All Public, No Collection Needed)

| Dataset | Human labels | Size used | Probe |
|---|---|---|---|
| MT-Bench | Expert scores 1–10 for 80 tasks | All 80 | Calibration, human alignment |
| RewardBench | Pairwise preferences, ~3000 pairs | 500 subset | Positional bias, human alignment |
| AlpacaEval | Win rates vs reference, 805 tasks | 200 subset | Verbosity bias, human alignment |

Total: ~780 task evaluations per judge audit. At ~600 tokens per call, that's roughly 470K tokens per judge. At Sonnet pricing (~$3/MTok input), a full audit costs around **$5–8 per judge**. Running three judges for a comparison study = ~$20–25.

---

## Tech Stack

### Python Library (`judgecalib`)

```
judgecalib/
  core/
    judge_wrapper.py      # wraps any LLM via litellm, elicits score + confidence as JSON
    prober.py             # runs all four probe pipelines, returns structured results
    analyzer.py           # computes ECE, Spearman, kappa, trust grade
    rephraser.py          # generates prompt rephrasings for consistency probe
  benchmarks/
    mt_bench.py           # loads and formats MT-Bench
    reward_bench.py       # loads and formats RewardBench
    alpaca_eval.py        # loads and formats AlpacaEval
  output/
    report.py             # generates JSON report
    cli.py                # CLI entrypoint
```

**Key dependency:** `litellm` — unified interface for OpenAI, Anthropic, Gemini, any provider. Swapping judges is a config change, not a code change.

**CLI:**
```bash
pip install judgecalib

judgecalib audit \
  --judge claude-sonnet-4-5 \
  --benchmark mt_bench \
  --probes calibration consistency positional \
  --output report.json
```

### Backend (FastAPI)

Thin API server. Handles:
- `POST /audit` — accepts judge config + benchmark selection, queues an audit job, returns job ID
- `GET /audit/{job_id}` — streams live probe progress via SSE (server-sent events)
- `GET /audit/{job_id}/report` — returns completed report JSON
- `GET /precomputed` — returns the pre-run audit results for the featured models (GPT-4o, Claude Sonnet, Gemini Flash)

Deployed on **Railway** or **Fly.io** (free tier covers this traffic). No database needed initially — pre-computed results are static JSON files served from the repo. Live user audits write ephemeral results to memory with a TTL.

### Frontend (Next.js + Tailwind)

Part of the personal website. The `/projects/judgecalibrator` route has two sections:

**Section 1 — Pre-computed results explorer**

A three-column layout showing audit results for GPT-4o, Claude Sonnet, and Gemini Flash side-by-side. Each column has:
- Trust grade badge (big, A/B/C letter)
- Reliability diagram (the calibration curve — this is the visual anchor)
- Four probe score bars
- Biggest finding callout ("63% positional preference for Answer A")

These are static — always available, no API calls required. This is what loads on first visit.

**Section 2 — Live demo panel**

A form where visitors enter their own API key and select a judge + benchmark subset. Kicks off a real audit against a 50-task sample (to keep it under ~$0.50 per run). Results stream in live via SSE, showing probe progress in real time. On completion, renders the same reliability dashboard as the pre-computed view.

Rate-limited to 1 audit per IP per hour. No keys stored server-side — they're used for the single request and discarded.

---

## What the Report Looks Like

```
JudgeCalibrator Audit Report
Judge:           gpt-4o-2025-01
Benchmark:       MT-Bench + RewardBench (n=500)
Run:             2025-03-15

CALIBRATION
  ECE:                  0.14   ↑ moderate miscalibration
  Reliability curve:    [diagram]

CONSISTENCY
  Mean score SD:        1.1 / 10
  Worst-case task SD:   2.3

BIAS
  Positional flip rate: 63%   ← Answer A preferred 63% of the time
  Verbosity lift:       +0.9 score for padded answers

HUMAN ALIGNMENT
  Spearman (MT-Bench):  0.74
  Spearman (Reward):    0.71

─────────────────────────────
TRUST GRADE:   B-

RECOMMENDATION:
  Apply position-swap averaging before using as evaluator.
  Verbosity bias is significant — normalize answer length in prompts.
```

---

## The Website Demo Experience (User Flow)

1. Land on `/projects/judgecalibrator`
2. See headline: *"Is your LLM judge actually trustworthy?"*
3. Immediately see the three-model comparison dashboard with pre-computed results — no loading, no API key needed
4. See the reliability diagram. The gap between the diagonal (perfect calibration) and the actual curve is visually obvious.
5. See the positional bias callout: "GPT-4o preferred the answer listed first 63% of the time."
6. Optional: scroll down to "Run your own audit" — enter an API key, pick a model, see live streaming results

**Fallback if no one enters an API key:** The pre-computed results + the reliability diagram are enough on their own. The page is compelling without the live demo.

---

## The Reliability Diagram (Most Important Visual)

This is a standard calibration plot from the ML literature, adapted for LLM judges. X-axis is stated confidence (0–100%), Y-axis is actual accuracy within that confidence bin. A perfect judge is a diagonal line. The gap between the diagonal and the actual curve is the ECE.

Built in D3.js or Recharts on the frontend. Rendered from the JSON report data. Interactive — hovering a bin shows the exact numbers.

This visual is novel in the LLM context (it's standard in probabilistic ML but nobody applies it to LLM judges), easy to understand, and immediately interpretable. It's the screenshot that goes in the README and on the portfolio.

---

## The Concrete Finding (The Demo Anchor)

Before launch, run full audits on GPT-4o, Claude Sonnet 4.5, and Gemini Flash 2.0 using the public datasets. The positional bias number is always surprising — you're near-certain to find > 50% preference for Position A on pairwise tasks. This becomes the lede:

> "We audited three leading LLM judges used in production eval pipelines. GPT-4o showed 63% positional bias — meaning results from pairwise evals depend partly on which answer you list first, not just which is better."

That's a real, citable finding that anyone building eval pipelines immediately cares about.

---

## Build Phases

### Phase 1 — Core library (weeks 1–2)
- `judge_wrapper.py` with litellm integration, structured output (score + confidence JSON)
- MT-Bench and RewardBench data loaders
- Calibration probe + ECE computation
- Basic CLI that outputs JSON

**Checkpoint:** Can run `judgecalib audit --judge gpt-4o --benchmark mt_bench` and get a JSON report.

### Phase 2 — All four probes (weeks 3–4)
- Consistency probe + rephraser
- Positional and verbosity bias probes
- `analyzer.py` with trust grade logic
- AlpacaEval data loader
- Run full audits on three models, save results as static JSON

**Checkpoint:** Have pre-computed result JSON files for GPT-4o, Claude, Gemini.

### Phase 3 — Website (weeks 5–6)
- FastAPI backend with precomputed results endpoint + live audit endpoint (SSE streaming)
- Next.js frontend with pre-computed comparison dashboard
- Reliability diagram in D3/Recharts
- Deploy backend to Railway/Fly.io

**Checkpoint:** `/projects/judgecalibrator` shows working pre-computed dashboard.

### Phase 4 — Live demo + polish (week 7)
- Live audit form with API key input
- SSE progress streaming UI
- Rate limiting
- README with findings, reliability diagram screenshot, install instructions
- pip publish

---

## What Goes on GitHub

```
judgecalib/           Python library (pip installable)
web/
  backend/            FastAPI server
  frontend/           Next.js pages (or just the component if using a monorepo)
data/
  precomputed/        GPT-4o, Claude, Gemini audit result JSONs
  benchmarks/         Cached dataset snapshots
notebooks/
  analysis.ipynb      Exploratory analysis, finding validation
README.md             Install guide + key findings with reliability diagram
```

---

## API Cost Budget

| Item | Estimated cost |
|---|---|
| Phase 1–2 dev + debugging | ~$10 |
| Full audit × 3 judges for pre-computed results | ~$20–25 |
| Live demo runs (assuming ~50 user audits at launch) | ~$15–20 |
| Buffer | ~$10 |
| **Total** | **~$55–65** |

Within the $100 ceiling. The live demo rate limiting keeps ongoing costs near zero.

---

## Why This Stands Out

- Applies a known technique (ML calibration) to a domain where it doesn't yet exist as tooling
- Ships a real finding, not just a framework — the positional bias number is the hook
- The live website demo is interactive and immediate, unlike most portfolio projects that are just GitHub links
- pip installable, so it's actually usable by others
- The reliability diagram is a distinct, professional visual that screenshots well
