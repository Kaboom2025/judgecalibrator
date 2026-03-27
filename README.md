# JudgeCalibrator

**Is your LLM judge actually trustworthy?**

An open-source auditing tool that measures whether an LLM judge is reliable — with a live web demo where anyone can run diagnostics or interact with bias demos directly in the browser.

LLM-as-judge is used everywhere for automated evals. Almost nobody checks whether the judge itself is biased or miscalibrated. JudgeCalibrator runs four diagnostic probes against any LLM judge and produces a structured reliability report with a trust grade (A / B+ / C / etc).

---

## The Four Probes

| Probe | What it measures | Threshold |
|---|---|---|
| **Calibration (ECE)** | Does stated confidence match actual accuracy? | ECE < 0.05 = good |
| **Consistency** | Do semantically equivalent prompts get the same score? | SD < 0.8 / 10 = good |
| **Positional Bias** | Does answer order affect the verdict? | < 5% flip rate = fair |
| **Verbosity Bias** | Does longer = better, regardless of quality? | — |

> GPT-4o historically flips its verdict ~30% of the time when answer order is swapped. This is the kind of finding JudgeCalibrator surfaces automatically.

---

## Live Demo — Fool the Judge

The web app includes an interactive demo where you can personally trigger LLM judge biases:

- **Swap A ↔ B** — reorder answers and watch the verdict flip (positional bias)
- **Make Verbose** — pad an answer with filler and watch the judge prefer it (verbosity bias)
- **Edit Manually** — rewrite an answer to see how easy it is to game the judge

Built on real pairwise questions from the [MT-Bench human judgments dataset](https://huggingface.co/datasets/lmsys/mt_bench_human_judgments).

---

## Project Structure

```
judgecalib/           Python library (pip installable)
  core/
    judge_wrapper.py  LLM wrapper via litellm (score + confidence JSON)
    prober.py         Runs all four probe pipelines
    analyzer.py       ECE, Spearman, trust grade logic
    rephraser.py      Generates prompt rephrasings for consistency probe
  benchmarks/
    mt_bench.py       MT-Bench data loader
    reward_bench.py   RewardBench data loader
    alpaca_eval.py    AlpacaEval data loader
web/
  backend/            FastAPI server (SSE streaming, audit queue, rate limiting)
  frontend/           Vite + React 19 + Tailwind v4 frontend
data/
  precomputed/        Pre-run audit result JSONs for 11 models
```

---

## Python Library

### Install

```bash
pip install judgecalib
```

### Run an audit

```bash
judgecalib audit \
  --judge claude-sonnet-4-5 \
  --benchmark mt_bench \
  --probes calibration consistency positional \
  --output report.json
```

### Python API

```python
from judgecalib import JudgeCalibrator

calib = JudgeCalibrator(judge="gpt-4o", benchmark="mt_bench")
report = calib.run(probes=["calibration", "positional", "verbosity"])
print(report.trust_grade)   # e.g. "B-"
print(report.positional_flip_rate)  # e.g. 0.63
```

---

## Web App

### Prerequisites

- Python 3.11+
- Node.js 18+
- API keys for the models you want to audit (set in `.env`)

### Setup

```bash
# Clone
git clone https://github.com/your-username/judgecalibrator
cd judgecalibrator

# Backend
pip install -e .
cp .env.example web/backend/.env
# Fill in API keys in web/backend/.env

# Start backend
uvicorn web.backend.main:app --reload --port 8000

# Frontend (separate terminal)
cd web/frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Pre-computed Results

`data/precomputed/` contains full audit results for 11 models including:

- `gpt-4o-mini`, `o1`, `o1-mini`, `o3-mini`
- `claude-3-5-sonnet-20241022`, `claude-haiku-4-5`, `claude-opus-4-5`
- `gemini-2.0-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`
- `gpt-4-turbo`

These load instantly on the dashboard without any API calls.

---

## API Cost Reference

| Item | Estimated cost |
|---|---|
| Full audit × 1 judge (780 tasks) | ~$5–8 |
| Comparison study × 3 judges | ~$20–25 |

At ~600 tokens/call × 780 tasks ≈ 470K tokens per judge. Rate limited to 1 live audit per IP per hour.

---

## Tech Stack

- **Library**: Python, litellm, datasets (HuggingFace)
- **Backend**: FastAPI, SSE streaming, in-memory audit queue
- **Frontend**: React 19, Vite, Tailwind CSS v4, Framer Motion v12
- **Datasets**: MT-Bench, RewardBench, AlpacaEval (all public)

---

## License

MIT
