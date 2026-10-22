# Solver reliability check — October 15, 2026

The reported rational-table problem now accepts complete plain text, Markdown,
paired columns, coordinate pairs, and numeric LaTeX table layouts. Printed values
are never inferred from the model's candidate expressions. Missing, conflicting,
malformed or inconsistent data still fails safely, with one correction against
the original image and a readable message if that correction fails.

The default method for a fresh solve is now three rows:

```text
g(x)=(a x^2+b x+10)/(x+2)
[g(1),g(4)] ~ [5,7]
g(3)
```

Real Desmos fits `a=1`, `b=4` and evaluates `g(3)=6.2` (`31/5`). Existing correct
cached solutions remain usable; unrelated cached problems are not invalidated.

Calculator startup and preflight share one eager, retryable script loader.
Preflight can connect independently of the visible graph. A later successful
connection opens the graph and resumes the current generated solution, keeping
its explanation instead of issuing a second solve. A theme change preserves
student expressions and viewport bounds. First streamed results no longer wait
for the initial telemetry flush (previously bounded at two seconds).

`checks.json` records five browser scenarios using the real solver components
and native Desmos: cold load and client navigation back, one failed script
request, preflight reconnect after two failures, manual reconnect while retaining
the generated solution, and phone layout. All returned 6.2 with one intercepted
solve and zero additional explanation requests or browser errors. These checks
made **zero paid model calls**; model responses were fixtures, not a live model
latency benchmark. Startup measurements are development-harness timings, not
production guarantees. `initialState` distinguishes a ready graph from the
intentional network-failure state in recovery tests.

Run unit checks with `npm test`. To reproduce browser checks:

Validation for this change: all 439 tests, ESLint, TypeScript, production build,
and the client-secret audit pass. The temporary browser-check route is absent
from the production route list.

1. Run `npx tsx scripts/solver-reliability-fixture.ts`.
2. Temporarily copy `scripts/fixtures/auto-solve-recording/page.tsx.fixture` to
   `src/app/dev-solver-check/page.tsx`, and its neighboring
   `recording.module.css` to the same directory. This mounts actual components
   for development only; the browser intercepts solve endpoints.
3. Start localhost:3000. Run `node scripts/check-solver-reliability.cjs` with
   `PLAYWRIGHT_MODULE` pointing to Playwright if installed outside the app, and
   `BROWSER_PATH` if Edge is unavailable. Evidence is written under `/tmp`.
4. Remove `src/app/dev-solver-check/` before building. No fixture route ships.

Desmos-first ranking, model effort and safety checks remain enforced.
Authentication, production infrastructure and deployment settings are unchanged.
