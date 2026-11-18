# Student-effort-first experiment (V1)

This branch is **experimental and not deployed**. It starts from the current GitHub main branch (the pre-simplicity-review architecture); it does not add a mandatory reviewer or change the production model.

## What changed

- Candidate instructions now search for truly different Desmos workflows **and** simpler representations of the same technique, with a provenance check for student-entered values.
- Duplicate technique IDs are allowed *as candidate proposals*, so the existing selector can retain only the cheapest valid representation.
- The existing deterministic scorer now adds a **small, capped setup penalty** for student-chosen scalar inputs and unusually long expressions. It does not reject otherwise valid methods or change answer verification.
- No UI, authentication, external service settings, model routing, or default deployment behavior were intentionally changed.

## Local execution

On your own Mac, open the **correct SolvePlot repository**, save or commit any uncommitted work, then fetch the branch. Do not discard your current worktree:

```bash
git fetch origin experiment/student-effort-first-v1-20261118
git worktree add ../solveplot-student-effort -b local-student-effort origin/experiment/student-effort-first-v1-20261118
cd ../solveplot-student-effort
npm ci
npm test
npm run typecheck
npm run lint
npm run build
npm run dev
```

Open http://localhost:3000 (or the next available port reported by Next.js).
Your usual environment variables are needed for real authenticated/local solver requests; **do not copy secrets into GitHub**.
The experiment must be tested against unseen questions before merging or deploying.

## Benchmark gates

Compare old versus experimental on the **same 30–50 unseen SAT questions** with controlled model, temperature, service tier, cache and budget:
1. Correct answers, with real Desmos readout/graph checks and necessary mathematical proof.
2. Student reasoning and provenance (given/choice/engine-read/chosen/derived/unexplained).
3. Typing and construction effort, interaction steps and unnecessary formulas.
4. Median/p95 full solve time, number of model calls and cost.
5. Blinded human preference judgment of actual student workflows.

This V1 uses a conservative **heuristic**, not a full validated provenance engine. It can miss invented numbers within nontrivial expressions and can count a justified choice as work. Do not claim quality improvements without measurements.
