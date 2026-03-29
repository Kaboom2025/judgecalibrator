# JudgeBench — Launch TODO

## Gap Analysis vs. Vision

The resume bullet claims:
> "inter-judge agreement across 4 models on 33K human-labeled conversations; identified systematic verbosity bias inflating scores by 12–18% and published calibration methodology reducing judge error by 31%"

What's built is solid but doesn't match that claim yet. Here's what needs to happen.

---

## CRITICAL — Core Research Gaps

These are the gaps that make the resume bullet false or unsubstantiated right now.

### 1. Chatbot Arena Dataset Integration
- [ ] Replace/supplement MT-Bench (80 tasks) with the Chatbot Arena dataset (`lmsys/chatbot_arena_conversations` or `lmsys/lmsys-chat-1m`) — 33K human preference votes
- [ ] Build `judgecalib/benchmarks/chatbot_arena.py` loader
- [ ] Re-run all precomputed results using the full 33K dataset as ground truth
- [ ] Update `human_alignment` probe to use Chatbot Arena as the reference signal
- **Why**: The entire resume bullet is built on "33K human-labeled conversations." MT-Bench has 80 tasks. That's not the same claim.

### 2. Inter-Judge Agreement Matrix
- [ ] Implement `judgecalib/core/inter_judge.py` — runs the same set of tasks through multiple judges simultaneously, computes pairwise Cohen's kappa or Spearman between judge pairs
- [ ] Add `POST /api/compare` endpoint — accepts list of models, runs inter-judge comparison
- [ ] Add inter-judge matrix to the precomputed data (run GPT-4o, Claude 3.5, Llama-3, Gemma-2 on shared task set)
- [ ] Display inter-judge heatmap on the landing page
- **Why**: "inter-judge agreement across 4 models" is explicitly promised. Nothing currently computes judge-vs-judge agreement.

### 3. Self-Preference Bias Probe
- [ ] Implement `run_self_preference()` in `prober.py` — measures whether a judge disproportionately favors answers from its own model family (e.g., GPT-4o scoring GPT answers higher)
- [ ] Requires pairing answers with model provenance metadata from Chatbot Arena
- [ ] Add to trust grade logic and precomputed JSONs
- **Why**: Self-preference bias is explicitly listed in the project description alongside positional and verbosity bias.

### 4. Quantified Findings
- [ ] Run actual measurements to determine the real verbosity bias inflation % (claimed: 12–18%)
- [ ] Run actual measurements to determine calibration error reduction from methodology (claimed: 31%)
- [ ] If numbers differ from claim, update the resume bullet to match real results
- [ ] Document the actual methodology in `METHODOLOGY.md`
- **Why**: These specific numbers need to be real and defensible in an interview.

### 5. Add Llama-3-70B and Gemma-2-27B
- [ ] Run audits on `meta-llama/Llama-3-70B-Instruct` (via Together AI / Groq / Replicate through litellm)
- [ ] Run audits on `google/gemma-2-27b-it` (via Vertex AI or Hugging Face)
- [ ] Add precomputed JSONs for both
- **Why**: The resume explicitly names these 4 models. Currently missing both open-source models.

---

## HIGH PRIORITY — Visualizations

These are what make this a "scientific experiment" rather than just a metrics table.

### 6. Calibration Curves
- [ ] Add `GET /api/calibration-curve/{model}` endpoint that returns binned (confidence, accuracy) pairs
- [ ] Build `CalibrationCurve.tsx` component — Recharts line chart plotting perfect calibration (diagonal) vs. actual calibration per model
- [ ] Add to LandingPage alongside the metrics table
- **Why**: Calibration curves are the canonical visualization for this kind of work. The spec mentions "reliability diagram." Without charts, this is just a table.

### 7. Bias Heatmaps
- [ ] Build `InterJudgeHeatmap.tsx` — Recharts heatmap showing pairwise agreement scores between all models
- [ ] Build `BiasHeatmap.tsx` — shows verbosity/positional bias scores across all models as a color grid
- [ ] Add to LandingPage as visual centerpiece
- **Why**: "bias heatmaps" is the exact phrase in the resume bullet. Twitter engagement requires visual assets.

### 8. Chart Export for Twitter
- [ ] Add "Download PNG" button on each chart (html2canvas or SVG export)
- [ ] Pre-render high-resolution versions of the key charts (calibration curves, heatmaps)
- **Why**: "Post calibration curve charts and bias heatmaps as native images" is the Twitter strategy. Need exportable assets.

---

## HIGH PRIORITY — Deployment

The project isn't live anywhere. A recruiter can't click a link.

### 9. Deploy the App
- [ ] Deploy frontend to Vercel (connect GitHub repo, `web/frontend/` as root)
- [ ] Deploy backend to Railway, Render, or Fly.io (FastAPI + Python)
- [ ] Set environment variables (OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY) in deploy platform
- [ ] Test all endpoints in production
- [ ] Add the live URL to the README and resume
- **Why**: Without a live URL, this is a portfolio item with no click-through. "I built this" is weaker than "try it at judgecalib.com."

### 10. Custom Domain (optional but impactful)
- [ ] Buy `judgecalib.com` or `judgecalibrator.io` (~$10/yr)
- [ ] Connect to Vercel
- **Why**: A real domain is the difference between a side project and a published tool.

---

## HIGH PRIORITY — PyPI Publication

The README says `pip install judgecalib` but the package isn't published.

### 11. Publish to PyPI
- [ ] Ensure `pyproject.toml` is complete (name, version, description, author, license, classifiers)
- [ ] Build: `python -m build`
- [ ] Test on TestPyPI first: `twine upload --repository testpypi dist/*`
- [ ] Publish: `twine upload dist/*`
- [ ] Verify: `pip install judgecalib` works from a fresh environment
- [ ] Add PyPI badge to README
- **Why**: "open-source LLM-as-judge calibration framework" implies it's actually installable. The README already shows the command.

---

## MEDIUM PRIORITY — GitHub Presence

### 12. Methodology Paper / Write-Up
- [ ] Write `METHODOLOGY.md` — 1,000-word technical write-up explaining the 5 probes, formulas, dataset choices, and findings
- [ ] Include calibration curve formula (ECE), positional bias formula, verbosity bias measurement
- [ ] Cite MT-Bench, RewardBench, Chatbot Arena papers
- **Why**: Makes this look like a research contribution, not just a tool. Required to "publish calibration methodology."

### 13. GitHub Repo Polish
- [ ] Ensure `README.md` has: badges (PyPI version, license, test coverage), architecture diagram, example output screenshot, live demo link
- [ ] Add `CONTRIBUTING.md`
- [ ] Add GitHub issue templates
- [ ] Write `docs/findings.md` — the specific bias findings (verbosity %, etc.)
- [ ] Add demo GIF/screenshot to README
- **Why**: Recruiters look at GitHub repos. A polished repo signals professionalism.

### 14. GitHub Actions CI/CD
- [ ] Set up `.github/workflows/test.yml` — run pytest on push/PR
- [ ] Set up `.github/workflows/deploy.yml` — auto-deploy to Vercel/Railway on main push
- [ ] Add test coverage badge
- **Why**: CI/CD demonstrates software engineering maturity.

---

## MEDIUM PRIORITY — App Polish

### 15. Fix the Landing Page to Lead with Visualizations
- [ ] Current landing page shows a metrics table. Refactor to lead with:
  1. Hero: "We tested X LLMs against 33K human votes. Here's what we found."
  2. Inter-judge agreement heatmap (most visually striking)
  3. Calibration curves per model
  4. Bias comparison bar chart
  5. Detailed metrics table below the fold
- **Why**: The current UI buries the insight. Visualizations should be the first thing a visitor sees.

### 16. "Key Findings" Section
- [ ] Add a static findings panel: "GPT-4o shows 14% verbosity bias. Claude 3.5 has 18% lower positional sensitivity than GPT-4o."
- [ ] These should be computed from the actual precomputed data, not hardcoded
- **Why**: Visitors and recruiters want the TL;DR insight, not raw numbers.

### 17. Model Comparison Page
- [ ] Add `/compare` route — side-by-side probe-by-probe comparison of any two selected models
- [ ] Show where judges agree/disagree on the same tasks
- **Why**: Enables "GPT-4o vs Claude 3.5" comparison content for social posts.

---

## LOW PRIORITY — Nice to Have

### 18. Chatbot Arena Live Integration (stretch)
- [ ] Add option to pull live Chatbot Arena battles as tasks (the dataset updates regularly)
- [ ] Leaderboard tracking over time

### 19. API Docs
- [ ] FastAPI auto-generates `/docs` (Swagger UI) — verify it's accessible and accurate
- [ ] Add `GET /api/models` endpoint listing all available models with litellm IDs

### 20. Mobile Responsiveness Audit
- [ ] Test all three pages on mobile
- [ ] Fix any layout issues in the metrics table (it likely overflows on small screens)

---

## Launch Checklist

Before posting anywhere:

- [ ] Live URL works (Vercel + Railway deployed)
- [ ] `pip install judgecalib` works
- [ ] 4 target models in precomputed data (GPT-4o, Claude 3.5, Llama-3-70B, Gemma-2-27B)
- [ ] Chatbot Arena data (or at minimum, 1000+ tasks, not 80)
- [ ] Inter-judge heatmap visible on homepage
- [ ] Calibration curves visible on homepage
- [ ] Verbosity/positional bias numbers are real and match resume claims
- [ ] `METHODOLOGY.md` written
- [ ] README has live URL, PyPI badge, screenshot
- [ ] GitHub Actions CI passing

---

## Prioritized Order of Attack

1. **Chatbot Arena dataset** — fixes the ground truth problem (everything else builds on this)
2. **Re-run precomputed data** with more tasks to get real numbers
3. **Inter-judge comparison** — the missing core feature
4. **Calibration curve + heatmap visualizations** — transforms data into shareable assets
5. **Deploy** — makes it real
6. **PyPI publish** — completes the "open-source framework" claim
7. **GitHub polish + METHODOLOGY.md** — makes the repo recruiter-ready
8. **Self-preference bias** — adds the third bias type mentioned in the spec
