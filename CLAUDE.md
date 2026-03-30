# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

JudgeCalibrator audits LLM judges for bias and miscalibration using four diagnostic probes: calibration (ECE), consistency (rephrasing), positional bias (answer-swap), and verbosity bias. It ships as a Python library, a Typer CLI, and a FastAPI + React web app.

## Commands

### Backend (FastAPI)
```bash
# Install Python package in editable mode
pip install -e .

# Run backend (from repo root)
uvicorn web.backend.main:app --reload --port 8000
```

### Frontend (React + Vite)
```bash
cd web/frontend
npm install
npm run dev        # dev server on port 3000, proxies /api → localhost:8000
npm run build      # production build
npm run lint       # TypeScript check (tsc --noEmit)
```

### Python Tests
```bash
pytest tests/unit/          # Unit tests (mocked, fast)
pytest tests/integration/   # Integration tests (real LLM calls, need API keys)
pytest tests/backend/       # Backend tests (rate limiting)
pytest --cov=judgecalib     # With coverage
pytest tests/unit/test_analyzer.py  # Single test file
```

### E2E Tests (Playwright)
```bash
npx playwright test          # Requires both servers running
npx playwright test --debug
```

### CLI
```bash
judgecalib audit --judge gpt-4o --benchmark mt_bench --output report.json
```

## Architecture

### Python Library (`judgecalib/`)
- **`core/judge_wrapper.py`** — LiteLLM wrapper; all LLM calls return `{score, confidence, reasoning}`
- **`core/prober.py`** — Orchestrates the four probes; each probe is a standalone method
- **`core/analyzer.py`** — Computes ECE, Spearman correlation, trust grades (A–F thresholds)
- **`core/rephraser.py`** — Generates semantic rephrasings for the consistency probe
- **`benchmarks/`** — HuggingFace `datasets` loaders for MT-Bench, RewardBench, AlpacaEval, Chatbot Arena
- **`schemas.py`** — Pydantic v2 models shared across the library

### Backend (`web/backend/`)
- FastAPI with SSE streaming (`/api/audit`) for live audit progress
- In-memory audit queue (`audit_queue.py`); background threads run Python library
- Rate limited to 1 live audit per IP per hour
- Key routes: `GET /api/models`, `GET /api/precomputed/{model}`, `POST /api/audit`, `GET /api/status`

### Frontend (`web/frontend/`)
- Three views managed in `App.tsx`: LandingPage, FoolTheJudge demo, AuditDashboard
- `src/components/` organized by feature (audit results, calibration charts, bias visualizations)
- Tailwind CSS v4 (uses `@import "tailwindcss"` syntax, not `@tailwind` directives)
- SSE client for streaming audit results from backend
- `vite.config.ts` proxies `/api/*` to `http://localhost:8000`

### Pre-computed Data
- `data/precomputed/` has full audit JSON results for 15 models — loads instantly without API calls
- Backend serves these via `GET /api/precomputed/{model}` for the demo dashboard

## Environment Variables
Copy `.env.example` to `.env`. Required keys depend on which judges you audit:
- `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`

## Key Design Decisions
- LiteLLM is used for all LLM calls — add new judge models by just passing a litellm-compatible model string
- The frontend has no auth; rate limiting is purely IP-based in the backend
- `asyncio_mode = "auto"` in `pyproject.toml` — all async tests work without explicit `@pytest.mark.asyncio`
- Ruff is configured with `line-length = 100`